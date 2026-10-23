"""Render reviewable organic/contaminant segmentation from an owned checkpoint."""
import argparse,json
from pathlib import Path
import numpy as np
import torch
from PIL import Image
from torchvision.transforms import functional as F
from train_household import build_model,CLASSES
COLORS=np.array([[0,0,0],[131,224,112],[255,53,94]],dtype=np.uint8)
def load(checkpoint):
    # Use only checkpoints created by our pipeline, not untrusted pickle files.
    state=torch.load(checkpoint,map_location='cpu',weights_only=False)
    assert state['classes']==CLASSES,'Class mapping differs'
    model=build_model(False);model.load_state_dict(state['model']);model.eval()
    return model,state['config']['size']
@torch.inference_mode()
def predict(model,size,image):
    x=F.normalize(F.pil_to_tensor(image.resize((size,size),Image.Resampling.BILINEAR)).float()/255,[.485,.456,.406],[.229,.224,.225])
    labels=model(x.unsqueeze(0))['out'].argmax(1)[0].cpu().numpy().astype(np.uint8)
    return np.array(Image.fromarray(labels).resize(image.size,Image.Resampling.NEAREST))
def render(image,labels):
    rgb=np.array(image).copy();foreground=labels>0
    rgb[foreground]=(rgb[foreground]*.55+COLORS[labels[foreground]]*.45).astype(np.uint8)
    return Image.fromarray(rgb)
def main(args):
    model,size=load(args.checkpoint)
    with Image.open(args.image) as p:image=p.convert('RGB')
    labels=predict(model,size,image);args.output.mkdir(parents=True,exist_ok=True)
    Image.fromarray(labels).save(args.output/'labels.png');Image.fromarray(COLORS[labels]).save(args.output/'mask.png');render(image,labels).save(args.output/'overlay.jpg',quality=94)
    report=dict(classes=CLASSES,predicted_pixel_fraction={c:float((labels==i).mean()) for i,c in enumerate(CLASSES)},requires_review=True,deployment_ready=False,note='Pixel area is not mass. Class labels do not establish material type, safety, compostability or disposal rules. Independent household/phone-camera evaluation remains required.')
    (args.output/'inspection.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('checkpoint',type=Path);p.add_argument('image',type=Path);p.add_argument('--output',type=Path,required=True);main(p.parse_args())
