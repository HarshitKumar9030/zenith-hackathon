# Scanner latency and reliability

Updated 26 October 2026.

The scanner uses one structured Gemini request per identification. Gemini 3 requests now explicitly use LOW thinking while retaining HIGH image resolution. This reduces the requested reasoning effort without sacrificing the visual token budget for small objects. Other configured model families retain their existing settings. Keep the 8192 output-token ceiling for crowded scenes; this is a ceiling, not a request to generate that many tokens.

Sources: [Google's thinking-level guidance](https://developers.googleblog.com/en/new-gemini-api-updates-for-gemini-3/), [Generate Content media resolution](https://ai.google.dev/gemini-api/docs/generate-content/media-resolution). Lower reasoning effort can affect difficult scenes; evaluate it against the previous configuration before making accuracy claims.

Both live frames and uploads now preserve up to 1600 pixels on their longest side at JPEG quality 0.88, without upscaling. Live frames previously used 1280 pixels / 0.8. This gives small objects more detail but can slightly increase live upload time. No extra model call or automatic OCR pass has been added; optional OCR still costs additional processing time.

The prompt asks for concise evidence, a consistency/duplicate check, and abstention on blur, hidden contents and ambiguous materials. Incomplete/blocked/truncated provider responses are rejected rather than saved as successful scans. Timeouts have an explicit retry message. Human review, person filtering, non-waste classification and special handling checks remain active. The experimental local model is not part of the identification path.

Verification: unit tests cover resolution bounds, portrait/landscape/no-upscale cases, model-specific generation settings and legacy fallback. These are engineering checks, not a visual accuracy benchmark.

Before reporting a percentage improvement, compare the old and new settings on the same consented held-out photographs: clean single items, 16-object scenes, mixed packaging, people/belongings, blur, low light and hazardous items. Record per-item precision/recall, false waste labels, special-handling misses, abstention and capture-to-result p50/p95 latency. Use reviewed ground truth and repeat latency runs; provider load varies. Do not call prompt changes or unit-test passes proof of extreme accuracy. No new visual benchmark or real-provider latency measurement was performed for this change.

Live provider compatibility smoke: one synthetic text-description request using the configured model and new generation settings returned HTTP 200, STOP and Zod-valid identification in 3050 ms. No photograph was submitted. This single observation is not an image latency benchmark, a before/after comparison or an accuracy result. All 67 unit tests, TypeScript checks and the production build passed.
