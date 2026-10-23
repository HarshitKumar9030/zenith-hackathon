# Collection-box analysis loader

`WasteDropLoader` renders an isometric collection box with a carton, bottle and leaf falling into it in sequence. Rear flaps sit behind the falling objects; front faces cover them as they enter the box. A small receiving motion gives the box weight. The animation does not imply completed classification or show fabricated percentage progress.

The dashboard renders it during its existing `busy` state (image/text identification and OCR). LiveCamera renders the compact version only while `running && processing`, covering frame OCR and the awaited scan callback. The compact version occupies the bottom-right corner of the preview, has no pointer interaction and leaves camera controls available. Both instances unmount as the real processing state ends.

CSS animation uses no new dependencies. Reduced motion renders a static object above the box. IntersectionObserver and document visibility pause hidden animations, with listeners cleaned up on unmount. Existing status text remains the accessible announcement; decorative SVGs are hidden from assistive technology.

Validation: TypeScript passed. A temporary component preview verified both sizes animate, the completion toggle removes both loader instances, and no browser warnings/errors appear. At 390px viewport width the upload loader is 94px wide and camera loader 72px, with no horizontal overflow. The temporary route was removed. Actual camera permission/capture was not exercised; scan processing logic was unchanged. Unrelated pre-existing dashboard/camera edits were left unstaged.
