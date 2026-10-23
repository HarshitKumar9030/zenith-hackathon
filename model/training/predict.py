"""Inspect an owned training checkpoint. Results are reviewable proposals only."""
import argparse,json
from pathlib import Path
import torch
from PIL import Image
from torchvision.transforms.functional import pil_to_tensor
from train_detector import build_model,CLASSES

def main(args):
    # Load only checkpoints produced by this training pipeline, never third-party pickle files.
    checkpoint=torch.load(args.checkpoint,map_location='cpu',weights_only=False)
    assert checkpoint['classes']==CLASSES,'Checkpoint class mapping mismatch'
    model=build_model(pretrained=False);model.load_state_dict(checkpoint['model']);model.eval()
    with Image.open(args.image) as p:image=pil_to_tensor(p.convert('RGB')).float()/255
    with torch.inference_mode():pred=model([image])[0]
    found=[]
    for box,label,score in zip(pred['boxes'],pred['labels'],pred['scores']):
        if float(score)<args.min_score:continue
        found.append({'material_candidate':CLASSES[int(label)-1],'score':round(float(score),4),'box_xyxy':[round(float(v),1) for v in box],'requires_confirmation':True})
        if len(found)>=args.max_items:break
    print(json.dumps({'items':found,'requires_review':True,'fallback_recommended':not found or any(v['material_candidate']=='needs_review' for v in found),'unsupported':['food_waste','specialist_handling'],'note':'Scores are not calibrated probabilities. This tool does not recommend disposal or establish weight.'},indent=2))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('checkpoint',type=Path);p.add_argument('image',type=Path);p.add_argument('--min-score',type=float,required=True,help='Inspection cutoff, not a deployment threshold');p.add_argument('--max-items',type=int,default=20);main(p.parse_args())
