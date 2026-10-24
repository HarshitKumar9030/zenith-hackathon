# Front and back camera switching

The shared live scanner exposes a **Flip camera** control after permission when facing-mode information or multiple video inputs indicate camera selection is available. It requests the opposite facing mode, closes the old tracks first and gives the new preview two seconds before automatic capture resumes. Confirmed scan results and the session scan count remain intact. The front preview is mirrored; captured images stay unmirrored for OCR.

The control is disabled during analysis and while switching. Repeated taps cannot create concurrent requests. If a browser rejects the other camera or silently returns the same device, the scanner tries to restore the previous device and explains the outcome. Late streams are closed after Stop, tab hiding, navigation or cancellation. Optional device enumeration failing does not prevent scanning. The native Take photo action uses the phone/browser camera controls without explicitly requesting a rear-facing device.

Camera access still needs HTTPS or localhost, browser permission and supported hardware. The image tester only uploads files and has no live camera to switch. No microphone is requested.

Validation: six mocked camera-lifecycle tests cover release-before-switch, restoration, same-device detection, late streams, cancelled recovery and initial permission failure. Together with the existing suite, 37 tests and TypeScript pass. The production build passes. Physical iOS/Android camera behaviour and a fresh browser UI review remain unverified; local browser control is disabled.

Implementation references: [MDN front/back camera guidance](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#front_and_back_camera), [facingMode constraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/facingMode), [device permissions and enumeration](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices).
