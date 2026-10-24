# Identification API troubleshooting

The 24 October scanner failure was reproduced against the configured API using a synthetic bottle description: a simple generation request succeeded (HTTP 200), but the full Zod-generated scan schema was rejected (HTTP 400 INVALID_ARGUMENT). The model and key did not need replacing.

The scanner now sends a reduced provider schema without `$schema`, `additionalProperties`, `minLength` or `maxLength`, and caps its array at 16 objects. The application retains the original Zod validation after generation; local length/material checks and scan-safety filtering remain enforced. The reduced schema was verified with a real generation request and validated locally. These changes follow Google's documented subset-schema approach: https://ai.google.dev/gemini-api/docs/generate-content/structured-output

Provider failures now distinguish rejected credentials, unavailable models, quota exhaustion, rejected formats and temporary outages. Responses never echo raw upstream errors or API keys. Server logs record only upstream status and model. Check server logs and API access/quota when troubleshooting; never paste secrets into chat or commit `.env.local`.
