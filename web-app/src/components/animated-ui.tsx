"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";

function PageSurface({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.from(
          ".page-heading, .overview-grid, .streak-band, .stats, .activity, .identify-grid, .guide-layout, .settings-grid, .history-toolbar",
          {
            y: 12,
            opacity: 0,
            duration: 0.42,
            stagger: 0.055,
            ease: "power2.out",
            clearProps: "transform,opacity",
          },
        );
      }, root);
      return () => context.revert();
    });
    return () => media.revert();
  }, []);
  return (
    <motion.main
      ref={root}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.15 }}
    >
      {children}
    </motion.main>
  );
}
export function PageTransition({
  page,
  children,
}: {
  page: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <PageSurface key={page}>{children}</PageSurface>
    </AnimatePresence>
  );
}

/** Animate the supplied artwork as a whole; preserve the original asset. */
export function AnimatedIllustration({
  asset,
  className = "",
  variant = "float",
}: {
  asset: string;
  className?: string;
  variant?: "float" | "processing";
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const timeline = gsap.timeline({ repeat: -1, yoyo: true });
        timeline.to(".illustration-art", {
          y: variant === "processing" ? -4 : -7,
          rotation: variant === "processing" ? 4 : 1.5,
          duration: variant === "processing" ? 1.3 : 2.8,
          ease: "sine.inOut",
        });
        let visible = true;
        const sync = () => {
          if (visible && !document.hidden) timeline.resume();
          else timeline.pause();
        };
        const observer = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          sync();
        });
        if (root.current) observer.observe(root.current);
        document.addEventListener("visibilitychange", sync);
        return () => {
          observer.disconnect();
          document.removeEventListener("visibilitychange", sync);
        };
      }, root);
      return () => context.revert();
    });
    return () => media.revert();
  }, [variant]);
  return (
    <div ref={root} className={`illustration ${className}`} aria-hidden="true">
      <img
        className="illustration-art"
        src={`/assets/${asset}`}
        alt=""
        width="150"
        height="150"
      />
    </div>
  );
}

export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
