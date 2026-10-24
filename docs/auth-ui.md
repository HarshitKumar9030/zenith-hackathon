# Account and recovery interface

The account dialog now uses a shared form style for sign-in, resident/helper signup, password recovery, email sign-in links and verification resends. Recovery actions are separated into labelled controls instead of adjacent inline links. Email stays in the form when changing modes; password fields have accessible visibility controls. Successful email requests show a neutral inbox state, while errors remain inline without duplicating the global toast.

The `/account` screen covers reset, verification, email sign-in, loading, invalid links and completion. Password reset asks for confirmation before submitting. Single-use links remain explicit POST actions, with invalid-link recovery paths back into the appropriate email request. The fragment is read once and removed while preserving Next.js history state; React Strict Mode no longer clears it on the second effect execution.

Forms share spacing, typography, focus styles, mobile sizing, busy states and reduced-motion handling. No border/shadow treatment was introduced. The account modal is labelled and scrolls within short viewports. The full account page has a wider desktop layout and a compact mobile card. Existing signup roles, email verification and single-use token controls are retained.
