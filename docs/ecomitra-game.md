# EcoMitra Circular City — first playable iteration

Open `/game` on the website, or `http://localhost:3001/game` while the local app is running. An account and an Operations-issued personal game pass are required; camera and model API keys are not used. MongoDB stores the access window. This is a single-player browser game built with Three.js and the Blender city/truck assets. It does not award Discovery Points, pickup credits or real-world benefits.

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
| C | Switch third-person chase / first-person driving |
| V | Open the 360° free-look camera |
| J / L; I / K; + / − | Orbit, tilt and zoom the 360° camera |
| Cursor position / wheel | Look around without clicking / zoom in 360° mode |
| P / Escape | Pause / resume |
| R | Rescue to the nearest road intersection |
| F | Toggle browser fullscreen |
| Enter | Start, resume or replay |

The driving HUD contains a compact timer / score / progress bar, a small circular, truck-centred radar with a north indicator and an off-screen target arrow and a nearest-pickup chip. The collect button appears only within collection range; brief action feedback disappears automatically. The full category breakdown is available through the map or pause screen, and sound / fullscreen settings are in the pause menu. There is no persistent mission panel or bottom keybind strip.

Buttons are provided for collection, sound, fullscreen and pause. Touch devices and viewports under 900 pixels use a steering pad and separate hold-to-drive pedals. Keyboard on a large display remains supported. There is no controller or TV remote support in this iteration. Losing window focus or hiding the tab pauses play and clears held movement keys.

## Score and ending

Organic, plastic and paper are worth 100 game points each; glass and metal 150; e-waste 200. A complete round adds 5 points per whole remaining second. An incomplete round has no time bonus. The same pickup cannot score twice, and collecting more than a category target does not score.

The end screen presents the truck on a separate platform with animated confetti, the score, category counts, remaining time and the local best. The best is stored in this browser's local storage. **Save my story card** generates a 1080 × 1920 PNG locally, using the actual round score and category totals. It is a download, not an automatic social-media post. The card labels its results as simulated game collection.

## Technical scope

- `/src/app/game/game-engine.ts`: WebGL renderer, asset lifecycle, delta-time driving, collision checks, nearest target, optional synthesized collection sounds, pause, cameras and finish scene.
- `/src/app/game/page.tsx`: title screen, HUD, SVG maps, mission progress, pause menu, end screen, local best and portrait PNG export.
- `/src/lib/collection-game-rules.ts`: deterministic collection, scoring and bounding-box collision rules.
- `/public/game/`: city GLB, truck GLB, map data and truck render, served locally with the app.
- `docs/ecomitra-game-map.md`: editable map source, district details and coordinate conventions.

The GLB city has approximately 79,000 triangles; the detailed truck adds about 40,000. Pixel ratio is capped at 1.5. Buildings, stalls, containers and sorting bays have approximate box collision, and movement stops at the playable city boundary. The truck uses a planar capsule with substepped collision response against building footprints, city boundaries, streetlights, benches, sorting stations and traffic. Trees and remaining baked scenery do not all have collision. Truck movement is arcade-style; suspension, wheel-to-ground terrain physics, gamepad input, multiplayer, cloud scoreboards and mobile performance certification remain future work. No specific TV frame rate is claimed.

The installed Next.js client-component and lazy-loading guides were consulted for the touch update. This route uses client components, imports the WebGL engine in an effect, and disposes of frames, listeners, audio, geometry and materials on unmount.

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

Third-person chase is the default camera. C switches between third person and a first-person driver viewpoint; V opens the separate 360° orbit camera. Moving the mouse cursor across the world controls a full 360° horizontal orbit; cursor height controls camera elevation. No mouse press is required; a stationary click does not change the camera. Drag gestures have no separate camera action. Scroll/pinch zooms; J/L orbit, I/K tilt and +/− zoom provide keyboard alternatives. The default camera is closer to the truck for an arcade chase view. Distance and elevation are bounded. A compact TPP/FPP button is available during play, with the camera name and free-look selector in the pause menu. Controls are disposed on unmount and are disabled behind pause and map screens. Camera occlusion against buildings is not simulated.

Rendering uses procedurally textured darker asphalt, reflective windows, a warm directional light, environment reflections, reduced exposure, a 2048-pixel shadow map centred on the truck and shadow receivers on the city / finish platform. Shadows cover the nearby scene, not the entire 800-metre map. The radar displays a local 250-metre diameter area; the full M map retains the entire city and collection totals.

`engine-audio.ts` synthesizes a low-pass-filtered layered motor. Pitch and volume follow throttle, speed and simulated gear changes. Sound starts only after a gesture, fades on pause / finish / mute, and releases its audio context on unmount. This is synthesized sound, not a recorded truck engine.

At the end of a round, **Email my result** reveals an optional email form. `/api/game-result` validates the address, category counts and remaining time, recomputes the game score, generates a 1080 × 1920 PNG with Sharp and emails the result and attachment using the existing SMTP service. Sending requires the existing MongoDB and `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `APP_URL` configuration; playing and downloading a card work without these services. No new provider or credentials are required when app mail already works.

The endpoint rejects cross-origin requests and oversized / malformed payloads. MongoDB's existing TTL-indexed `auth_attempts` collection limits sending to three attempts per recipient per hour and twelve per source IP per hour. It stores hashed bucket identifiers rather than raw addresses or IPs, and expires them after two hours. No email addresses or results are added to a marketing list. Scores remain self-reported game results and are not verified competition entries.

Upgrade validation: focused tests cover email payload bounds, score recomputation and real PNG dimensions; invalid-address and cross-origin HTTP requests were rejected; SMTP connection and authentication were verified without sending an email. Inbox delivery is not independently confirmed. Browser checks cover collection, keyboard orbit rotation, circular radar, pause and the optional email form.


## Touch driving and living city

Touch controls replace the old four-arrow buttons:

- Left steering pad: horizontal analog steering with a 10% dead zone. Slide with your thumb; releasing returns steering to centre.
- Hold **GO** to accelerate. Hold **BRAKE** to stop; braking overrides acceleration. Hold **REVERSE** to back up.
- The collect button appears above the pedals only when within pickup range. Slow down first; the button indicates when braking is needed.
- Swipe the uncovered 3D world to look around in 360° camera mode. A stationary tap does not rotate it. Two-finger gestures retain OrbitControls zoom. Touch driving gently returns the camera behind the truck four seconds after the last camera swipe.

Controls support independent pointer IDs and pointer capture. Release, cancellation, lost capture, window blur, visibility changes, pause, map opening and unmount clear held inputs. Thumb controls respect safe-area insets, and portrait / landscape layouts put the radar above the pedals. The short-height start screen scrolls so its start button stays reachable. Keyboard, cursor-based camera and TV HUD remain available.

`city-life.ts` adds 18 animated cars, 36 walking figures, 12 birds, 50 streetlights, three shelters with benches and 44 moving market flags. Cars follow closed road loops and stop near the player; people stay on paths around blocks. Traffic cars have kinematic collision footprints: they yield and block the truck rather than being physically pushed. Walking people, birds and flags remain decorative; there is no pedestrian damage or traffic enforcement. Streetlights are geometry with emissive panels, not dozens of real-time point lights. Traffic, walkers, flags and birds stop when the round is paused, and the entire ambience group is hidden during the finish presentation. A short coloured particle burst marks each collected pickup.

Actors use instanced meshes and shared geometry / materials; resources are released on disposal. Coarse-pointer devices use a 1.25 pixel-ratio cap and 1024-pixel shadows, compared with 1.5 / 2048 on desktop. Actual performance and multi-touch feel still need testing on physical phones; viewport inspection is not a device benchmark.

Touch validation includes simultaneous independent input state, release / reset behaviour, opposing pedals and steering bounds / dead zone. Browser checks include holding GO, braking, collecting with the mobile button, steering-pad release and portrait / landscape spacing.


## Collisions and street interactions

The truck now has a three-circle capsule footprint, resolving contacts with normal impulses, a small rebound, surface friction and lateral slip. Physics uses substeps limiting movement to 0.22 m, with three contact-resolution passes per substep. Buildings and world edges are static. Cars are oriented kinematic obstacles, while 28 roadside cones and crates receive momentum, slide, lean and settle. Static streetlight poles and shelter benches also block driving. These are planar arcade physics, not full 3D rigid-body suspension or crash simulation. Truck steering is player controlled; no crash damage is simulated. R resets truck velocity at a road intersection.

Three sorting stops are shown as cyan squares on the map. Stop nearby and press E (or the contextual touch button) after collecting waste to check your cargo and earn up to ten extra seconds. Each stop works once per round; the timer never exceeds five minutes. Cargo stays on the truck and all original twelve pickup targets remain required. This is a game time reward, not a real disposal credit. A nearby collection takes priority over a sorting stop. Props, stop visits and animations reset on replay; physics and stop animation pause with the game. The HUD only adds a contextual action, without a persistent extra panel.

Audio is explicitly unlocked from Play and retried on Resume and subsequent pointer / keyboard gestures if the browser suspends it. Engine volume and upper harmonics are increased for small speakers. A compact sound control remains visible while driving; when audio is enabled but the context is not running, it offers **Enable game sound** rather than falsely showing active playback. Browser or OS mute and the device's output route remain outside the game's control. Collection and collision cues still respect the game's mute setting. No external sound download is needed.

Verification: tests cover fast impacts against a thin wall, tangential sliding, momentum transfer to props, rotated world-boundary collisions, zero delta and sorting reward repeat/cargo/time limits. Mocked audio tests cover suspended-context retry, mute, motor gain and disposal; these cannot certify audibility on a physical TV. Existing score/email rules remain unchanged, since sorting changes remaining time instead of adding unvalidated score fields.

Live deployment verification found that a focused sound button could receive Space as a second click rather than a brake input. In-round buttons now release focus after activation so driving keys return to the game. Sound enable/mute and braking after clicking a control were rechecked in the browser.

## Stall access

Only the driving game at /game is access controlled. The quiz at /quiz remains open. See docs/game-access.md for staff checks, issue/revoke controls, thirty-minute access and verification. The five-minute round clock is separate from the thirty-minute account pass; pausing a round does not pause the pass.


## Licensed environment and exploration update

Selected models from Kenney City Kit (Suburban), Nature Kit, Car Kit and Mini Characters replace plain building façades, traffic cars, roadside trees and walking figures. Their official source pages and the supplied CC0 notices are recorded in public/game/ASSET-LICENSES.txt. Asset URLs are local: there are no third-party asset requests while playing.

The reusable Blender source in assets/3d/city-pack/build-pack.py packs sixteen selected environment models into city-assets.glb (about 922 KB). Two pedestrian GLBs retain their rigging and walk animations; their image textures are embedded. All three new downloads together are roughly 1.5 MB. The existing branded EcoMitra truck is retained, with improved metal and glass response. Environment props and traffic use instanced meshes; 36 pedestrian skeletons are cloned and animated independently. Traffic retains its collision footprints. Pedestrians and vegetation are decorative.

Building replacement removes only original triangles inside building footprints above ground level. It preserves roads, ground, pickup nodes, market stalls and the existing collision data. This is an approximate footprint collision system, not collision against every fence and roof. New models fit within those footprints. Unit tests check ground/pickup preservation and placement bounds. The original map still loads if optional asset downloads fail; that fallback retains the simpler visuals.

Six gold Eco Trail arches encourage exploration. Driving through one gives up to five seconds once per round, capped at the five-minute round duration. Visited gates disappear from the scene and map. The fountain in Central Gardens animates during play and has a static collision footprint. Existing sorting stops, movable cones/crates, birds, flags and collection missions remain. These activities add time, not separate score fields or Discovery Points.

The compact analog speedometer displays 0–100 km/h, a moving needle, numeric speed and D/N/R. C or the top camera button switches TPP/FPP; V or the pause menu opens free look. First-person uses a driver-height forward view and hides the external truck mesh to avoid an opaque windshield blocking the camera. A subtle screen edge suggests the cab; it is not a modeled interactive cockpit. Third-person follows behind the truck and keeps its branded body in view. Camera and needle helpers have deterministic tests, including turn direction, clamping and the camera-toggle sequence. Portrait/landscape controls and a physical TV/phone still require device-specific performance checks; no frame-rate guarantee is made.

Sources: [Kenney City Kit (Suburban)](https://kenney.nl/assets/city-kit-suburban), [Nature Kit](https://kenney.nl/assets/nature-kit), [Car Kit](https://kenney.nl/assets/car-kit), [Mini Characters](https://kenney.nl/assets/mini-characters).

Roof replacement regression: the old map roofs extend 0.75 m past their wall footprints, with windows/entrances also projecting beyond the wall face. The mask includes a 1.1 m apron to remove these old floating upper faces before drawing the detailed building. A fixture checks that projecting roof rims and windows disappear while the ground and collectible geometry remain intact. Asset tests also validate glTF containers, embedded texture references, required prefab roots and pedestrian walking clips.
