"""Standalone image-testing UI; forwards uploads to the local inference service."""
import os
from pathlib import Path
import requests
from fastapi import FastAPI,File,HTTPException,UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
ROOT=Path(__file__).resolve().parent
app=FastAPI(title='Waste Right Image Lab',docs_url=None,redoc_url=None)
@app.get('/')
def index():return FileResponse(ROOT/'index.html')
@app.get('/sample')
def sample():return FileResponse(ROOT.parent/'outputs/inference-smoke.jpg',media_type='image/jpeg')
@app.post('/api/predict')
def prediction(file:UploadFile=File(...)):
    raw=file.file.read(8*1024*1024+1)
    if len(raw)>8*1024*1024:raise HTTPException(413,'Choose an image smaller than 8 MiB.')
    headers={}
    if os.environ.get('INFERENCE_API_KEY'):headers['X-API-Key']=os.environ['INFERENCE_API_KEY']
    try:r=requests.post('http://127.0.0.1:8001/predict?include_images=true',files={'file':(file.filename,raw,file.content_type)},headers=headers,timeout=60)
    except requests.RequestException as e:raise HTTPException(503,'Inference API is unavailable. Start it on port 8001.') from e
    if not r.ok:
        try:detail=r.json().get('detail','Inference failed.')
        except ValueError:detail='Inference failed.'
        raise HTTPException(r.status_code,detail)
    return r.json()
app.mount('/static',StaticFiles(directory=ROOT),name='static')
