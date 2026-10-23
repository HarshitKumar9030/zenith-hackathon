"""Fail before training if files, labels or held-out split isolation are invalid."""
import argparse, hashlib, json
from collections import Counter
from pathlib import Path
from PIL import Image

def audit(root):
    root=Path(root);docs={s:json.loads((root/f'{s}.json').read_text()) for s in ['train','val','test']};records=[];report={}
    for split,doc in docs.items():
        ids={};counts=Counter()
        for im in doc['images']:
            assert im['id'] not in ids,'Repeated image ID';ids[im['id']]=im
            with Image.open(root/'images'/im['file_name']) as p:
                rgb=p.convert('RGB');assert rgb.size==(im['width'],im['height'])
                actual=hashlib.sha256(rgb.tobytes()+f'{rgb.width}x{rgb.height}'.encode()).hexdigest()
                assert actual==im['pixel_sha256'],f'Image changed: {im["file_name"]}'
            records.append((split,im))
        for a in doc['annotations']:
            im=ids[a['image_id']];x,y,w,h=a['bbox'];assert 1<=a['category_id']<=6
            assert w>0 and h>0 and x>=0 and y>=0 and x+w<=im['width']+.01 and y+h<=im['height']+.01
            counts[a['category_id']]+=1
        assert all(counts[c]>=(20 if split=='train' else 5) for c in range(1,7)),f'Insufficient class coverage in {split}'
        report[split]={'images':len(ids),'class_box_counts':dict(counts)}
    for i,(sa,a) in enumerate(records):
        for sb,b in records[:i]:
            if sa==sb:continue
            assert a['id']!=b['id'] and a['source_batch']!=b['source_batch'],'Source group leakage'
            assert a['pixel_sha256']!=b['pixel_sha256'],'Exact duplicate leakage'
            assert (int(a['dhash'],16)^int(b['dhash'],16)).bit_count()>4,'Near duplicate leakage'
    return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('data');a=p.parse_args();print(json.dumps(audit(a.data),indent=2))
