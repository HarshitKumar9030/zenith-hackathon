"""Three-class household segmentation; capture-group-held-out evaluation."""
import argparse,hashlib,json,random,time
import torchvision
from pathlib import Path
import numpy as np
import torch
from torch import nn
from torch.utils.data import Dataset,DataLoader
from torchvision.models.segmentation import deeplabv3_mobilenet_v3_large,DeepLabV3_MobileNet_V3_Large_Weights
from torchvision.transforms import functional as F
from PIL import Image
CLASSES=['background','organic','non_organic']
def save_json(value,path):
    tmp=path.with_suffix('.json.tmp');tmp.write_text(json.dumps(value,indent=2));tmp.replace(path)
def checkpoint(value,path):
    tmp=path.with_suffix('.pt.tmp');torch.save(value,tmp);tmp.replace(path)
def build_model(pretrained):
    m=deeplabv3_mobilenet_v3_large(weights=DeepLabV3_MobileNet_V3_Large_Weights.DEFAULT if pretrained else None,weights_backbone=None,aux_loss=True)
    m.classifier[4]=nn.Conv2d(256,3,1);m.aux_classifier[4]=nn.Conv2d(m.aux_classifier[4].in_channels,3,1)
    return m
class Waste(Dataset):
    def __init__(self,root,split,augment=False,size=512):
        self.root=root;self.rows=json.loads((root/f'{split}.json').read_text());self.augment=augment;self.size=size
    def __len__(self):return len(self.rows)
    def __getitem__(self,i):
        r=self.rows[i]
        with Image.open(self.root/r['image']) as p:im=p.convert('RGB').resize((self.size,self.size),Image.Resampling.BILINEAR)
        with Image.open(self.root/r['mask']) as p:mask=p.resize((self.size,self.size),Image.Resampling.NEAREST)
        if self.augment:
            if random.random()<.5:im=F.hflip(im);mask=F.hflip(mask)
            im=F.adjust_brightness(im,random.uniform(.75,1.25));im=F.adjust_contrast(im,random.uniform(.8,1.2))
        x=F.normalize(F.pil_to_tensor(im).float()/255,[.485,.456,.406],[.229,.224,.225])
        return x,torch.from_numpy(np.array(mask,dtype=np.int64))
def audit(root):
    rows={s:json.loads((root/f'{s}.json').read_text()) for s in ['train','val','test']}
    for field in ['id','date','capture_group','pixel_sha256','sha256']:
        sets={s:{r[field] for r in rr} for s,rr in rows.items()}
        for a,b in [('train','val'),('train','test'),('val','test')]:assert not sets[a]&sets[b],f'{field} leakage'
    allrows=[r for rr in rows.values() for r in rr]
    for i,r in enumerate(allrows):
        for key,hkey in [('image','sha256'),('mask','mask_sha256')]:assert hashlib.sha256((root/r[key]).read_bytes()).hexdigest()==r[hkey]
        with Image.open(root/r['mask']) as p:
            a=np.array(p);assert set(np.unique(a))<={0,1,2};assert np.bincount(a.ravel(),minlength=3).tolist()==r['pixel_counts']
        for q in allrows[:i]:
            if r['capture_group']!=q['capture_group']:assert (int(r['dhash'],16)^int(q['dhash'],16)).bit_count()>4
    return rows
@torch.inference_mode()
def evaluate(model,loader,device):
    model.eval();cm=torch.zeros((3,3),dtype=torch.int64,device=device);elapsed=0;count=0
    for x,y in loader:
        x=x.to(device);y=y.to(device)
        if device.type=='cuda':torch.cuda.synchronize()
        start=time.perf_counter();pred=model(x)['out'].argmax(1)
        if device.type=='cuda':torch.cuda.synchronize()
        elapsed+=time.perf_counter()-start;count+=len(x);cm+=torch.bincount((y*3+pred).flatten(),minlength=9).reshape(3,3)
    a=cm.cpu().double();intersection=a.diag();union=a.sum(0)+a.sum(1)-intersection;iou=intersection/union.clamp_min(1)
    return dict(confusion_matrix=cm.cpu().tolist(),iou_per_class={c:float(v) if union[i]>0 else None for i,(c,v) in enumerate(zip(CLASSES,iou))},mean_iou=float(iou[union>0].mean()),foreground_mean_iou=float(iou[1:].mean()),pixel_accuracy=float(intersection.sum()/a.sum()),mean_forward_ms=elapsed/count*1000)
def main(args):
    torch.manual_seed(args.seed);random.seed(args.seed);np.random.seed(args.seed)
    root=Path(args.data);out=Path(args.output);out.mkdir(parents=True,exist_ok=True);rows=audit(root)
    fingerprint=hashlib.sha256(b''.join((root/f'{s}.json').read_bytes() for s in ['train','val','test'])).hexdigest()
    device=torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    if args.require_cuda:assert device.type=='cuda','GPU required'
    last=out/'last.pt';model=build_model(not (args.resume and last.exists())).to(device)
    opt=torch.optim.AdamW([{'params':model.backbone.parameters(),'lr':args.lr*.1},{'params':model.classifier.parameters(),'lr':args.lr},{'params':model.aux_classifier.parameters(),'lr':args.lr}],weight_decay=.0001)
    scheduler=torch.optim.lr_scheduler.CosineAnnealingLR(opt,args.epochs);scaler=torch.amp.GradScaler('cuda',enabled=device.type=='cuda');history=[];best=-1;stale=0;start=0
    if args.resume and last.exists():
        c=torch.load(last,map_location='cpu',weights_only=False);assert c['fingerprint']==fingerprint
        for k in ['epochs','lr','batch_size','size','seed']:assert c['config'][k]==getattr(args,k),f'Resume mismatch {k}'
        model.load_state_dict(c['model']);opt.load_state_dict(c['optimizer']);scheduler.load_state_dict(c['scheduler']);scaler.load_state_dict(c['scaler']);history=c['history'];best=c['best'];stale=c['stale'];start=c['epoch']+1
    pixels=torch.tensor([sum(r['pixel_counts'][i] for r in rows['train']) for i in range(3)],dtype=torch.float,device=device);weights=(pixels.sum()/pixels).sqrt();weights/=weights.mean()
    train=DataLoader(Waste(root,'train',True,args.size),batch_size=args.batch_size,shuffle=True,num_workers=args.workers,drop_last=True,pin_memory=device.type=='cuda');val=DataLoader(Waste(root,'val',False,args.size),batch_size=args.batch_size,num_workers=args.workers)
    for epoch in range(start,args.epochs):
        if stale>=args.patience:break
        random.seed(args.seed+epoch);torch.manual_seed(args.seed+epoch);model.train();total=0;n=0
        for x,y in train:
            x=x.to(device);y=y.to(device);opt.zero_grad(set_to_none=True)
            with torch.autocast(device_type=device.type,enabled=device.type=='cuda'):
                pred=model(x);loss=nn.functional.cross_entropy(pred['out'],y,weight=weights)+.4*nn.functional.cross_entropy(pred['aux'],y,weight=weights)
                probs=pred['out'].softmax(1);onehot=nn.functional.one_hot(y,3).permute(0,3,1,2);dice=1-((2*(probs*onehot).sum((0,2,3))+1)/(probs.sum((0,2,3))+onehot.sum((0,2,3))+1)).mean();loss=loss+.5*dice
            assert torch.isfinite(loss),'Nonfinite loss'
            scaler.scale(loss).backward();scaler.unscale_(opt);nn.utils.clip_grad_norm_(model.parameters(),5);scaler.step(opt);scaler.update();total+=float(loss.detach());n+=1
            if args.smoke_steps and n>=args.smoke_steps:break
        scheduler.step();metrics=evaluate(model,val,device);score=metrics['foreground_mean_iou'];improved=score>best
        if improved:best=score;stale=0
        else:stale+=1
        history.append(dict(epoch=epoch+1,loss=total/n,validation=metrics))
        state=dict(model=model.state_dict(),optimizer=opt.state_dict(),scheduler=scheduler.state_dict(),scaler=scaler.state_dict(),epoch=epoch,history=history,best=best,stale=stale,fingerprint=fingerprint,classes=CLASSES,config=vars(args))
        checkpoint(state,last)
        if improved:checkpoint(state,out/'best.pt')
        save_json(history,out/'history.json');print(json.dumps(history[-1]),flush=True)
        if args.smoke_steps:break
    chosen=torch.load(out/'best.pt',map_location='cpu',weights_only=False);model.load_state_dict(chosen['model'])
    result=dict(selected_epoch=chosen['epoch']+1,validation_foreground_miou=chosen['best'],classes=CLASSES,split_images={s:len(r) for s,r in rows.items()},fingerprint=fingerprint,device=str(device),torch=torch.__version__,torchvision=torchvision.__version__,config=vars(args),source_report=json.loads((root/'report.json').read_text()),test=None,smoke_only=bool(args.smoke_steps))
    if not args.smoke_steps:result['test']=evaluate(model,DataLoader(Waste(root,'test',False,args.size),batch_size=args.batch_size,num_workers=args.workers),device)
    save_json(result,out/'evaluation.json');save_json(dict(architecture='deeplabv3_mobilenet_v3_large',classes=CLASSES,input_size=args.size,normalization=dict(mean=[.485,.456,.406],std=[.229,.224,.225]),deployment_ready=False,requires_confirmation=True,limitation='One household, fixed camera. Capture-group test only; independent household/phone evaluation and confidence calibration remain required. Does not distinguish recyclable materials or establish compostability, safety, mass or disposal rules.'),out/'model_card.json');print('Training and held-out evaluation complete',flush=True)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--data',required=True);p.add_argument('--output',required=True);p.add_argument('--epochs',type=int,default=25);p.add_argument('--batch-size',type=int,default=4);p.add_argument('--size',type=int,default=512);p.add_argument('--workers',type=int,default=2);p.add_argument('--lr',type=float,default=.0003);p.add_argument('--seed',type=int,default=42);p.add_argument('--patience',type=int,default=6);p.add_argument('--resume',action='store_true');p.add_argument('--require-cuda',action='store_true');p.add_argument('--smoke-steps',type=int,default=0);main(p.parse_args())
