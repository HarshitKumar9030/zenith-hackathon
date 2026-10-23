# WasteWise image collector

Collects image candidates for the nine material classes in the project brief using the Wikimedia Commons API. No API key is needed. Requires Python 3.11+.

## Run from the repository root

```sh
python3 -m venv data/scraper/.venv
data/scraper/.venv/bin/python -m pip install -r data/scraper/requirements.txt
# Small smoke run first
data/scraper/.venv/bin/python data/scraper/scrape.py --classes plastic --per-class 3
# Collect all nine classes (total target, not additional images per run)
data/scraper/.venv/bin/python data/scraper/scrape.py --per-class 200
```

Options include `--classes paper metal`, `--queries custom.json`, `--output /absolute/path`, `--min-size 224`, `--candidates-per-query 300`, `--delay 1`, and `--user-agent 'Name/Version (contact URL or email)'`. Custom output paths must be excluded from Git separately. Edit `queries.json` to improve coverage. Search results may exhaust before reaching the target; exit code 2 means collection is incomplete, 1 means a fatal error, and 0 means targets were met. Interrupt with Ctrl+C and rerun to resume.

Default output (ignored by Git):

```text
data/datasets/
  raw/<material>/<pixel-sha256>.jpg
  annotations.jsonl
  dataset_manifest.json
```

Downloads are sequential, rate spaced, bounded to 20 MiB, validated with Pillow, and normalized to RGB JPEG. Retries handle transient HTTP failures. Pixel hashes remove exact duplicates globally across classes and runs. Near duplicates and alternate photographs of the same object still require review. Existing manifest entries are validated for file presence before resuming. Avoid concurrent runs against the same output folder.

Each JSONL record preserves source URL/page, search query, source group, license name/URL, attribution HTML, and collection time. Unknown physical properties remain unknown/null. `material` is only a proposed label from the search query; `label_verified` and `license_verified` start false. Review relevance, license obligations, attribution, and labels before using images. Source HTML is untrusted and must be sanitized before rendering. Search results can include mixed scenes, irrelevant images, and multiple objects. No images are automatically placed in training or testing sets.

Commons alone is unlikely to provide a balanced 9,000-image dataset. Supplement with reviewed TrashNet/TACO datasets and original photos. Group related photographs by actual object/source before splitting; Commons page IDs alone do not establish object independence. Batteries, electronics, and sanitary items need a separate special-disposal evaluation set, not a forced ordinary material label.

API references: [Search](https://www.mediawiki.org/wiki/API:Search), [Image metadata](https://www.mediawiki.org/wiki/API:Imageinfo).

## Checks

```sh
data/scraper/.venv/bin/python -m unittest discover -s data/scraper -p 'test_*.py'
```
