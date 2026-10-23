"""Fine-tune COCO-pretrained SSDLite MobileNetV3 on grouped TACO splits.

Never substitutes training metrics for held-out detection evaluation.
"""
from __future__ import annotations
import argparse, functools, hashlib, json, math, os, random, time
from collections import defaultdict
from pathlib import Path
import torch
from torch import nn
from torch.utils.data import Dataset, DataLoader
from torchvision.models.detection import ssdlite320_mobilenet_v3_large, SSDLite320_MobileNet_V3_Large_Weights
from torchvision.models.detection.ssdlite import SSDLiteClassificationHead
from torchvision.models.detection import _utils
from torchvision.transforms.functional import pil_to_tensor
from PIL import Image
from torchmetrics.detection.mean_ap import MeanAveragePrecision
CLASSES=['plastic','paper','cardboard','glass','metal','needs_review']

def seed_all(seed):
    random.seed(seed);torch.manual_seed(seed)
    if torch.cuda.is_available():torch.cuda.manual_seed_all(seed)

def atomic_save(value,path):
    temp=path.with_suffix(path.suffix+'.tmp');torch.save(value,temp);temp.replace(path)

def json_save(value,path):
    def clean(v):
        if isinstance(v,dict):return {k:clean(x) for k,x in v.items()}
        if isinstance(v,list):return [clean(x) for x in v]
        if isinstance(v,float) and not math.isfinite(v):return None
        return v
    temp=path.with_suffix(path.suffix+'.tmp');temp.write_text(json.dumps(clean(value),indent=2));temp.replace(path)

class WasteDataset(Dataset):
    def __init__(self,root,split,augment=False):
        self.root=Path(root);p=json.loads((self.root/f'{split}.json').read_text());self.images=p['images'];self.augment=augment;self.annotations=defaultdict(list)
        for a in p['annotations']:self.annotations[a['image_id']].append(a)
        assert self.images,f'Empty {split} split'
        for im in self.images:
            if not (self.root/'images'/im['file_name']).is_file():raise FileNotFoundError(im['file_name'])
    def __len__(self):return len(self.images)
    def __getitem__(self,i):
        im=self.images[i]
        with Image.open(self.root/'images'/im['file_name']) as p: image=pil_to_tensor(p.convert('RGB')).float()/255
        boxes=[];labels=[];crowd=[]
        for a in self.annotations[im['id']]:
            x,y,w,h=a['bbox'];boxes.append([x,y,x+w,y+h]);labels.append(a['category_id']);crowd.append(a.get('iscrowd',0))
        boxes=torch.tensor(boxes,dtype=torch.float32).reshape(-1,4)
        if self.augment and random.random()<.5:
            image=image.flip(-1);width=image.shape[-1];boxes[:,[0,2]]=width-boxes[:,[2,0]]
        target={'boxes':boxes,'labels':torch.tensor(labels,dtype=torch.int64),'image_id':torch.tensor(im['id']),
                'iscrowd':torch.tensor(crowd,dtype=torch.int64),'area':(boxes[:,2]-boxes[:,0])*(boxes[:,3]-boxes[:,1])}
        return image,target

def collate(batch):return tuple(zip(*batch))

def build_model(pretrained=True):
    # Keep pretrained localization weights; replace only the class prediction head.
    model=ssdlite320_mobilenet_v3_large(weights=SSDLite320_MobileNet_V3_Large_Weights.DEFAULT if pretrained else None,weights_backbone=None)
    channels=_utils.retrieve_out_channels(model.backbone,(320,320));anchors=model.anchor_generator.num_anchors_per_location()
    model.head.classification_head=SSDLiteClassificationHead(channels,anchors,len(CLASSES)+1,norm_layer=functools.partial(nn.BatchNorm2d,eps=.001,momentum=.03))
    return model

@torch.inference_mode()
def evaluate(model,loader,device,collect=False):
    model.eval();metric=MeanAveragePrecision(class_metrics=True);saved=[];latencies=[]
    for images,targets in loader:
        images=[im.to(device) for im in images]
        if device.type=='cuda':torch.cuda.synchronize()
        start=time.perf_counter();out=model(images)
        if device.type=='cuda':torch.cuda.synchronize()
        latencies.append((time.perf_counter()-start)/len(images))
        cpu=[{k:v.cpu() for k,v in p.items()} for p in out]
        truth=[{k:v.cpu() for k,v in t.items() if k in ['boxes','labels','area','iscrowd']} for t in targets]
        metric.update(cpu,truth)
        if collect:
            saved.extend({'image_id':int(t['image_id']),'prediction':{k:v.tolist() for k,v in p.items()},'target':{k:v.tolist() for k,v in g.items()}} for p,g,t in zip(cpu,truth,targets))
    result={k:v.tolist() for k,v in metric.compute().items()};result['mean_inference_ms']=sum(latencies)/len(latencies)*1000
    return result,saved

def verify_splits(root):
    docs={s:json.loads((root/f'{s}.json').read_text()) for s in ['train','val','test']}
    for field in ['id','pixel_sha256','source_batch']:
        sets={s:{im[field] for im in d['images']} for s,d in docs.items()}
        for a,b in [('train','val'),('train','test'),('val','test')]:
            assert not sets[a]&sets[b],f'{field} leakage {a}/{b}'
    return {s:len(d['images']) for s,d in docs.items()}

def main(args):
    seed_all(args.seed);root=Path(args.data);out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    counts=verify_splits(root);device=torch.device(args.device or ('cuda' if torch.cuda.is_available() else 'cpu'))
    if args.require_cuda and device.type!='cuda':raise RuntimeError('Select a GPU runtime. No silent CPU fallback.')
    report=json.loads((root/'report.json').read_text());fingerprint=hashlib.sha256(b''.join((root/f'{s}.json').read_bytes() for s in ['train','val','test'])).hexdigest()
    model=build_model(pretrained=not (args.resume and (out/'last.pt').exists())).to(device);optimizer=torch.optim.AdamW([{'params':model.backbone.parameters(),'lr':args.lr*.1},{'params':model.head.parameters(),'lr':args.lr}],weight_decay=.0005)
    scheduler=torch.optim.lr_scheduler.CosineAnnealingLR(optimizer,T_max=args.epochs)
    scaler=torch.amp.GradScaler('cuda',enabled=device.type=='cuda');best=-1.;start_epoch=0;stale=0;history=[]
    if args.resume and (out/'last.pt').exists():
        state=torch.load(out/'last.pt',map_location='cpu',weights_only=False)
        if state['dataset_fingerprint']!=fingerprint:raise RuntimeError('Checkpoint dataset does not match')
        if any(state['config'].get(k)!=getattr(args,k) for k in ['epochs','batch_size','lr','seed']):raise RuntimeError('Resume hyperparameters differ from checkpoint')
        model.load_state_dict(state['model']);optimizer.load_state_dict(state['optimizer']);scheduler.load_state_dict(state['scheduler']);scaler.load_state_dict(state['scaler']);best=state['best'];start_epoch=state['epoch']+1;stale=state['stale'];history=state['history']
    ds=WasteDataset(root,'train',True)
    val_ds=WasteDataset(root,'val')
    if args.smoke_steps:val_ds=torch.utils.data.Subset(val_ds,range(min(2,len(val_ds))))
    val=DataLoader(val_ds,batch_size=args.batch_size,num_workers=args.workers,collate_fn=collate,pin_memory=device.type=='cuda')
    for epoch in range(start_epoch,args.epochs):
        seed_all(args.seed+epoch)
        loader=DataLoader(ds,batch_size=args.batch_size,shuffle=True,drop_last=True,num_workers=args.workers,collate_fn=collate,pin_memory=device.type=='cuda')
        model.train();total=0.;batches=0
        for images,targets in loader:
            images=[im.to(device) for im in images];targets=[{k:v.to(device) for k,v in t.items()} for t in targets]
            optimizer.zero_grad(set_to_none=True)
            with torch.autocast(device_type=device.type,enabled=device.type=='cuda'):
                losses=model(images,targets);loss=sum(losses.values())
            if not torch.isfinite(loss):raise RuntimeError(f'Nonfinite loss at epoch {epoch+1}')
            scaler.scale(loss).backward();scaler.unscale_(optimizer);torch.nn.utils.clip_grad_norm_(model.parameters(),10.);scaler.step(optimizer);scaler.update();total+=float(loss.detach());batches+=1
            if args.smoke_steps and batches>=args.smoke_steps:break
        if not batches:raise RuntimeError('Training set smaller than batch size')
        scheduler.step();metrics,_=evaluate(model,val,device);score=metrics['map'];improved=score>best
        if improved:best=score;stale=0
        else:stale+=1
        entry={'epoch':epoch+1,'train_loss':total/batches,'validation':metrics};history.append(entry)
        state={'model':model.state_dict(),'optimizer':optimizer.state_dict(),'scheduler':scheduler.state_dict(),'scaler':scaler.state_dict(),'epoch':epoch,'best':best,'stale':stale,'history':history,'classes':CLASSES,'dataset_fingerprint':fingerprint,'seed':args.seed,'architecture':'ssdlite320_mobilenet_v3_large','config':vars(args)}
        atomic_save(state,out/'last.pt')
        if improved:atomic_save(state,out/'best.pt')
        json_save(history,out/'history.json');print(json.dumps(entry),flush=True)
        if stale>=args.patience or args.smoke_steps:break
    best_state=torch.load(out/'best.pt',map_location='cpu',weights_only=False);model.load_state_dict(best_state['model'])
    # The untouched test split is evaluated once, after model selection on validation.
    if args.smoke_steps:
        metrics,predictions={'not_evaluated':'Smoke run leaves the test split untouched'},[]
    else:
        test=DataLoader(WasteDataset(root,'test'),batch_size=args.batch_size,num_workers=args.workers,collate_fn=collate)
        metrics,predictions=evaluate(model,test,device,True)
    result={'test':metrics,'best_validation_map':best_state['best'],'selected_epoch':best_state['epoch']+1,'split_images':counts,'classes':CLASSES,'dataset_fingerprint':fingerprint,'smoke_only':bool(args.smoke_steps),'device':str(device),'torch':torch.__version__,'source_report':report}
    json_save(result,out/'evaluation.json');json_save(predictions,out/'test_predictions.json')
    json_save({'architecture':'ssdlite320_mobilenet_v3_large','input':'RGB tensor [0,1]; model resizes to 320','classes':CLASSES,'requires_user_confirmation':True,'unsupported':report['unsupported'],'confidence_threshold':None,'deployment_ready':False,'reason':'Threshold calibration and household domain evaluation required. Scores are not calibrated probabilities.','test_metrics_file':'evaluation.json'},out/'model_card.json')
    print('Training/evaluation complete. Deployment remains disabled pending review.',flush=True)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--data',required=True);p.add_argument('--output',required=True);p.add_argument('--epochs',type=int,default=30);p.add_argument('--batch-size',type=int,default=8);p.add_argument('--workers',type=int,default=2);p.add_argument('--lr',type=float,default=.001);p.add_argument('--seed',type=int,default=42);p.add_argument('--patience',type=int,default=7);p.add_argument('--device');p.add_argument('--resume',action='store_true');p.add_argument('--require-cuda',action='store_true');p.add_argument('--smoke-steps',type=int,default=0);main(p.parse_args())
