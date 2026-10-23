"""Strip optimizer state from our verified household checkpoint for serving."""
import hashlib,json
from pathlib import Path
import torch
ROOT=Path(__file__).resolve().parents[2]
source=ROOT/'model/runs/household-v2/best.pt'
assert hashlib.sha256(source.read_bytes()).hexdigest()=='8cc6a4130a68015008d27a8813aff06c0b379a2f2aefcb125cc9765f54c1de30'
state=torch.load(source,map_location='cpu',weights_only=False)
target=ROOT/'model/checkpoints/household-v2-inference.pt'
target.parent.mkdir(parents=True,exist_ok=True)
torch.save({'model':state['model'],'classes':state['classes'],'size':state['config']['size'],'selected_epoch':state['epoch']+1},target)
manifest={'file':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'classes':state['classes'],'deployment_ready':False}
target.with_suffix('.json').write_text(json.dumps(manifest,indent=2));print(json.dumps({'file':str(target),'bytes':target.stat().st_size,'sha256':manifest['sha256']}))
