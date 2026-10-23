# Action animations

Three small, isometric SVG scenes now provide feedback after successful server responses:

- **Pickup saved:** a calendar card pauses, then falls into a collection box. QuickPickup shows it after the booking request succeeds, while retaining the actual booking status, including payment pending. Merely reopening a saved booking does not replay it.
- **Reward redeemed:** three point tokens fall onto a pickup-credit ticket. ServiceHub plays it after a successful redemption and announces that one credit was added. A later successful redemption restarts the scene; refreshes do not.
- **Helper receipt submitted:** a waste bag settles on a scale and a receipt appears. HelperDashboard attaches the scene to the submitted job after its weight-recording request succeeds. English and Hindi messages say resident approval is still pending; this does not mark the collection completed or imply payment.

`ActionMoment` shares the palette and isometric style of the camera collection box. CSS animates transforms and opacity once, then leaves a still final illustration. There are no perpetual loops, progress estimates, extra dependencies, global listeners, blocking overlays, or changes to business logic. Visible messages are status announcements; the SVG is decorative. Reduced-motion CSS disables movement and shows the final scene. Labels wrap beneath the illustration when space is limited.

## Verification

The flow under test was a temporary local preview → trigger each of the three action variants → one-shot animation with the corresponding saved-state message. The browser plugin was not available; the existing CUA browser tools were used for DOM, computed-style, screenshot and console checks.

At http://localhost:3001/motion-preview, desktop 1280×720 and mobile 390×844 both showed meaningful content with no framework error overlay, console errors/warnings or horizontal overflow. All animated groups reported a single iteration. Each preview button updated its real React state; a second reward trigger updated the count to two and restarted that scene. Desktop and mobile screenshots were inspected. The temporary preview route was removed.

TypeScript passed, and React integration was reviewed for hook ordering, stable per-action keys, scoped styling, accessible labels and success-only triggers. No production bookings, reward redemptions or helper receipts were submitted during QA; authenticated API flows and OS-level reduced-motion behavior were not exercised. Their integration points and the reduced-motion stylesheet were reviewed in source. Existing unrelated app changes remain outside this commit.
