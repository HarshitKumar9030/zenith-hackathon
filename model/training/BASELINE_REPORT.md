# Waste Right: first trained baseline

Completed 24 October 2026 on a Google Colab Tesla T4. Training and held-out evaluation exited successfully. This is an experimental baseline, not a release candidate.

## Results

- Dataset: 1,500 annotated TACO images; 1,102 train, 201 validation, 197 test.
- Split isolation: source batches, exact image hashes and dHash-near duplicates grouped before splitting; audit passed.
- Architecture: COCO-pretrained SSDLite320 MobileNetV3 Large with a new six-class head.
- Early stopping: 14 epochs completed; epoch 7 selected using validation mAP (0.06049).
- Held-out test mAP@0.50:0.95: **0.02544** (2.54 on the 0–100 scale).
- Held-out test mAP@0.50: **0.04673** (4.67 on the 0–100 scale).
- Mean forward-pass time: 8.22 ms/image in batched T4 evaluation. This excludes image capture, preprocessing and network time and is not phone performance.

| Material | Test AP@0.50:0.95 (0–100) |
|---|---:|
| Plastic | 6.12 |
| Paper | 3.47 |
| Cardboard | 3.43 |
| Glass | 0.46 |
| Metal | 1.45 |
| Needs review | 0.33 |

These are detection average-precision scores, not percentages of correctly identified items. Small-object AP is particularly poor (0.018 on the 0–100 scale). The gap between validation and test suggests weak generalization across collection batches. Falling training loss did not translate into dependable held-out performance.

## Saved artifacts

[Private Google Drive training folder](https://drive.google.com/drive/folders/1Jp43enQPALv2nFfVEYJzSawGOxSEibaK), under `runs/ssdlite-v1/`:

- `best.pt`: selected epoch 7; SHA-256 `c0e367f74f56159db13fd9b40b6091bd00f42a3d004908a486b16f479e1e0b4b`.
- `last.pt`: epoch 14, with optimizer, scheduler and scaler state.
- `history.json`, `evaluation.json`, `test_predictions.json`, `model_card.json`, `training.log`.

The repository's `baseline-results.json` preserves the actual evaluation, training history and model card. Checkpoints and image archives stay outside Git. The [reproducible notebook](https://drive.google.com/file/d/1bLpfSRbaQWbx6-U8s6RUyN0Jog-Mf298/view) verifies uploaded package checksums before extracting.

## Integration decision and next experiment

Keep the current app inference path. Do not integrate this checkpoint as an automatic identifier. The scores are low and uncalibrated; household performance has not been measured. Food, batteries, electronics and sanitary waste remain unsupported.

For the next version, acquire and manually annotate household camera images, including multiple items, dim light, occlusion and mixed packaging. Split by household and capture session before augmentation. Reserve a separate household test set. Compare a higher-resolution detector against this baseline using validation data, and calibrate an abstention threshold there. Do not tune on this already inspected test set or describe training scores as accuracy. More training epochs alone are not supported by this run's results.

Data source and attribution: [TACO](https://github.com/pedropro/TACO), [CC BY 4.0 release](https://zenodo.org/records/3587843). Full source revision and package provenance are retained in the result JSON and training bundle.
