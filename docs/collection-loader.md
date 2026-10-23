# Captured-frame collection transition

The camera animates the exact JPEG passed to the scan callback. The upload flow uses the submitted image. Each capture holds at full size for about 0.5 seconds, shrinks and pauses above an isometric collection box, then falls behind its front faces. The complete transition lasts 2.2 seconds and runs once per capture, independently of request duration. Analysis starts immediately; the animation does not delay the API call or fabricate progress.

Automatic scanning waits two seconds after video playback starts before taking the first frame, giving the user time to position their items. The existing 15-second interval after analysis remains. Stop, unmount and page visibility cleanup cancel the pending capture timer. Manual scanning remains available.

While the captured frame is in flight, the scanner corners, scan beam, target icon and camera caption are hidden so they cannot intersect the box. They return when the transition finishes. The overlay ignores pointer input and stays within the image viewport. Reduced motion shows a static box briefly without the falling movement. The existing processing text announces request status; the image and box overlay are decorative.

Validation: TypeScript passed. A temporary browser preview confirmed the initial full-size hold, 2.2-second animation duration, hidden guides/caption during flight, automatic removal after completion, guide restoration, and no browser warnings or errors. The real image and box were visually inspected together. Temporary preview and sample-image routes were removed. Live camera permissions and an actual scan request were not exercised in this check. Existing unrelated dashboard and camera changes were preserved outside these commits.
