# EcoMitra Circular City — first playable iteration

Open `/game` on the website, or `http://localhost:3001/game` while the local app is running. No sign-in, camera, API keys or database are required. This is a keyboard-driven, single-player browser game built with Three.js and the Blender city/truck assets. It does not award Discovery Points, pickup credits or real-world benefits.

## Round

You have five minutes to collect **12 pickups**: 3 organic, 3 plastic, 2 paper, 1 metal, 2 glass and 1 e-waste. The nearest still-needed pickup has a coloured ground ring and a light beam. Drive within 20 metres, slow below 8 metres/second and press E. The broad interaction range lets players reach roadside pickups without driving through buildings. Categories disappear from the active map when their targets are met.

The 800 × 800 metre city has nine districts and 144 possible pickup locations. Positions and categories are fixed in this iteration, so repeated rounds can be compared. The round finishes when all targets are collected, time expires, or the player chooses **Finish this round** in the pause menu. There is no return-to-hub requirement yet.

| Control | Action |
| --- | --- |
| W / Up | Accelerate |
| S / Down | Reverse / slow forward movement |
| A, D / Left, Right | Steer; steering direction reverses when backing up |
| Space | Brake |
| E | Collect the nearest eligible pickup |
| M | Open / close city map; clock pauses |
| C | Cycle isometric, overhead and 360° orbit cameras |
| J / L; I / K; + / − | Orbit, tilt and zoom the 360° camera |
| Cursor position / wheel | Look around without clicking / zoom in 360° mode |
| P / Escape | Pause / resume |
| R | Rescue to the nearest road intersection |
| F | Toggle browser fullscreen |
| Enter | Start, resume or replay |

The driving HUD contains a compact timer / score / progress bar, a small circular, truck-centred radar with a north indicator and an off-screen target arrow and a nearest-pickup chip. The collect button appears only within collection range; brief action feedback disappears automatically. The full category breakdown is available through the map or pause screen, and sound / fullscreen settings are in the pause menu. There is no persistent mission panel or bottom keybind strip.

Buttons are provided for collection, sound, fullscreen and pause. Basic touch driving buttons appear on small screens, but keyboard on a large display is the primary experience. There is no controller or TV remote support in this iteration. Losing window focus or hiding the tab pauses play and clears held movement keys.

## Score and ending

Organic, plastic and paper are worth 100 game points each; glass and metal 150; e-waste 200. A complete round adds 5 points per whole remaining second. An incomplete round has no time bonus. The same pickup cannot score twice, and collecting more than a category target does not score.

The end screen presents the truck on a separate platform with animated confetti, the score, category counts, remaining time and the local best. The best is stored in this browser's local storage. **Save my story card** generates a 1080 × 1920 PNG locally, using the actual round score and category totals. It is a download, not an automatic social-media post. The card labels its results as simulated game collection.

## Technical scope

- `/src/app/game/game-engine.ts`: WebGL renderer, asset lifecycle, delta-time driving, collision checks, nearest target, optional synthesized collection sounds, pause, cameras and finish scene.
- `/src/app/game/page.tsx`: title screen, HUD, SVG maps, mission progress, pause menu, end screen, local best and portrait PNG export.
- `/src/lib/collection-game-rules.ts`: deterministic collection, scoring and bounding-box collision rules.
- `/public/game/`: city GLB, truck GLB, map data and truck render, served locally with the app.
- `docs/ecomitra-game-map.md`: editable map source, district details and coordinate conventions.

The GLB city has approximately 79,000 triangles; the detailed truck adds about 40,000. Pixel ratio is capped at 1.5. Buildings, stalls, containers and sorting bays have approximate box collision, and movement stops at the playable city boundary. Trees, benches and small scenery do not have physical collision. Truck movement is arcade-style; suspension, wheel-to-ground terrain physics, traffic, gamepad input, multiplayer, cloud scoreboards and mobile performance certification are future work. No specific TV frame rate is claimed.

The Next.js package installed in this workspace does not include the `dist/docs/` guide mentioned in its generated AGENTS instructions. This route uses a client component, dynamically imports the WebGL engine in an effect, and disposes of frames, listeners, audio, geometry and materials on unmount.

## Verification

- Blender reimport: nine districts, all 144 named pickup roots, six waste types, matching coordinates and metadata, 133 box colliders; studio lights and cameras excluded from GLB.
- Focused rules tests: duplicate collection, mission target caps, conditional time bonus and collision / boundary behaviour.
- Browser: start, keyboard driving, braking, successful collection, duplicate prevention, map and pause, early finish, local score display and story-card generation.
- Full-HD 1920 × 1080 and narrow-screen UI inspected. This is layout verification, not benchmarking on a physical TV.
- TypeScript and production build checked before delivery.

Run from `web-app/`:

```sh
npm run dev -- --port 3001
npm run typecheck
npx tsx --test src/lib/collection-game-rules.test.ts
npm run build
```


## Graphics, camera, sound and email upgrade

The default 360° orbit camera follows the truck while preserving the player's chosen angle. Moving the mouse cursor across the world controls a full 360° horizontal orbit; cursor height controls camera elevation. No mouse press is required; a stationary click does not change the camera. Drag gestures have no separate camera action. Scroll/pinch zooms; J/L orbit, I/K tilt and +/− zoom provide keyboard alternatives. The default camera is closer to the truck for an arcade chase view. Distance and elevation are bounded. C cycles all three camera modes; the pause menu also shows a camera selector. Controls are disposed on unmount and are disabled behind pause and map screens. Camera occlusion against buildings is not simulated.

Rendering uses procedurally textured darker asphalt, reflective windows, a warm directional light, environment reflections, reduced exposure, a 2048-pixel shadow map centred on the truck and shadow receivers on the city / finish platform. Shadows cover the nearby scene, not the entire 800-metre map. The radar displays a local 250-metre diameter area; the full M map retains the entire city and collection totals.

`engine-audio.ts` synthesizes a low-pass-filtered layered motor. Pitch and volume follow throttle, speed and simulated gear changes. Sound starts only after a gesture, fades on pause / finish / mute, and releases its audio context on unmount. This is synthesized sound, not a recorded truck engine.

At the end of a round, **Email my result** reveals an optional email form. `/api/game-result` validates the address, category counts and remaining time, recomputes the game score, generates a 1080 × 1920 PNG with Sharp and emails the result and attachment using the existing SMTP service. Sending requires the existing MongoDB and `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `APP_URL` configuration; playing and downloading a card work without these services. No new provider or credentials are required when app mail already works.

The endpoint rejects cross-origin requests and oversized / malformed payloads. MongoDB's existing TTL-indexed `auth_attempts` collection limits sending to three attempts per recipient per hour and twelve per source IP per hour. It stores hashed bucket identifiers rather than raw addresses or IPs, and expires them after two hours. No email addresses or results are added to a marketing list. Scores remain self-reported game results and are not verified competition entries.

Upgrade validation: focused tests cover email payload bounds, score recomputation and real PNG dimensions; invalid-address and cross-origin HTTP requests were rejected; SMTP connection and authentication were verified without sending an email. Inbox delivery is not independently confirmed. Browser checks cover collection, keyboard orbit rotation, circular radar, pause and the optional email form.
