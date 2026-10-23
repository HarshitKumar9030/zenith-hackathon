"""Resumeable, bounded collector for the official annotated TACO release.

Keeps original COCO annotations and scales boxes to downloaded image dimensions.
No web-search labels are promoted to ground truth. Outputs stay out of Git.
"""
from __future__ import annotations
import argparse, concurrent.futures, hashlib, io, json, time, random
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse
import requests
from PIL import Image
REVISION = '70479ad9adc3da971a8ae75ac97eb1026910eec7'
SOURCE = f'https://raw.githubusercontent.com/pedropro/TACO/{REVISION}/data/annotations.json'
CLASSES = ['plastic', 'paper', 'cardboard', 'glass', 'metal', 'needs_review']
# Compound packaging, organic waste, tobacco and specialist items remain review-only.
GROUPS = {
 'plastic': [4,5,7,21,24,27,29,36,37,38,39,40,41,43,44,45,47,48,49,55],
 'paper': [30,32,33,34,56], 'cardboard': [13,14,15,17,18,19],
 'glass': [6,9,23,26], 'metal': [0,8,10,12,28,50,52],
}
MAPPING = {c:CLASSES.index(name)+1 for name, ids in GROUPS.items() for c in ids}

def dump(path, value):
    temp=path.with_suffix(path.suffix+'.tmp');temp.write_text(json.dumps(value,indent=2));temp.replace(path)

def collect(im, out):
    path=out/'images'/im['file_name'];path.parent.mkdir(parents=True,exist_ok=True)
    url=im.get('flickr_640_url') or im.get('flickr_url')
    if urlparse(url).hostname not in {'img.tacodataset.org', 'olm-s3.s3.eu-west-1.amazonaws.com'}:
        raise ValueError('Unexpected image host')
    for attempt in range(4):
        try:
            if path.exists(): raw=path.read_bytes()
            else:
                with requests.get(url,stream=True,timeout=(10,35),headers={'User-Agent':'WasteRightResearch/1.0 (annotated TACO collector)'}) as r:
                    r.raise_for_status();chunks=[];size=0
                    for b in r.iter_content(65536):
                        size+=len(b)
                        if size>15*1024*1024: raise ValueError('Image exceeds limit')
                        chunks.append(b)
                    raw=b''.join(chunks)
            with Image.open(io.BytesIO(raw)) as opened:
                if opened.width*opened.height>30_000_000: raise ValueError('Image dimensions exceed limit')
                rgb=opened.convert('RGB')
                resized=max(rgb.size)>640
                if resized:rgb.thumbnail((640,640))
                if min(rgb.size)<64: raise ValueError('Image too small')
                if not path.exists() or resized:
                    temp=path.with_suffix('.tmp');rgb.save(temp,format='JPEG',quality=90);temp.replace(path)
            with Image.open(path) as normalized:
                rgb=normalized.convert('RGB');w,h=rgb.size
                pixels=hashlib.sha256(rgb.tobytes()+f'{w}x{h}'.encode()).hexdigest()
                tiny=rgb.resize((9,8)).convert('L');v=list(tiny.getdata())
                dhash=sum((v[y*9+x]>v[y*9+x+1])<<(y*8+x) for y in range(8) for x in range(8))
            return {**im,'width':w,'height':h,'original_width':im['width'],'original_height':im['height'],
                    'pixel_sha256':pixels,'dhash':f'{dhash:016x}','source_url':url,'source_batch':im['file_name'].split('/')[0]}
        except Exception:
            if attempt==3: raise
            time.sleep(2**attempt)

def prepare(out, workers=12, limit=0):
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    src=out/'annotations-source.json'
    if not src.exists():
        r=requests.get(SOURCE,timeout=45);r.raise_for_status();src.write_bytes(r.content)
    p=json.loads(src.read_text()); images=p['images'][:limit or None]
    records=[];failures=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        jobs={pool.submit(collect,im,out):im for im in images}
        for f in concurrent.futures.as_completed(jobs):
            im=jobs[f]
            try:records.append(f.result())
            except Exception as e:failures.append({'id':im['id'],'error':str(e)})
            if (len(records)+len(failures))%50==0:print(f'{len(records)} downloaded, {len(failures)} failed',flush=True)
    records.sort(key=lambda r:r['id']); byid={r['id']:r for r in records}
    # Keep whole collection batches together; union batches with exact/near duplicates.
    batches=sorted({r['source_batch'] for r in records}); parent={b:b for b in batches}
    def root(b):
        while parent[b]!=b:parent[b]=parent[parent[b]];b=parent[b]
        return b
    for i,a in enumerate(records):
        for b in records[:i]:
            if a['pixel_sha256']==b['pixel_sha256'] or (int(a['dhash'],16)^int(b['dhash'],16)).bit_count()<=4:
                parent[root(a['source_batch'])]=root(b['source_batch'])
    groups=sorted({root(b) for b in batches},key=lambda b:hashlib.sha256(('42:'+b).encode()).hexdigest())
    if len(groups)<3: raise RuntimeError('Need >=3 independent groups for held-out evaluation')
    n=max(2,round(len(groups)*.15)) if len(groups)>=6 else 1
    group_counts={g:Counter() for g in groups}
    for a in p['annotations']:
        im=byid.get(a['image_id'])
        if im:group_counts[root(im['source_batch'])][MAPPING.get(a['category_id'],6)]+=1
    rng=random.Random(42);choice=None;best_score=float('inf')
    total=sum(group_counts.values(),Counter())
    for _ in range(4000):
        order=groups.copy();rng.shuffle(order)
        candidate={b:('test' if i<n else 'val' if i<2*n else 'train') for i,b in enumerate(order)}
        counts={s:sum((group_counts[g] for g in groups if candidate[g]==s),Counter()) for s in ['train','val','test']}
        if any(counts[s][c]<(20 if s=='train' else 5) for s in counts for c in range(1,7)):continue
        score=sum(abs(counts[s][c]/total[c]-(.7 if s=='train' else .15)) for s in counts for c in range(1,7))
        if score<best_score:best_score=score;choice=candidate
    if choice is None:raise RuntimeError('No grouped split covers every class. Inspect dataset before training.')
    splitmap=choice
    sets={s:{'images':[],'annotations':[],'categories':[{'id':i+1,'name':c} for i,c in enumerate(CLASSES)]} for s in ['train','val','test']}
    for im in records:sets[splitmap[root(im['source_batch'])]]['images'].append(im)
    bad=0
    for a in p['annotations']:
        im=byid.get(a['image_id'])
        if not im:continue
        x,y,w,h=a['bbox'];sx=im['width']/im['original_width'];sy=im['height']/im['original_height']
        x1=max(0,min(im['width'],x*sx));y1=max(0,min(im['height'],y*sy));x2=max(x1,min(im['width'],(x+w)*sx));y2=max(y1,min(im['height'],(y+h)*sy))
        if x2-x1<1 or y2-y1<1:bad+=1;continue
        sets[splitmap[root(im['source_batch'])]]['annotations'].append({'id':a['id'],'image_id':a['image_id'],
            'category_id':MAPPING.get(a['category_id'],6),'bbox':[x1,y1,x2-x1,y2-y1],'area':(x2-x1)*(y2-y1),
            'iscrowd':int(a.get('iscrowd',0)),'source_category_id':a['category_id']})
    report={'source':SOURCE,'revision':REVISION,'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),
        'dataset_license':'CC BY 4.0','license_source':'https://zenodo.org/records/3587843','classes':CLASSES,
        'unsupported':['food_waste','battery','electronics','sanitary_waste'],'downloaded':len(records),'failed':failures,
        'invalid_boxes':bad,'independent_groups':groups,'split_policy':'batch groups with dHash <=4 and exact duplicate batch unions',
        'splits':{s:{'images':len(d['images']),'boxes':dict(Counter(CLASSES[a['category_id']-1] for a in d['annotations']))} for s,d in sets.items()}}
    for s,d in sets.items():dump(out/f'{s}.json',d)
    dump(out/'report.json',report);dump(out/'provenance.json',{'dataset':report,'images':records})
    print(json.dumps(report,indent=2),flush=True)
    if failures:raise SystemExit(2)
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--output',default='data/datasets/taco-v1');a.add_argument('--workers',type=int,default=12);a.add_argument('--limit',type=int,default=0)
    args=a.parse_args();prepare(args.output,args.workers,args.limit)
