import io
import tempfile
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from PIL import Image
import scrape


class Response:
    def __init__(self, data):
        self.data = data

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def raise_for_status(self):
        pass

    def iter_content(self, size):
        yield self.data


class DownloadTests(unittest.TestCase):
    def image(self, size=(240, 240), fmt="PNG"):
        output = io.BytesIO()
        Image.new("RGB", size, "green").save(output, format=fmt)
        return output.getvalue()

    def client(self, data):
        return SimpleNamespace(get=lambda *args, **kwargs: Response(data))

    def test_duplicate_pixels_have_same_hash(self):
        data = self.image()
        _, first = scrape.download(self.client(data), "url", 224, 0)
        other = io.BytesIO()
        Image.open(io.BytesIO(data)).save(other, format="BMP")
        jpeg, second = scrape.download(self.client(other.getvalue()), "url", 224, 0)
        self.assertEqual(first, second)
        self.assertEqual(Image.open(io.BytesIO(jpeg)).format, "JPEG")

    def test_reject_small_or_invalid_images(self):
        for data in [self.image((10, 10)), b"not an image"]:
            with self.assertRaises((ValueError, OSError)):
                scrape.download(self.client(data), "url", 224, 0)

    def test_reject_oversized_response(self):
        with patch.object(scrape, "MAX_BYTES", 10):
            with self.assertRaises(ValueError):
                scrape.download(self.client(b"x" * 11), "url", 1, 0)

    def test_resume_deduplicates_and_does_not_redownload(self):
        with tempfile.TemporaryDirectory() as folder:
            args = SimpleNamespace(queries=Path(scrape.__file__).with_name("queries.json"),
                output=Path(folder), classes=["plastic"], per_class=1,
                candidates_per_query=2, delay=0, min_size=224, user_agent="test")
            info = {"url": "https://example.test/image.png", "size": 100,
                    "mime": "image/png", "extmetadata": {"LicenseShortName": {"value": "CC0"}}}
            page = {"pageid": 1, "title": "File:Test.png"}
            with patch.object(scrape, "candidates", return_value=iter([(page, info)])), patch.object(
                    scrape, "download", return_value=(self.image(), "abc")) as mocked:
                self.assertEqual(scrape.collect(args), 0)
                self.assertEqual(scrape.collect(args), 0)
                self.assertEqual(mocked.call_count, 1)
            self.assertEqual(len((Path(folder) / "annotations.jsonl").read_text().splitlines()), 1)


if __name__ == "__main__":
    unittest.main()

class BatchTests(unittest.TestCase):
    def test_new_total_excludes_existing_and_duplicate_pixels(self):
        import json
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "old.jpg").write_bytes(b"existing")
            old = dict(image_id="old", source_url="old-url", material="plastic", file_path="old.jpg")
            (root / "annotations.jsonl").write_text(json.dumps(old) + "\n")
            (root / "queries.json").write_text(json.dumps({"plastic": ["household"]}))
            args = SimpleNamespace(queries=root / "queries.json", output=root,
                classes=None, per_class=200, new_total=2, workers=4,
                candidates_per_query=10, delay=0, min_size=224, user_agent="test")
            def results(*unused):
                for i, digest in enumerate(["old", "new1", "new1", "new2", "extra"]):
                    yield ({"pageid": i, "title": str(i)},
                           {"url": str(i), "size": 1, "mime": "image/jpeg",
                            "extmetadata": {"LicenseShortName": {"value": "CC0"}}},
                           (b"image", digest), None)
            with patch.object(scrape, "parallel_candidates", side_effect=results):
                self.assertEqual(scrape.collect(args), 0)
            records = [json.loads(line) for line in (root / "annotations.jsonl").read_text().splitlines()]
            self.assertEqual([r["image_id"] for r in records], ["old", "new1", "new2"])
            summary = json.loads((root / "dataset_manifest.json").read_text())
            self.assertEqual(summary["added_this_run"], 2)

    def test_parallel_fetch_skips_known_urls(self):
        args = SimpleNamespace(candidates_per_query=10, delay=0, workers=3,
                               user_agent="test", min_size=224)
        def source(*unused):
            for i in [0, 1, 1, 2]:
                yield {"pageid": i}, {"url": str(i), "mime": "image/jpeg", "size": 1,
                                      "extmetadata": {"LicenseShortName": {"value": "CC0"}}}
        with patch.object(scrape, "candidates", side_effect=source), patch.object(
                scrape, "download", return_value=(b"image", "hash")) as fetch:
            results = list(scrape.parallel_candidates(None, "query", args, {"0"}))
            self.assertEqual(fetch.call_count, 2)
            self.assertEqual({r[1]["url"] for r in results}, {"1", "2"})

class SpeedTests(unittest.TestCase):
    def test_fast_download_finishes_before_slow_first_item(self):
        import threading
        release = threading.Event()
        args = SimpleNamespace(candidates_per_query=10, delay=0, download_delay=0,
                               workers=2, user_agent="test", min_size=224)
        def source(*unused):
            for i in range(3):
                yield {"pageid": i}, {"url": str(i), "mime": "image/jpeg", "size": 1,
                                      "extmetadata": {"LicenseShortName": {"value": "CC0"}}}
        def fetch(client, url, *unused):
            if url == "0":
                release.wait(timeout=5)
            return b"image", url
        with patch.object(scrape, "candidates", side_effect=source), patch.object(scrape, "download", side_effect=fetch):
            iterator = scrape.parallel_candidates(None, "query", args, set())
            try:
                first = next(iterator)
                self.assertNotEqual(first[1]["url"], "0")
            finally:
                release.set()
                iterator.close()
