# Waste Right material detector

The first fine-tuned model detects several visible items with bounding boxes. It uses Torchvision SSDLite320 MobileNetV3 Large, initialized from COCO weights. It suggests plastic, paper, cardboard, glass, metal or `needs_review`. A person must confirm the result. The model cannot infer weight, hidden contamination, local collection rules or safety.

## Data

The annotated starting dataset is [TACO](https://github.com/pedropro/TACO), pinned to revision `70479ad9adc3da971a8ae75ac97eb1026910eec7`. The [dataset release](https://zenodo.org/records/3587843) declares CC BY 4.0. The MIT toolkit license is distinct from dataset attribution. The collector retains original URLs, original categories and the release attribution in its training package. Images are normalized to JPEG and at most 640 px, with rescaled COCO bounding boxes.

`data/scraper/collect_taco.py` downloads/resumes the annotated images with bounded workers, retry and atomic writes. It groups collection batches and joins batches containing exact or dHash-near duplicates before splitting. A deterministic grouped search requires every class in all splits. `audit_dataset.py` checks real files, image hashes, box bounds, class coverage and cross-split leakage.

The existing Commons scrape is weakly labelled and is excluded from this first supervised detector. It remains available for later review/annotation. TACO has only eight food-waste annotations and two batteries, so food and specialist recognition remain unsupported. Compound packaging and unclear categories map to `needs_review`, not a confident ordinary-material label.

TACO contains outdoor litter. Its held-out score does not establish performance in homes. A separately collected, annotated household-camera test set is required before integration. Do not generate labels from search queries or report training accuracy as deployment accuracy.

## Local collection and verification

```sh
data/scraper/.venv/bin/python data/scraper/collect_taco.py
model/.venv/bin/python model/training/audit_dataset.py data/datasets/taco-v1
model/.venv/bin/python model/training/train_detector.py --data data/datasets/taco-v1 --output model/runs/smoke --epochs 1 --batch-size 2 --workers 0 --smoke-steps 2
```

The smoke run uses two validation images and leaves the test split untouched. Its metrics are not a model-quality result. Datasets, archives, environments and checkpoints remain ignored by Git.

## Colab training

`Waste_Right_Colab.ipynb` contains the full workflow. The private Drive folder **Waste Right Model Training** holds three 500-image archives, a training bundle, a checksummed package manifest and the notebook. The notebook mounts Drive, extracts files to local runtime storage, audits them and saves each epoch's checkpoint back to Drive.

Training uses 30 epochs at most, early stopping with patience 7, batch size 8, AdamW and a lower backbone learning rate. A fresh classifier replaces the COCO class head while retaining pretrained localization. Validation mAP selects `best.pt`. The untouched test split is evaluated after selection. Resume rejects a changed dataset or different core hyperparameters. No paid upgrade or compute purchase is performed by the notebook.

Outputs: `best.pt`, `last.pt`, `history.json`, `evaluation.json`, `test_predictions.json` and `model_card.json`. Scores are not calibrated probabilities. The card keeps deployment disabled until threshold calibration and independent household evaluation. OCR and Gemini remain separate fallback components; this training task does not change the app.

## Colab MCP setup on this workstation

Google's official [Colab MCP server](https://github.com/googlecolab/colab-mcp) is registered as `colab`. Installed source revision: `b9ab3899e0f1fa493390b1fd6d54aa2e464ecdf1`. A local compatibility fix shields its initializer from the 60-second consent timeout cancelling future connections. The scratch URL selects the browser account associated with this project's Drive files. Original package files are preserved beside those fixes. No authentication checks, token protection or allowed-origin restrictions are removed. Google account consent remains a user action.

## Inspect a checkpoint

```sh
model/.venv/bin/python model/training/predict.py /path/to/best.pt /path/to/image.jpg --min-score 0.5
```

Use only checkpoints produced by this pipeline. The cutoff above is an inspection example, not a calibrated deployment threshold. Output contains material candidates, boxes and raw scores; every candidate requires confirmation. An empty result or `needs_review` recommends fallback. This does not estimate weight or determine disposal rules.
