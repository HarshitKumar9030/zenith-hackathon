"""Convert publisher masks without inferred boxes or machine-generated labels."""
import hashlib,json,random,zipfile
from collections import Counter,defaultdict
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path('data/datasets/household-v2')
COLORS=[(0,0,0),(131,224,112),(255,53,94)]
CLASSES=['background','organic','non_organic']
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def dhash(im):
    a=np.asarray(im.convert('L').resize((9,8)))
    return int(''.join('1' if x else '0' for x in (a[:,1:]>a[:,:-1]).flat),2)
def process_image(args):
    name,archive,dest=args
    with zipfile.ZipFile(archive) as z:
        names=set(z.namelist())
        maskname=name.replace('/images/','/masks/');assert maskname in names,maskname
        ident=Path(name).name;stem=Path(ident).stem;date=stem[:10]
        with z.open(name) as f,Image.open(f) as im:
            im=im.convert('RGB');original=im.size;h=dhash(im);pixel=hashlib.sha256(im.tobytes()).hexdigest()
            im.thumbnail((640,640));size=im.size;im.save(dest/'images'/f'{stem}.jpg',quality=94)
        with z.open(maskname) as f,Image.open(f) as mask:
            assert mask.size==original
            rgb=np.asarray(mask.convert('RGB'));labels=np.full(rgb.shape[:2],255,np.uint8)
            for i,color in enumerate(COLORS):labels[np.all(rgb==color,axis=2)]=i
            assert (labels!=255).all(),f'Unknown mask colors in {name}'
            mask=Image.fromarray(labels).resize(size,Image.Resampling.NEAREST);mask.save(dest/'masks'/f'{stem}.png')
            counts=np.bincount(np.asarray(mask).ravel(),minlength=3).tolist()
        ip=dest/'images'/f'{stem}.jpg';mp=dest/'masks'/f'{stem}.png'
        return dict(id=stem,date=date,source_group=Path(name).parent.name,image=str(ip.relative_to(dest)),mask=str(mp.relative_to(dest)),sha256=sha(ip),mask_sha256=sha(mp),pixel_sha256=pixel,dhash=f'{h:016x}',pixel_counts=counts,width=size[0],height=size[1])

def main():
    source=ROOT/'source';archive=next(source.glob('*.zip'));dest=ROOT/'prepared'
    for x in ['images','masks']: (dest/x).mkdir(parents=True,exist_ok=True)
    records=[]
    with zipfile.ZipFile(archive) as z:
        names=set(z.namelist())
        from concurrent.futures import ProcessPoolExecutor
        image_names=sorted(n for n in names if '/images/' in n and n.endswith('.png'))
        with ProcessPoolExecutor(max_workers=4) as pool:
            for r in pool.map(process_image,[(name,archive,dest) for name in image_names]):
                records.append(r)
                if len(records)%25==0:print('Prepared pairs',len(records),flush=True)
        (dest/'ATTRIBUTION.txt').write_bytes(z.read(next(n for n in names if n.endswith('/README.txt'))))
        (dest/'labelmap.csv').write_bytes(z.read(next(n for n in names if n.endswith('/labelmap.csv'))))
    assert len(records)==450
    # All captures from a day stay together. Join exact and near-duplicate dates as well.
    days=sorted({r['date'] for r in records});parent={x:x for x in days}
    def find(x):
        while parent[x]!=x:parent[x]=parent[parent[x]];x=parent[x]
        return x
    for i,a in enumerate(records):
        for b in records[:i]:
            if a['pixel_sha256']==b['pixel_sha256'] or (int(a['dhash'],16)^int(b['dhash'],16)).bit_count()<=4:parent[find(a['date'])]=find(b['date'])
    groups=defaultdict(list)
    for r in records: r['capture_group']=find(r['date']);groups[r['capture_group']].append(r)
    keys=sorted(groups);best=None
    # Fixed seeded group search, based only on counts/label coverage, never model scores.
    for seed in range(2000):
        order=keys.copy();random.Random(seed).shuffle(order);splits={s:[] for s in ['train','val','test']}
        for key in order:
            s=min(splits,key=lambda s:len(splits[s])/({'train':.7,'val':.15,'test':.15}[s]*len(records)))
            splits[s].extend(groups[key])
        if any(not v or any(sum(x['pixel_counts'][c] for x in v)==0 for c in range(3)) for v in splits.values()):continue
        # Require pure-organic and contaminant-containing scenes in each split.
        if any(not any(x['source_group']=='organic' for x in v) or not any(x['source_group']=='non-organic' for x in v) for v in splits.values()):continue
        score=sum(abs(len(splits[s])/450-{'train':.7,'val':.15,'test':.15}[s]) for s in splits)
        if best is None or score<best[0]:best=(score,seed,splits)
    assert best,'Insufficient independent capture groups; do not relax leakage checks'
    report=dict(source='https://doi.org/10.48436/27k90-dvw73',license='CC BY 4.0',creators=['Florian Wolling','Gabor Pal'],classes=CLASSES,images=450,independent_groups=len(groups),split_seed=best[1],split_policy='Capture day + exact/dHash<=4 connected components; count-balanced seeded grouped split',limitation='One household and one fixed camera; test is capture-group-held-out, not independent-household or phone-camera validation',splits={})
    for s,v in best[2].items():
        (dest/f'{s}.json').write_text(json.dumps(v,indent=2));report['splits'][s]=dict(images=len(v),groups=len({x['capture_group'] for x in v}),scene_counts=dict(Counter(x['source_group'] for x in v)),pixel_counts=[sum(x['pixel_counts'][c] for x in v) for c in range(3)])
    (dest/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
if __name__=='__main__':main()
