# Hackathon scan and collection policy

The image/text identification request explicitly asks for up to 16 distinct objects in the same scene. Each object is labelled waste, not waste, or uncertain. People, faces, body parts and animals are excluded by the model instruction; an additional server guard removes human-labelled items. Non-waste objects are disabled in review and rejected by confirmation on the server. Uncertain objects require the user to actively select them. Empty results cannot be confirmed or earn scan rewards. Missing classification is treated as uncertain.

This is application support for 16 objects, not a measured claim that every photograph will identify all 16 correctly. Occlusion, lighting and incorrect AI labels still require user review; no new multi-object model benchmark was run.

During the hackathon only, booking accepts any minute from 00:00 through 23:59 IST. The 2–5 pm break and all evening surge charges are disabled in pricing and server validation. Existing historical receipts retain their original recorded amounts. New bookings default to **Next available helper**. Arrival stays pending until a helper is assigned and shares a fresh fix. The server records the earliest requested time five minutes ahead, including date rollover; this is queue timing, not a promised arrival. Users can switch to Choose a time; that form initializes 15 minutes ahead and requires a future appointment within 30 days. Once assigned, a fresh helper location supplies the separate live approximate arrival range described in `helper-location-tracking.md`.

Basic stays at its existing price and 2 kg allowance. Existing measured sorting/excess-weight rules remain in effect. The hackathon time policy does not imply guaranteed helper availability around the clock.
