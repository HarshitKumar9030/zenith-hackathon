"""Collect review candidates from Wikimedia Commons; never infer verified labels."""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED
import threading
import fcntl
from datetime import datetime, timezone
import hashlib
import io
import json
import logging
from pathlib import Path
import time
import warnings

from PIL import Image, UnidentifiedImageError
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

API = "https://commons.wikimedia.org/w/api.php"
MAX_BYTES = 20 * 1024 * 1024
LOG = logging.getLogger("scraper")


def session(user_agent):
    client = requests.Session()
    client.headers["User-Agent"] = user_agent
    retry = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
    client.mount("https://", HTTPAdapter(max_retries=retry))
    return client


def candidates(client, query, limit, delay):
    params = dict(action="query", format="json", generator="search",
                  gsrsearch=query, gsrnamespace=6, gsrlimit=min(limit, 50),
                  prop="imageinfo", iiprop="url|size|mime|extmetadata", maxlag=5)
    count = 0
    while count < limit:
        time.sleep(delay)
        response = client.get(API, params=params, timeout=(10, 45))
        response.raise_for_status()
        payload = response.json()
        if "error" in payload:
            raise RuntimeError(f"Commons API: {payload['error']}")
        for page in payload.get("query", {}).get("pages", {}).values():
            if count >= limit:
                return
            count += 1
            if page.get("imageinfo"):
                yield page, page["imageinfo"][0]
        continuation = payload.get("continue")
        if not continuation:
            return
        params.update(continuation)


def download(client, url, min_size, delay):
    time.sleep(delay)
    with client.get(url, stream=True, timeout=(10, 60)) as response:
        response.raise_for_status()
        data = bytearray()
        for chunk in response.iter_content(65536):
            data.extend(chunk)
            if len(data) > MAX_BYTES:
                raise ValueError("Image exceeds 20 MiB")
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(io.BytesIO(data)) as image:
            image.verify()
        with Image.open(io.BytesIO(data)) as image:
            if min(image.size) < min_size:
                raise ValueError("Image below minimum dimensions")
            rgb = image.convert("RGB")
            # Pixel hash also catches identical images with different metadata.
            digest = hashlib.sha256(str(rgb.size).encode() + rgb.tobytes()).hexdigest()
            output = io.BytesIO()
            rgb.save(output, format="JPEG", quality=95)
    return output.getvalue(), digest


def parallel_candidates(client, query, args, urls):
    """Bound memory/in-flight work; only the caller writes files and metadata."""
    seen = set(urls)
    def eligible():
        for page, info in candidates(client, query, args.candidates_per_query, args.delay):
            if (info.get("mime") not in {"image/jpeg", "image/png", "image/webp"}
                    or info.get("size", MAX_BYTES + 1) > MAX_BYTES
                    or info["url"] in seen
                    or not info.get("extmetadata", {}).get("LicenseShortName", {}).get("value")):
                continue
            seen.add(info["url"])
            yield page, info
    local = threading.local()
    clients = []
    clients_lock = threading.Lock()
    def fetch(item):
        page, info = item
        try:
            if not hasattr(local, "client"):
                local.client = session(args.user_agent)
                with clients_lock:
                    clients.append(local.client)
            result = download(local.client, info["url"], args.min_size,
                              getattr(args, "download_delay", args.delay))
            return page, info, result, None
        except (requests.RequestException, ValueError, OSError,
                Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
            return page, info, None, str(exc)
    iterator = eligible()
    workers = getattr(args, "workers", 1)
    pending = set()
    exhausted = False
    pool = ThreadPoolExecutor(max_workers=workers)
    try:
        while pending or not exhausted:
            while not exhausted and len(pending) < workers * 2:
                try:
                    item = next(iterator)
                except StopIteration:
                    exhausted = True
                    break
                pending.add(pool.submit(fetch, item))
            if pending:
                finished, pending = wait(pending, return_when=FIRST_COMPLETED)
                for future in finished:
                    yield future.result()
    finally:
        for future in pending:
            future.cancel()
        pool.shutdown(wait=True, cancel_futures=True)
        for client in clients:
            client.close()


def collect(args):
    queries = json.loads(args.queries.read_text())
    selected = args.classes or list(queries)
    if any(label not in queries for label in selected):
        raise ValueError("Unknown class; see queries.json")
    if any(not label.replace('_', '').isalnum() for label in selected):
        raise ValueError("Class names must be alphanumeric with underscores")
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = args.output / "annotations.jsonl"
    records = [json.loads(line) for line in manifest.read_text().splitlines() if line.strip()] if manifest.exists() else []
    missing = [r["file_path"] for r in records if not (args.output / r["file_path"]).is_file()]
    if missing:
        raise ValueError(f"Manifest references missing images; restore or repair first: {missing[:3]}")
    hashes = {r["image_id"] for r in records}
    urls = {r["source_url"] for r in records}
    counts = Counter(r["material"] for r in records)
    baseline = counts.copy()
    new_total = getattr(args, "new_total", None)
    # Allocate exactly the requested new total evenly across selected classes.
    targets = {label: (counts[label] + new_total // len(selected) + (i < new_total % len(selected))
                       if new_total is not None else args.per_class)
               for i, label in enumerate(selected)}
    prior = None
    if getattr(args, "resume_targets", None):
        prior = json.loads(args.resume_targets.read_text())
        targets = {label: prior["targets"][label] for label in selected}
        new_total = prior.get("requested_new_total")
    failures = prior.get("failures", 0) if prior else 0
    previous_added = prior.get("added_this_run", 0) if prior else 0
    def save_summary():
        summary = dict(counts=dict(counts), targets=targets,
                       added_this_run=previous_added + sum(counts.values()) - sum(baseline.values()),
                       requested_new_total=new_total, failures=failures,
                       incomplete=[label for label in selected if counts[label] < targets[label]])
        temporary = args.output / "dataset_manifest.tmp"
        temporary.write_text(json.dumps(summary, indent=2) + "\n")
        temporary.replace(args.output / "dataset_manifest.json")
        return summary
    save_summary()
    with session(args.user_agent) as client, manifest.open("a") as annotations:
        for label in selected:
            for query in queries[label]:
                if counts[label] >= targets[label]:
                    break
                try:
                    for page, info, result, error in parallel_candidates(client, query, args, urls):
                        if counts[label] >= targets[label]:
                            break
                        if info.get("mime") not in {"image/jpeg", "image/png", "image/webp"}:
                            continue
                        if info.get("size", MAX_BYTES + 1) > MAX_BYTES or info["url"] in urls:
                            continue
                        meta = info.get("extmetadata", {})
                        value = lambda key: meta.get(key, {}).get("value", "")
                        if not value("LicenseShortName"):
                            continue
                        try:
                            if error:
                                raise ValueError(error)
                            data, digest = result
                            if digest in hashes:
                                continue
                            relative = Path("raw") / label / f"{digest}.jpg"
                            target = args.output / relative
                            target.parent.mkdir(parents=True, exist_ok=True)
                            temporary = target.with_suffix(".tmp")
                            temporary.write_bytes(data)
                            temporary.replace(target)
                            record = dict(
                                image_id=digest, file_path=relative.as_posix(), material=label,
                                object_name=None, physical_state="unknown", biodegradable=None,
                                organic=None, contaminated=None, mixed_material=None,
                                source="wikimedia_commons", source_url=info["url"],
                                source_page=info.get("descriptionurl"), source_title=page["title"],
                                source_group_id=f"commons:{page['pageid']}", query=query,
                                label_verified=False, license_verified=False,
                                license=value("LicenseShortName"), license_url=value("LicenseUrl"),
                                artist_html=value("Artist"), credit_html=value("Credit"),
                                usage_terms=value("UsageTerms"),
                                attribution_required=value("AttributionRequired"),
                                collected_at=datetime.now(timezone.utc).isoformat())
                            annotations.write(json.dumps(record) + "\n")
                            annotations.flush()
                            hashes.add(digest)
                            urls.add(info["url"])
                            counts[label] += 1
                            save_summary()
                            LOG.info("%s: %s/%s | new this run: %s", label, counts[label], targets[label], previous_added + sum(counts.values()) - sum(baseline.values()))
                        except (requests.RequestException, ValueError, OSError, UnidentifiedImageError,
                                Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
                            failures += 1
                            LOG.warning("Skipping %s: %s", page["title"], exc)
                except (requests.RequestException, RuntimeError) as exc:
                    failures += 1
                    LOG.error("Query %r failed: %s", query, exc)
    summary = save_summary()
    print(json.dumps(summary, indent=2))
    return 2 if summary["incomplete"] else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queries", type=Path, default=Path(__file__).with_name("queries.json"))
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "datasets")
    parser.add_argument("--classes", nargs="+")
    parser.add_argument("--new-total", type=int, help="Collect this many NEW images, excluding all existing records")
    parser.add_argument("--resume-targets", type=Path, help="Resume exact class targets from a saved dataset manifest")
    parser.add_argument("--download-delay", type=float, default=0, help="Delay per image download; API delay is separate")
    parser.add_argument("--workers", type=int, default=16, help="Concurrent image downloads (1-32); API searches stay serial")
    parser.add_argument("--per-class", type=int, default=200, help="Total target including previous runs")
    parser.add_argument("--candidates-per-query", type=int, default=300)
    parser.add_argument("--min-size", type=int, default=224)
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--user-agent", default="WasteWiseDatasetCollector/0.1 (https://github.com/HarshitKumar9030/zenith-hackathon)")
    args = parser.parse_args()
    if min(args.per_class, args.candidates_per_query, args.min_size) < 1 or args.delay < 0:
        parser.error("Targets and dimensions must be positive; delay must be nonnegative")
    if args.download_delay < 0 or not 1 <= args.workers <= 32 or (args.new_total is not None and args.new_total < 1):
        parser.error("Workers must be 1-32, download-delay nonnegative, and new-total positive")
    if args.resume_targets and args.new_total is not None:
        parser.error("Choose resume-targets or new-total, not both")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    try:
        args.output.mkdir(parents=True, exist_ok=True)
        with (args.output / ".scraper.lock").open("w") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                parser.exit(1, "Another scraper is already writing to this output folder\n")
            return collect(args)
    except (ValueError, OSError) as exc:
        parser.exit(1, f"Error: {exc}\n")


if __name__ == "__main__":
    raise SystemExit(main())
