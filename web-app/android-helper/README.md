# Waste Right Helper for Android

A small native Android companion for sharing the location of an active, assigned pickup. English/Hindi. No third-party application libraries.

Build from the repository root:

```sh
python3 web-app/android-helper/build.py
```

Requires Android SDK/platform/build-tools and JDK 17+. Android Studio's bundled JDK is detected on macOS. Optional environment variables: `ANDROID_HOME`, `JAVA_HOME`. Output: `build/waste-right-helper-debug.apk` (ignored by Git).

Install on Android 8 or later. Generate a one-use pairing code in the approved helper's assigned collection on the website. Enter the HTTPS server address and code in the app, pair, then tap Start sharing and grant location and notification permission. For local debug testing use the computer's LAN address, not localhost, on the same trusted network. HTTP is enabled only in the generated debug build.

A persistent notification has Stop sharing. The service checks assignment every 15 seconds, attempts GPS uploads every five seconds, and stops after two hours or when the session/job ends. No silent restart, full route archive, or persistent token storage. A resident sees only their own assigned helper's latest point, reported accuracy, freshness and approximate arrival range. The APK build/signature and API were tested; real-device GPS/background behaviour still needs testing.

Full setup, privacy behaviour and ETA limitations: [tracking documentation](../../docs/helper-location-tracking.md).
