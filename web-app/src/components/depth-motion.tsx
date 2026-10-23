"use client";
import { useEffect } from "react";

const surfaces = ".landing-visual, .landing-steps article, .landing-tier-art, .helper-illustration, .upload-hero";
/** Pointer depth is decorative: no React state updates or touch interception. */
export default function DepthMotion() {
  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    let active: HTMLElement | null = null;
    const reset = () => {
      if (active) {
        active.style.removeProperty("--depth-rotate");
        active = null;
      }
    };
    const move = (event: PointerEvent) => {
      if (!media.matches) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(surfaces) : null;
      if (target !== active) reset();
      active = target;
      cancelAnimationFrame(frame);
      if (!target) return;
      const { clientX, clientY } = event;
      frame = requestAnimationFrame(() => {
        const box = target.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (clientX - box.left) / box.width * 2 - 1));
        const y = Math.max(-1, Math.min(1, (clientY - box.top) / box.height * 2 - 1));
        target.style.setProperty("--depth-rotate", `${-y} ${x || .001} 0 ${Math.min(5, Math.hypot(x, y) * 4)}deg`);
      });
    };
    const stop = () => { cancelAnimationFrame(frame); reset(); };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", stop);
    window.addEventListener("blur", stop);
    media.addEventListener("change", stop);
    return () => {
      stop();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", stop);
      window.removeEventListener("blur", stop);
      media.removeEventListener("change", stop);
    };
  }, []);
  return null;
}
