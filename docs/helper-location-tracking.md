# Helper location tracking and Android demo

The Android companion shares location only after an approved helper pairs an assigned pickup, grants location/notification permission, and taps **Start sharing**. A visible foreground notification includes Stop. English and Hindi are supported. Residents see only their assigned helper. There is no public helper-location directory.

## Install and pair

Build from the repository root with `python3 web-app/android-helper/build.py`. Requires Android SDK platform/build tools and JDK 17+ (the script uses Android Studio's bundled runtime when available). Install `web-app/android-helper/build/waste-right-helper-debug.apk` on Android 8+ by opening it on the phone and allowing installation for the transferring app.

In the helper dashboard, open an assigned collection → Pair Android app. Enter the displayed server address and one-use code in the Android app. Use a deployed HTTPS server, or for the local hackathon debug build, the computer's LAN address with port 3001; phone and computer must share the network. `localhost` on a phone refers to the phone. Tap Pair, then Start sharing. Choose precise location for the best available GPS fix. Open the resident's Pickups page to see updates for location status and the arrival range (map view is disabled for this demo).

Debug builds permit HTTP for LAN testing; use trusted local networks. A production release needs an HTTPS-only build, a private signing key, distribution setup, and physical-device/battery testing. APKs, keys and generated build files stay out of Git. The current APK was compiled and its signature verified; physical-device background tracking has not been verified.

## Behaviour and limits

GPS updates are attempted every five seconds while the foreground service runs. Android may delay them. The app does not request unrestricted background-location permission, silently restart after a reboot, or continue after its active task is removed. The notification can stop sharing at any time. Pairing expires after five minutes and is single use; the scoped tracking token remains in memory, expires after two hours, and applies to one pickup. A 15-second heartbeat checks whether assignment or authorization ended. Completion, reassignment, helper deapproval or password change revoke tracking. No complete route history is stored: only the latest fix, with TTL cleanup. Stale fixes disappear after two minutes.

The tracking card shows device-reported accuracy and update age, never an Apple Find My accuracy promise. GPS accuracy depends on hardware, permissions, buildings and signal. Map rendering and external tile requests are disabled for this demo. A fresh fix within 100 m reported accuracy plus a saved collection coordinate yields an approximate arrival range: straight-line distance at an assumed 10–25 km/h with a buffer. It is not road routing, traffic data, or a promised appointment. Otherwise ETA stays pending.

Verification: `npm test`, `npm run build`, and `node tests/tracking-integration.mjs` from `web-app/`. Integration uses a separate temporary MongoDB database and synthetic coordinates, with external email disabled.
