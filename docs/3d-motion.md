# Decorative depth and SVG objects

The landing hero includes small isometric carton, bottle and leaf SVG components. Fine-pointer devices receive a bounded 5-degree tilt on the hero artwork, workflow panels, plan illustrations, helper illustration and dashboard upload hero. Individual CSS `rotate` composes with existing Framer Motion/GSAP transforms rather than replacing them.

`DepthMotion` uses one passive delegated pointer listener and requestAnimationFrame; pointer tracking does not update React state. Leaving the surface, losing window focus or changing motion preference resets tilt. Touch devices and reduced-motion preferences disable pointer tilt. The SVG float animation is disabled for reduced motion and small screens. No WebGL renderer or new dependency is required. Illustrations are decorative and hidden from assistive technology.

Validation: TypeScript passed. Browser check confirmed all three SVG glyphs render and the narrow viewport has no horizontal overflow. Existing WorkflowArt GSAP `.art-float` target warnings remain unrelated to this addition. Existing text, controls and scan flow are unchanged.
