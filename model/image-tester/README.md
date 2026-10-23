# Image Lab

A separate, dependency-light image testing project. It uses the existing local inference service and does not modify the main Waste Right app. Images are processed in memory.

Start inference from the repository root if it is not already running:

```sh
model/.venv/bin/python -m uvicorn app:app --app-dir model/inference --host 127.0.0.1 --port 8001
```

Then start the image tester in another terminal:

```sh
model/.venv/bin/python -m uvicorn server:app --app-dir model/image-tester --host 127.0.0.1 --port 8002
```

Open http://127.0.0.1:8002. Upload or drop an image, or select **Use example**, then **Run inference**. Toggle between overlay and mask. The breakdown shows predicted pixel area, not confidence, weight or material identification. This experimental model distinguishes organic, non-organic and background regions only.

Uses FastAPI, Uvicorn and Requests from the existing `model/.venv`. If inference has an `INFERENCE_API_KEY`, provide the same environment variable to this tester; it stays on the Python server and is not sent to the browser. Both services bind to localhost.
