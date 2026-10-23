# Local inference

Run from the repository root:

```sh
model/.venv/bin/python model/inference/export_checkpoint.py
model/.venv/bin/python -m uvicorn app:app --app-dir model/inference --host 127.0.0.1 --port 8001
```

The verified inference-only checkpoint and checksum manifest are in ignored `model/checkpoints/`. The full training checkpoint remains in `model/runs/household-v2/` and Google Drive. The API loads once, warms up, then processes one image at a time on CPU with four Torch threads. Uploaded photos are processed in memory and are not saved.

- API docs: http://127.0.0.1:8001/docs
- Health: http://127.0.0.1:8001/health
- `POST /predict`: multipart field `file`; optional `?include_images=true` returns a colour mask and overlay as base64.
- Images: JPEG, PNG or WebP; maximum 8 MiB and 20 megapixels. Busy concurrent inference receives HTTP 429.

```sh
curl -F 'file=@/path/to/photo.jpg' 'http://127.0.0.1:8001/predict?include_images=true'
```

For protected access, set `INFERENCE_API_KEY` before starting the server and send it in `X-API-Key`. The default server binds to localhost; no public tunnel is created. Before exposing it externally, configure authentication and benchmark intended traffic.

This is the experimental three-class organic/contaminant segmentation model. Results require user review; it cannot identify individual recyclable materials or establish waste weight, compostability, safety or disposal rules. See `model/training/HOUSEHOLD_V2.md` for measured results and failure cases.

Large local raw datasets and duplicate training ZIPs were removed at the user's request. Attribution, split manifests, metrics, training code and checkpoints were retained; the compact training package remains in Drive. One small test photo remains under ignored `model/outputs/inference-smoke.jpg` for API verification.
