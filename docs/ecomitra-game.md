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
| C | Switch between isometric and high overhead cameras |
| P / Escape | Pause / resume |
| R | Rescue to the nearest road intersection |
| F | Toggle browser fullscreen |
| Enter | Start, resume or replay |

The driving HUD contains a compact timer / score / progress bar, a small corner map and a nearest-pickup chip. The collect button appears only within collection range; brief action feedback disappears automatically. The full category breakdown is available through the map or pause screen, and sound / fullscreen settings are in the pause menu. There is no persistent mission panel or bottom keybind strip.

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
