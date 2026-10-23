"""Local experimental household segmentation API. No uploaded photos are stored."""
import base64,hashlib,hmac,io,json,os,sys,threading,time
from contextlib import asynccontextmanager
from pathlib import Path
import numpy as np
import torch
from fastapi import FastAPI,File,Header,HTTPException,Query,UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import Image,ImageOps,UnidentifiedImageError
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'model/training'))
from train_household import build_model,CLASSES
from inspect_household import predict,render,COLORS
MAX_BYTES=8*1024*1024
Image.MAX_IMAGE_PIXELS=20_000_000
lock=threading.Lock()
model=None
size=512
API_KEY=os.environ.get('INFERENCE_API_KEY','')
@asynccontextmanager
async def lifespan(app):
    global model,size
    torch.set_num_threads(int(os.environ.get('INFERENCE_THREADS','4')))
    path=ROOT/'model/checkpoints/household-v2-inference.pt'
    manifest=json.loads(path.with_suffix('.json').read_text())
    assert hashlib.sha256(path.read_bytes()).hexdigest()==manifest['sha256'],'Model checksum mismatch'
    state=torch.load(path,map_location='cpu',weights_only=True)
    assert state['classes']==CLASSES
    model=build_model(False);model.load_state_dict(state['model']);model.eval();size=state['size']
    # Warm up the model before accepting requests.
    with torch.inference_mode():model(torch.zeros(1,3,size,size))
    yield
app=FastAPI(title='Waste Right — Experimental Inference',version='household-v2',lifespan=lifespan)
@app.get('/health')
def health():
    return {'status':'ready' if model is not None else 'starting','model':'household-v2','classes':CLASSES,'device':'cpu','deployment_ready':False}
def infer(raw,include_images):
    if not lock.acquire(blocking=False):raise HTTPException(429,'Inference busy. Retry after the current frame.')
    try:
        try:
            with Image.open(io.BytesIO(raw)) as opened:
                if opened.format not in {'JPEG','PNG','WEBP'}:raise HTTPException(415,'Use JPEG, PNG or WebP')
                if opened.width*opened.height>20_000_000:raise HTTPException(413,'Image exceeds 20 megapixels')
                image=ImageOps.exif_transpose(opened).convert('RGB')
                image.thumbnail((1280,1280))
        except (UnidentifiedImageError,OSError,Image.DecompressionBombError) as e:raise HTTPException(400,'Invalid or oversized image') from e
        start=time.perf_counter();labels=predict(model,size,image);elapsed=(time.perf_counter()-start)*1000
        response={'model':'household-v2','classes':CLASSES,'width':image.width,'height':image.height,'inference_ms':round(elapsed,1),'predicted_pixel_fraction':{c:round(float((labels==i).mean()),6) for i,c in enumerate(CLASSES)},'requires_review':True,'deployment_ready':False,'limitations':'Organic/non-organic segmentation from one fixed household camera. Does not identify recyclable materials, estimate weight or determine disposal rules.'}
        if include_images:
            def encode(im,fmt):
                out=io.BytesIO();im.save(out,format=fmt);return base64.b64encode(out.getvalue()).decode()
            response['mask_png_base64']=encode(Image.fromarray(COLORS[labels]),'PNG')
            response['overlay_jpeg_base64']=encode(render(image,labels),'JPEG')
        return response
    finally:lock.release()
@app.post('/predict')
async def prediction(file:UploadFile=File(...),include_images:bool=Query(False),x_api_key:str|None=Header(None)):
    if API_KEY and not hmac.compare_digest(x_api_key or '',API_KEY):raise HTTPException(401,'Invalid API key')
    raw=await file.read(MAX_BYTES+1)
    if len(raw)>MAX_BYTES:raise HTTPException(413,'Maximum image size is 8 MiB')
    if not raw:raise HTTPException(400,'Image is empty')
    return await run_in_threadpool(infer,raw,include_images)
