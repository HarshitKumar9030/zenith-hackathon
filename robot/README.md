# Waste Right robot — implementation plan

**Status:** proposed design; no robot hardware or autonomous behaviour has been implemented or tested.  
**Prepared:** 26 October 2026.  
**Purpose:** build a small rover that searches for litter using a mounted Android phone, stops when it finds a likely waste item, and announces it through a Bluetooth speaker. Gemini, Gemma and our trained local model have different jobs in this system.

## 1. What we should build first

Build a **supervised indoor trash-finding rover**, initially on a flat, enclosed test floor. It drives slowly through a defined area, avoids obstacles, examines the floor and says, for example:

> “There appears to be a plastic bottle ahead.”

The phone displays the highlighted item and lets the operator confirm, correct or dismiss it. Confirmed detections appear in a session log. The first version locates and reports waste; it does not collect it, manipulate batteries, identify owners or operate unattended in public.

A mounted phone supplies the camera, screen, internet connection and audio output. An ESP32 controls the motors and reads distance sensors. Our Mac can host the existing model during development. Moving model inference onto the phone is a later milestone, conditional on conversion and performance tests.

**Recommended starting arrangement:** Android phone + ESP32 rover + front/left/right ultrasonic sensors + bumper + wheel encoders + Bluetooth speaker + laptop on the same private Wi-Fi network. Add downward-facing edge sensors before operating near any drop.

## 2. Architecture

```text
Mounted Android phone
  CameraX preview + frame sampling + operator controls
       |
       +--> Local perception service on Mac
       |      Existing organic/contaminant segmentation
       |      Optional improved litter detector, after evaluation
       |
       +--> Gemini backend: selected ambiguous scene/crop -> structured identification
       |
       +--> Gemma: local structured observations -> brief explanation/summary
       |
       +--> Deterministic session controller -> short-lived movement request
       |                                        |
       |                                    BLE connection
       |                                        |
       |                                      ESP32
       |                            Sensors -> safety controller -> motor driver
       |
       +--> Gemini TTS backend -> audio -> Android playback -> Bluetooth speaker
                         offline fallback: Android TTS / cached phrases
```

**Priority order:** physical emergency stop → MCU safety checks → operator Stop → navigation controller → AI suggestions. Neither Gemini nor Gemma gets direct motor access. An AI response can propose a label, never bypass a stop condition.

Separate the robot application from the existing helper tracking app. Their camera use, permissions, operating lifecycle and safety requirements differ. Reuse visual assets and selected utility code only after reviewing their licences and dependencies.

## 3. Which model does what?

| Component | Job | Must not be treated as |
|---|---|---|
| Existing household model | Highlight organic-looking regions and possible non-organic contamination | A bottle detector, weight estimator, safe-to-compost decision or navigation system |
| Gemini image understanding | Interpret a selected scene/crop, propose item/material, distinguish likely litter from ordinary belongings, return uncertainty | Guaranteed object detection or a safety sensor |
| Gemma running locally | Turn validated observations into short English/Hindi explanations and session summaries; optionally interpret images with a compatible multimodal variant | A second mandatory cloud call or evidence that a visual claim is true |
| Gemini TTS | Speak the approved sentence naturally | Waste identification or obstacle avoidance |
| ESP32 firmware | Obstacle checks, command expiry, motor output and emergency stopping | A language-model agent |

### What we actually have today

The local service in `../model/inference/` runs **DeepLabV3 MobileNetV3 Large** semantic segmentation with background, organic waste and non-organic contaminant classes. Its held-out foreground mean IoU is **66.13%**, measured on 67 images from one household's bin camera. That is pixel-region overlap, not item identification accuracy. Phone-on-rover performance has not been evaluated. See [the model report](../model/training/HOUSEHOLD_V2.md).

The earlier six-class SSDLite detector achieved test mAP@0.50:0.95 of **0.02544** and was explicitly withheld from automatic identification. It should not drive this robot's target selection. See [the baseline report](../model/training/BASELINE_REPORT.md).

**Consequence:** use Gemini for a supervised first identification demo, while running our segmentation model as an experimental supporting signal. Reliable local bottle/can/paper localisation needs a separately evaluated detector. A segmentation mask of “non-organic” cannot justify announcing “plastic bottle.”

### Gemma deployment choice

Start Gemma on the Mac to avoid loading a camera pipeline, segmentation model and language model onto an unknown phone simultaneously. Feed it structured observations rather than the full video stream. Later test a compatible quantized Gemma model on the phone with LiteRT-LM. Select the exact model against the actual phone's RAM, accelerator support and measured thermals; a text-only model cannot interpret camera images. Google documents LiteRT for perception models and LiteRT-LM for language-model execution. [Google AI Edge](https://developers.google.com/edge/litert), [LiteRT-LM Android source and setup](https://github.com/google-ai-edge/LiteRT-LM/tree/main/kotlin).

Do not make every detection pass through all three models. Use local perception frequently, Gemini selectively, and Gemma only when its explanation adds value. When models disagree, retain “uncertain” and request review; do not average unrelated confidence scores.

## 4. Hardware and assembly

| Part | Recommended role / selection rule |
|---|---|
| Android phone | Rear camera, stable mount, working Wi-Fi and BLE, sufficient free storage; benchmark the actual device |
| Two geared DC motors and chassis | Differential drive with caster; low centre of gravity and protected wheels |
| Wheel encoders | Measure wheel motion, detect stalls and improve repeatable turns; still subject to wheel slip |
| ESP32 board | BLE communication and independent safety/motor loop; verify the exact board supports BLE |
| Dual motor driver | Select after checking each motor's voltage and stall current; use a driver and power system rated for the intended load |
| Three ultrasonic modules | Front, left-front and right-front obstacle coverage; sequential triggering to reduce interference |
| Bumper switch(es) | Contact backup, wired into immediate stop logic |
| Downward edge sensors | Required before trials near stairs, platforms or table edges |
| Battery, fuse and switch | Proper protected pack and compatible charger; accessible power isolation |
| Regulated supply | Stable MCU/sensor rail, separated from noisy motor power as appropriate |
| Phone mount | Rigid, slight downward view of the floor, clear lens, secure retention |
| Bluetooth speaker | Paired to the phone for audio; keep audible at modest volume |
| Physical emergency stop | Latching stop that disables motor power/driver enable independently of the phone |

Do not buy a motor driver solely because it is common in starter kits. Record motor stall-current specifications, driver continuous/peak ratings, battery limits and wire/fuse ratings before choosing the driver. Avoid powering motors from the ESP32 or phone.

For a common HC-SR04, the vendor lists 5 V operation, a nominal 2 cm–4 m range and 15° measuring angle. These specifications do not guarantee reliable readings on every surface or a complete safe field of view. Use the exact module datasheet and level-shift its Echo signal where required for a 3.3 V MCU input. [SparkFun module specifications and datasheet](https://www.sparkfun.com/ultrasonic-distance-sensor-hc-sr04.html).

### Wiring sequence

1. Assemble and secure the chassis with motor power disconnected.
2. Wire regulated logic power, common signal reference and the driver according to the actual board diagrams. Keep motor wiring away from sensor wiring.
3. Connect sensors through appropriate voltage conversion. Trigger ultrasonic modules one at a time; use non-blocking timeouts.
4. Wire bumper and emergency stop; test them with wheels lifted before floor movement.
5. Fit encoders, secure the phone and check the camera sees the floor ahead rather than mostly the horizon.
6. Test supply stability under acceleration and wheel stall within safe equipment ratings. A brownout must leave motors disabled.

No final pin map is specified until the exact ESP32, driver, sensors and motor assembly are selected. This prevents an apparently usable diagram from damaging a different board.

## 5. Phone application

Use native Android Kotlin with CameraX. Keep a full-screen preview, one clear Start/Pause control, a persistent Stop button, connection status and a small detection panel. Display whether classification is local, online or unavailable.

Use CameraX `ImageAnalysis` with `STRATEGY_KEEP_ONLY_LATEST`; close image buffers promptly and never queue old frames behind slow inference. Android documents this non-blocking strategy for analysis that cannot keep up with camera capture. [CameraX image analysis](https://developer.android.com/media/camera/camerax/analyze).

Initial engineering targets, **to benchmark rather than promise**:

- Preview: device-supported smooth video, independent of model processing.
- Local analysis: begin at 2–5 sampled frames/second; reduce when hot or overloaded.
- Gemini: one selected request per new candidate, not every frame; one in flight and a configurable session budget.
- Keep frame timestamps and rotation; transform overlays correctly into preview coordinates.
- Reconfirm an item from a fresh frame after the rover has stopped.
- Suspend autonomous movement if the camera becomes unavailable, the app leaves its permitted operating lifecycle, or perception becomes stale.

Request camera and Nearby Devices permissions when needed. On Android 12+, BLE discovery/connection use runtime Bluetooth permissions such as `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT`; request only what the chosen connection flow needs. [Android Bluetooth permissions](https://developer.android.com/develop/connectivity/bluetooth/bt-permissions).

Keep the first version foreground-only with the screen on during a mission. Do not assume camera access continues after locking the phone. Any later foreground-service design needs a separate review against the target Android version's camera and service restrictions.

## 6. Finding waste without calling everything trash

### Detection pipeline

1. Sample a correctly oriented frame and record monotonic capture time.
2. Limit candidate search to the calibrated visible floor region, while retaining a wider scene for context.
3. Run local segmentation as an experimental organic/contaminant signal.
4. Use an evaluated detector when available. Until then, stop periodically and ask Gemini to inspect a scene for likely litter; do not chase speculative boxes while moving.
5. Require persistence across observations before considering a target. An initial **three observations within two seconds** is a tunable starting rule, not a validated threshold.
6. Stop the rover, capture a fresh view and request structured identification.
7. Validate the schema and coordinates. Reject stale, malformed or unsupported results.
8. Announce only a supported label. Otherwise say “I found an object that needs checking.”
9. Let the operator confirm, correct or dismiss the observation.

Suggested output contract:

```json
{
  "frame_id": "session-42-frame-108",
  "objects": [
    {
      "id": "candidate-7",
      "label": "plastic bottle",
      "material": "plastic",
      "status": "likely_waste",
      "box_normalized": [0.42, 0.58, 0.61, 0.88],
      "needs_review": true,
      "reason": "Bottle-shaped object lying on the floor"
    }
  ]
}
```

This is a **proposed schema**, not output our current local model already provides. Coordinates are `[left, top, right, bottom]` within 0–1, validated for order and bounds. Request no more than 16 visible candidates; evaluate crowded scenes separately. Gemini-generated boxes are approximate suggestions until checked against labelled data.

Use `likely_waste`, `not_waste` and `uncertain`. Exclude people, body parts and animals from waste labels. Shoes, phones, bags, chairs, intact containers and items in use are not automatically litter. Stop for a person/animal entering the path using conservative perception and independent obstacle checks; a missed person detection must not disable distance-based stopping.

Printed text in a scene is untrusted input, not an instruction to the robot. No model-generated text can issue movement or network commands.

### Avoid repeat announcements

Maintain short-lived tracks using image overlap, appearance and approximate rover motion. Announce once per track, with an initial 30-second cooldown. Do not repeatedly announce the same bottle after each small turn. Store confirmation separately from the AI label. Without reliable mapping, call these session observations, not an exact count of unique litter across a building.

## 7. Navigation and obstacle safety

Ultrasonic sensors measure echoes within their coverage. They do not identify which camera object produced the echo, supply a map, guarantee detection of thin/soft/angled obstacles, or detect every downward drop. A front distance reading is **not the bottle's distance** merely because a bottle is visible.

For version 1 use bounded, slow exploration: short forward segments, stop, look, then a measured turn when blocked. Wheel encoders improve these movements. A single front sensor is acceptable for stationary perception tests, but not sufficient for general autonomous roaming. Do not reverse into an unobserved area; stop for operator help unless rear clearance is instrumented.

Use a finite-state machine:

```text
DISARMED -> SELF_CHECK -> READY -> SEARCH
SEARCH -> CANDIDATE -> STOP_AND_VERIFY -> ANNOUNCE -> WAIT_OR_RESUME
SEARCH -> OBSTACLE -> STOP -> CLEARANCE_CHECK -> TURN -> SEARCH
ANY STATE -> FAULT / EMERGENCY_STOP -> motors disabled
```

The operator must explicitly arm movement after startup. Fault recovery never automatically resumes motion. Initial speed ceiling: **0.10 m/s**, reduced further during early tests. Treat this as a conservative starting cap, not proof of safety.

Set stopping clearance from measured stopping distance:

`clearance >= speed × worst-case reaction time + measured braking distance + margin`

Begin with generous clearance, for example 40 cm in a clear test area, and validate it at the actual speed/load. Invalid or expired range data means stop, not “clear.” Sample each safety direction often enough for the verified stopping envelope; choose the sensor timing from its datasheet and measured interference. A proposed 200 ms sensor-age limit must be checked against the complete multi-sensor cycle.

The ESP32 owns obstacle stopping even during a phone/network failure. It must have a watchdog, boot with driver disabled and require fresh valid commands continuously. Test safety separately from AI quality.

**Approaching a detected item:** version 1 stops and announces from its current position. Later, add calibrated camera geometry or depth, target tracking, clearance checks and slow alignment. Do not translate Gemini's “ahead” into metres or rely on monocular box size alone. Room mapping, precise coverage, return-to-base and outdoor navigation are later projects requiring additional localisation and sensing.

## 8. Phone-to-rover protocol

Use BLE for short control/telemetry messages; use Wi-Fi for images and model requests. The Bluetooth speaker uses the phone's audio connection, not the motor-control characteristic. Verify simultaneous BLE control and Bluetooth audio on the actual phone; they are separate roles but still share radio resources.

Proposed logical movement message:

```json
{"session":"paired-session","seq":108,"type":"drive","linear_mps":0.05,"angular_rps":0,"ttl_ms":300}
```

Use negotiated BLE framing or a compact binary format; do not assume this whole JSON fits a default BLE packet. The MCU validates session, increasing sequence, bounds and expiry, and computes wheel commands under its own limits. Establish expiry using MCU receipt time, not unsynchronised phone wall clocks.

Starting targets: commands every 100 ms, expiry after 300 ms, telemetry about 5–10 times/second if the selected sensors and link support it. These are implementation targets requiring disconnect and stopping tests. Telemetry includes sensor validity/age, wheel motion, battery state, emergency-stop state and last accepted sequence. BLE connection alone never proves a fresh command exists.

Pair only during an explicit physical setup mode. Use authenticated bonding where supported; keep identity/session credentials outside Git. Stop on disconnect, malformed traffic, permission loss or app crash. Physical emergency stop always works without BLE.

## 9. Speech through the Bluetooth speaker

1. Pair the speaker with Android and verify normal media playback.
2. Build an approved short sentence from the verified observation.
3. Send only that text to the backend TTS endpoint.
4. Backend calls the configured Gemini TTS model and returns audio with its correct content type.
5. Android plays the audio through its current media route; show whether the speaker is connected.
6. If generation fails, use an installed Android TTS voice or a cached phrase. Test installed offline voice availability in advance.

Google's speech-generation API accepts text and returns generated speech; configure a supported TTS model independently of the vision model. Pin the tested model/SDK during implementation rather than assuming the image model identifier also supports speech. [Official Gemini speech generation](https://ai.google.dev/gemini-api/docs/speech-generation).

Suggested phrases:

- Supported label: “There appears to be a plastic bottle ahead.”
- Uncertain: “I found an object that needs checking.”
- Organic signal only: “Possible organic waste detected. Please check.”
- Obstacle: “Path blocked. I have stopped.”
- Hindi example: “सामने प्लास्टिक की बोतल जैसी वस्तु दिख रही है।”

Keep a bounded speech queue, prioritise stop alerts, cache common phrases and suppress duplicate announcements. If the speaker disconnects, the screen must still show all safety states. Never rely on speech being heard as the sole safety control.

## 10. Backend, security and storage

Run a separate robot gateway on the Mac first, with authenticated access from the phone over the private network. Existing inference binds to localhost by default: keep it there and let the gateway call it, rather than exposing the raw model server publicly. Cloud API keys stay on the backend, never in an APK or BLE packet.

Proposed endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /health` | Model readiness, version and backend connectivity |
| `POST /sessions` | Create a bounded robot mission |
| `POST /observations` | Selected frame -> structured identification |
| `POST /speech` | Approved short text -> speech audio |
| `POST /events` | Confirmations, faults and session observations |
| `POST /sessions/{id}/stop` | Mark mission stopped; motor stopping remains local |

Use request IDs, timeouts, payload/image limits, rate limits and one in-flight inference task per camera. New frames replace queued old work. API completion cannot restart motors. A backend failure pauses the mission unless an independently validated offline mode was explicitly selected.

Keep snapshots in memory by default. Store images only with operator consent and a retention policy. Avoid uploading bystander faces; crop/blur where feasible and use controlled test scenes. Location is optional and coarse; indoor phone GPS is not a navigation map. MongoDB is optional for session history, not necessary for the control loop.

Track model versions, observation timestamps, user corrections and faults. Never log API keys, raw authentication headers or unrestricted video. Cache TTS and cap Gemini calls per mission to control costs; estimate spend from measured calls and current provider pricing, not a fixed unsupported cost claim.

## 11. Proposed separate project layout

```text
robot/
  README.md                 # This design
  android/                  # Native camera/controller app, later
  firmware/                 # ESP32 sensor and safety firmware, later
  gateway/                  # Local model/Gemini/Gemma/TTS adapter, later
  contracts/                # Versioned protocols and validation schemas
  tests/                    # Recorded-case tests and hardware test procedures
  docs/                     # Wiring, calibration, operating checklist
```

Create these implementation directories when work starts. Keep weights under the existing ignored model storage or a separately ignored robot directory; do not duplicate large checkpoints into Git. Ignore `.env`, credentials, recordings, local databases, Gradle caches, APKs and firmware build outputs. Keep only consented, appropriately licensed small test fixtures in source control.

## 12. Build sequence and acceptance gates

### Phase A — stationary perception and speech

Mount the phone without motor power. Capture frames, run the existing local segmentation, request Gemini identification and play speech. Add Gemma summaries after the direct flow works.

**Pass:** known test images produce well-formed results; uncertain/non-waste cases remain reviewable; API failures do not fabricate labels; speaker fallback works; no secrets in the app.

### Phase B — manual rover and independent stopping

Build firmware and manual controls with wheels lifted, then low-speed floor trials. Test sensors, bumper, emergency stop, sequence validation and command expiry.

**Pass:** stop works with the phone disconnected, app killed, backend unavailable and malformed commands. Measured stopping distance fits the chosen clearance. No automatic restart after a fault.

### Phase C — supervised search

Add the finite-state controller, short movement segments, stop-and-scan, fresh-frame verification and announcement cooldown. Start with large, clearly visible objects in a bounded floor area.

**Pass:** complete repeated supervised sessions without collisions or stale-command movement; stop whenever sensing is insufficient. Every claimed detection can be inspected in the session log.

### Phase D — improve local perception

Collect consented floor-level rover images from multiple locations, angles and lighting conditions. Annotate individual litter objects plus explicit negatives: people, shoes, bags, furniture, clean floors and intact items in use. Include small, occluded and crowded scenes.

Split by location/session before augmentation. Train and compare a suitable mobile detector, calibrate abstention on validation, then evaluate a held-out test set once. Benchmark the organic model independently; its bin-camera metrics cannot validate floor detection.

**Pass:** establish task-specific precision/recall, false announcements per minute, missed hazards and end-to-end latency on the target hardware. Set release thresholds before viewing final test results.

### Phase E — standalone optimisation

Convert compatible perception models and evaluate quantization against the original outputs. Benchmark Gemma with LiteRT-LM on the actual Android phone. Measure memory, sustained thermals, battery drain and radio coexistence for at least a 30-minute mission.

**Pass:** meet a documented latency/stopping envelope throughout the run. If conversion or thermals fail, keep laptop-assisted mode; do not claim standalone operation.

## 13. Test matrix

| Case | Required behaviour |
|---|---|
| Bottle, paper, peel, can | Identify only supported labels; allow corrections |
| Person, pet, shoe, phone, bag | Never announce as confirmed trash; stop if path obstructed |
| Sixteen objects / overlap / tiny litter | No promise of complete detection; report uncertainty and measure recall |
| Clean floor / shiny floor / shadows | Measure false positives; do not announce unsupported waste |
| Dark scene / blur / camera occlusion | Pause movement and request a clearer view |
| Wall / chair leg / fabric / angled surface | Exercise sensor limitations with supervision; stop on insufficient clearance |
| Edge or stairs | Exclude from v1 area; validate edge sensing before any later trial |
| BLE loss / app crash / stale command | MCU stops within the tested watchdog envelope |
| Wi-Fi loss / Gemini timeout / quota exhaustion | No stale labels, no uncontrolled movement; show offline state |
| Speaker loss / TTS timeout | Visual notice and tested fallback; bounded speech queue |
| Wheel stall / low battery / controller reboot | Motor disable and explicit rearming after fault |
| Repeated view of same item | Track/cooldown prevents repeated announcements |
| Printed malicious instructions | Treated as scene content; cannot alter controls |

Log end-to-end capture-to-result and result-to-speech latency, p50/p95 latency, false-positive rate, class precision/recall, intervention count, disconnect-stop time and measured stopping distance. “Zero collisions in our controlled trials” is a test observation, not a general safety certification.

## 14. What we need before implementation

1. Phone model, Android version, available RAM and whether it can remain mounted and powered during testing.
2. Chassis/motor model, voltage, stall current, encoders and wheel size.
3. Exact ESP32, motor driver, ultrasonic modules, battery and emergency-stop hardware.
4. A bounded indoor test area with an operator and no stairs or public traffic.
5. Decision on laptop-assisted first version versus an explicitly benchmarked standalone target.
6. Backend Gemini access with billing/request caps; compatible Gemma weights and licence acceptance.

**Recommended demonstration:** operator arms the rover; it moves slowly through a bounded area; stops near a candidate; the phone highlights a likely bottle; Gemini returns a reviewable label; our segmentation result appears separately; speech plays on the speaker; the operator confirms; a second ambiguous item remains uncertain; an obstacle or disconnect stops the motors independently of AI.

The honest pitch is: **a supervised prototype that uses local perception, selective multimodal reasoning and spoken feedback to locate likely litter.** General autonomous navigation, reliable public-space operation and robotic waste collection require additional engineering and validation.
