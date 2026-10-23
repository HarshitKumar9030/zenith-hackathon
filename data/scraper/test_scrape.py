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
