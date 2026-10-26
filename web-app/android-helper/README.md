# Waste Right Helper for Android

Android 8+ helper dashboard and native GPS companion. The app uses **https://wasteright.harshit.page** for the signed-in workspace and tracking API. Home, Collections, Earnings and Service area have native bottom navigation. The workspace supports English/Hindi, search, list/grid collections, measured receipts and existing illustrated cards.

## Build and install

```sh
python3 web-app/android-helper/build.py
```

Requires the Android SDK/platform/build-tools and JDK 17+. Android Studio's bundled JDK is detected on macOS. Optional `ANDROID_HOME`, `JAVA_HOME`. Output: `build/waste-right-helper-debug.apk` (ignored by Git). This is a debug-signed installable build, not a Play Store release. Keep the signing key out of Git.

Deploy the matching website changes before using the new in-app Share location action. Install the APK, sign in with an approved Helper account, open Collections and accept an eligible job. Tap **Share location** on that assigned job and grant phone location and notification permissions. There is no server URL or pairing-code entry in the normal flow. Special pickups show handling instructions and require Operations' special-pickup approval. An account designation is not proof of hazardous-material training.

The website creates a short-lived, single-use code. Only navigation from the trusted HTTPS top-level page can hand that code to Android; the native client exchanges it for a two-hour, assignment-scoped tracking token. No `addJavascriptInterface` is exposed. Session cookies remain inside WebView; tracking tokens remain in process memory. Certificate errors are rejected, mixed content and file access are disabled, and external links open outside the workspace.

Location is shared only after the helper starts it. A persistent notification and in-app strip provide Stop. GPS attempts updates about every five seconds; a 15-second heartbeat checks assignment. Sharing continues when minimised, and ends on Stop, session expiry, assignment ending, or removal of the app task. Battery management, network and GPS conditions affect delivery and accuracy. No continuous off-duty tracking or full route archive. If revoked while offline, the server may retain the session until its expiry/next assignment check; the device stops collecting.

The address picker requests location separately when the helper taps it. It does not start pickup tracking. Phone denial is respected. Foreground location sharing follows Android's runtime permission rules; no background-location permission is requested.

The app requires connectivity for dashboard actions and does not queue offline receipts or claims. The web map shows the latest reported position and accuracy, not a guaranteed precise location or traffic-based ETA.

## Verification

The APK compiles and its v2/v3 signature verifies. Web production build, unit tests and scoped API integration cover the backend; synthetic browser checks cover mobile layout, special filtering and Hindi. Physical-device background GPS, notification denial/recovery and battery-management behaviour still need a field test. No real GPS or payment was used during UI QA.

Security references: [Android WebView bridge guidance](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges), [location foreground services](https://developer.android.com/develop/background-work/services/fgs/service-types#location). More: [tracking documentation](../../docs/helper-location-tracking.md).

## Version 0.3: authentication and navigation

Update the installed APK to version 0.3.0 (versionCode 3); the package and signing key are unchanged. The web build recognises 0.2 and 0.3 clients. Bottom navigation is hidden until a helper is signed in and while the keyboard/account dialog is open. Android 11+ system-bar, cutout and keyboard insets are handled separately. Tabs switch the current React page rather than reloading the sign-in form or collection workspace. Older Android versions use resize/visible-frame detection for the keyboard.

Signup is explicitly a Helper account. Email verification, sign-in and reset links for `https://wasteright.harshit.page/account` can reopen this app through Android App Links, retaining its WebView cookie session after verification. Deploy the association JSON before installation/link verification. A fresh signing key requires updating `public/.well-known/assetlinks.json` with its SHA-256 certificate fingerprint; do not commit the keystore. The native URL allowlist and certificate checks remain enabled. Link verification and keyboard/system-bar positioning still need confirmation on the user's device.
