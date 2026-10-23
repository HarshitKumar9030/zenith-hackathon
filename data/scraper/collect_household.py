"""Resume the attributed TU Wien household segmentation archive; verify publisher checksum."""
import concurrent.futures as cf
import hashlib,json,time
from pathlib import Path
import requests
ROOT=Path('data/datasets/household-v2/source')
API='https://researchdata.tuwien.ac.at/api/records/27k90-dvw73'
def main():
    ROOT.mkdir(parents=True,exist_ok=True)
    r=requests.get(API,timeout=60);r.raise_for_status();meta=r.json()
    assert any(x['id']=='cc-by-4.0' for x in meta['metadata']['rights'])
    (ROOT/'publisher-metadata.json').write_text(json.dumps(meta,indent=2))
    entry=next(iter(meta['files']['entries'].values()));name=entry['key'];size=entry['size'];url=entry['links']['content']
    target=ROOT/name
    def digest(p):
        h=hashlib.md5()
        with p.open('rb') as f:
            for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
        return h.hexdigest()
    expected=entry['checksum'].split(':')[1]
    if target.exists() and target.stat().st_size==size and digest(target)==expected:
        print('Verified existing archive',flush=True);return
    count=8;chunk=(size+count-1)//count
    def part(i):
        start=i*chunk;end=min(size,start+chunk)-1;p=ROOT/f'{name}.part{i}'
        for attempt in range(5):
            have=p.stat().st_size if p.exists() else 0
            if have==end-start+1:return p
            try:
                with requests.get(url,headers={'Range':f'bytes={start+have}-{end}'},stream=True,timeout=(30,180)) as res:
                    res.raise_for_status()
                    assert res.status_code==206 and res.headers['Content-Range'].startswith(f'bytes {start+have}-{end}/')
                    with p.open('ab') as f:
                        for b in res.iter_content(1024*1024):f.write(b)
                assert p.stat().st_size==end-start+1
                print('Part complete',i,flush=True);return p
            except Exception:
                if attempt==4:raise
                time.sleep(2**attempt)
    with cf.ThreadPoolExecutor(max_workers=count) as pool:parts=list(pool.map(part,range(count)))
    tmp=target.with_suffix('.assembling')
    with tmp.open('wb') as out:
        for p in parts:
            with p.open('rb') as f:
                for b in iter(lambda:f.read(1024*1024),b''):out.write(b)
    assert tmp.stat().st_size==size and digest(tmp)==expected,'Publisher checksum mismatch'
    tmp.replace(target)
    for p in parts:p.unlink()
    print('Verified archive',target,size,flush=True)
if __name__=='__main__':main()
