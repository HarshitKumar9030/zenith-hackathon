# Household organic-waste model, version 2

This experiment targets the missing food/organic waste capability. It is a separate semantic segmentation model, not a replacement six-material detector. It predicts background, organic waste and non-organic contaminants. It cannot determine compostability, weight, safety or local disposal rules.

## Source

Florian Wolling and Gabor Pal, TU Wien: [Image Dataset of Domestic Organic Waste and Non-Organic Contaminants for Classification and Segmentation](https://doi.org/10.48436/27k90-dvw73), version 1.0.0, CC BY 4.0. The publisher provides 450 human-labelled images from one family's fixed bin camera: 119 organic-only scenes, 324 scenes with deliberately added contaminants, and 7 empty/background scenes. These source scene labels are not object annotations.

The collector checks the publisher's licence metadata and verifies the archive against its published MD5. The preparation script reads paired pixel masks; it does not fabricate bounding boxes or labels. It preserves publisher attribution, source metadata, capture dates and per-file SHA-256 hashes. RGB mask colours map exactly to background=0, organic=1, non-organic=2. Images are JPEG at at most 640 pixels; masks use nearest-neighbour resizing.

## Isolation and evaluation

Captures from the same day stay together. Exact duplicates and dHash-near duplicates join capture groups before a fixed seeded search balances split counts and class coverage. Training verifies hashes, masks and split separation. No augmentation occurs before splitting. The test set is held out until validation selects the checkpoint.

This is **capture-group-held-out evaluation within one household**. It is not independent-household or phone-camera evaluation. A reliable production claim still requires new homes, camera angles, lighting conditions and mixed waste examples. Public bin-camera data addresses part of the domain gap; it cannot supply observations from this project's users.

## Training

[DeepLabV3 MobileNetV3 Large](https://docs.pytorch.org/vision/stable/models/generated/torchvision.models.segmentation.deeplabv3_mobilenet_v3_large.html), initialized from official COCO/VOC segmentation weights, with three-class main and auxiliary heads. Training uses 512-pixel input, training-only brightness/contrast and horizontal flips, weighted cross-entropy plus Dice loss, AdamW, cosine learning-rate decay and early stopping. Validation foreground mean IoU selects the model. Report organic IoU and contaminant IoU separately; background pixel accuracy alone is misleading. IoU scores are not comparable to the first detector's mAP.

Commands from the repository root:

```sh
model/.venv/bin/python data/scraper/collect_household.py
model/.venv/bin/python model/training/prepare_household.py
model/.venv/bin/python model/training/train_household.py --data data/datasets/household-v2/prepared --output model/runs/household-v2 --epochs 25 --batch-size 4 --resume --require-cuda
```

Resume checkpoints include optimizer, scheduler, mixed-precision scaler, dataset fingerprint and hyperparameters. The model remains outside the app until separately evaluated and calibrated. Existing TACO test images are not used to tune this experiment.

## Prepared package

The verified preparation produced 55 capture/duplicate groups: 315 training images (36 groups), 68 validation images (9 groups), and 67 test images (10 groups). The selected count-balancing seed is 80. All splits contain both organic and non-organic mask pixels. The GPU smoke test completed two training batches and validation with no held-out test evaluation.

[Private training assets](https://drive.google.com/drive/folders/1ToTZcJoUfaMCKVYo1G823dhmOgD4Vezn) include `household-training.zip` (29,419,762 bytes), SHA-256 `0fad24f01bc85d2b59660f0fca6dcb9d6714f2d2d74856f570c920762bf3ad3a`, and its package manifest. The [Colab notebook](https://drive.google.com/file/d/1l-Y-7HjLDcXTfBAO-YvtC6wDQUImdMi7/view) verifies that checksum before extraction. A compact copy is also available locally under ignored `data/datasets/household-v2/`.

## Completed run: 24 October 2026

Training completed successfully on a Tesla T4, with Torch 2.11.0+cu130 and Torchvision 0.26.0+cu130. Early stopping ended the run after 12 epochs; validation selected epoch 6. Validation foreground mean IoU was 74.86%. Evaluation then used the 67 previously held-out images once.

| Held-out metric | Result |
|---|---:|
| Organic IoU | 70.30% |
| Non-organic contaminant IoU | 61.97% |
| Foreground mean IoU | 66.13% |
| Background IoU | 94.27% |
| Mean IoU across all three classes | 75.51% |
| Pixel accuracy, including background | 91.73% |

IoU measures overlap between predicted and annotated pixel regions. These values do not measure the percentage of correctly identified items. The mean batched T4 forward-pass time was 14.61 ms/image, excluding capture, preprocessing and network time; this does not establish phone inference speed.

The four fixed qualitative examples include empty background, organic-only and contaminant-containing scenes. The model falsely marks part of an empty bin as contamination, confuses some organic peel with non-organic material, and misses thin plant structures. These errors, the validation/test gap and the single-household source are reasons to keep deployment disabled. The next data collection needs more empty-bin negatives, small organic items and different phone-camera views from multiple households. Do not tune this checkpoint on the already inspected test examples.

Artifacts are under `household-v2/runs/deeplab-v1/` in Drive: `best.pt`, `last.pt`, `history.json`, `evaluation.json`, `model_card.json`, `training.log`, and [held-out visual review](https://drive.google.com/file/d/1G2FWCgDldnZVgIY1K2yEt1T029Fxu82j/view). Best checkpoint SHA-256: `8cc6a4130a68015008d27a8813aff06c0b379a2f2aefcb125cc9765f54c1de30`. A verified local copy is in ignored `model/runs/household-v2/best.pt`. Full metrics and history are preserved in `household-v2-results.json`.

Inspect an owned checkpoint locally:

```sh
model/.venv/bin/python model/training/inspect_household.py model/runs/household-v2/best.pt /path/to/photo.jpg --output model/outputs/inspection
```

The inspection tool writes label IDs, a coloured mask, an overlay and a JSON summary of predicted pixel fractions. Fractions are not waste weight or a disposal recommendation. All outputs require human review. This experiment adds an organic/contaminant research component; the app inference path remains unchanged.
