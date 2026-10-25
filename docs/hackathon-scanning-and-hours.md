# Current scanning, collection hours and pricing

Restored on 25 October 2026 after the hackathon demonstration.

## Scanning

Image/text identification supports up to 16 distinct objects in one scene. Waste, non-waste and uncertainty flags remain active. People are excluded by the prompt and a server label filter; non-waste/empty results cannot be confirmed, and uncertain objects require user selection. This is application support, not a measured claim of perfect 16-object recognition.

The optional **Read packaging labels** control and separate English OCR worker are restored in the live camera. OCR is off until the user enables it. Automatic scanning and front/back camera switching remain available.

## Collection hours and prices

Collections run 7 am to before 2 pm, then 5–7 pm IST. The 2–5 pm break is restored, with no overnight bookings. Evening charges are ₹5 + ₹1 for unsegregated Basic/reward waste + ₹1 when measured weight exceeds 2 kg, capped at ₹7. Gold/Platinum include sorting, so the unsegregated penalty does not apply to their allowance pickups. Existing recorded orders/receipts are not rewritten.

Basic remains ₹10 with 2 kg included. Gold is restored to ₹399/month (14 pickups, 8 kg each), Platinum to ₹469/month (24 pickups, 10 kg each). The separate helper-measured ₹3/kg excess-weight rule remains. Prices are pilot terms, not evidence of profitable operation.

**Next available** selects the next valid service window, skipping the break and overnight closure. It is a requested collection window, not a promised helper arrival. Live arrival ranges remain pending until the assigned helper shares a fresh, sufficiently accurate location. Users can choose a future service time within 30 days.

## Dispatch and special pickups

Automatic assignment to an arbitrary helper is disabled by default and explicitly disabled in the local environment. Approved helpers accept scheduled jobs; paid jobs enter that queue only after verified payment capture. `DEMO_AUTO_ASSIGN=true` is an explicit opt-in demo shortcut, never the regular default.

Helper headings now say “Your collections and earnings”, with a compact “Basic · 2 kg included” badge. Operations administrators can enable/disable a **Special pickup helper** designation on approved helper accounts. The existing single approved local helper has been designated as requested. This application designation is not a professional certification or government authorization, and does not bypass the existing special-handling review requirement for booking.
