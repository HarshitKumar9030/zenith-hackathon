"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
export default function ScanArt({ busy = false }: { busy?: boolean }) {
  const root = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.to(".orbit", {
          rotation: 360,
          svgOrigin: "120 110",
          duration: 24,
          repeat: -1,
          ease: "none",
        });
        gsap.to(".bottle", {
          y: -5,
          duration: 2.4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        if (busy)
          gsap.fromTo(
            ".scan-line",
            { y: -48, opacity: 0.65 },
            {
              y: 48,
              opacity: 0.65,
              duration: 1.4,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            },
          );
      }, root);
      const sync = () =>
        context
          .getTweens()
          .forEach((tween) =>
            document.hidden ? tween.pause() : tween.resume(),
          );
      document.addEventListener("visibilitychange", sync);
      return () => {
        document.removeEventListener("visibilitychange", sync);
        context.revert();
      };
    });
    return () => media.revert();
  }, [busy]);
  return (
    <svg
      ref={root}
      className={`scan-art ${busy ? "scanning" : ""}`}
      viewBox="0 0 240 220"
      fill="none"
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M53 52V36a9 9 0 0 1 9-9h18M160 27h18a9 9 0 0 1 9 9v16M187 168v16a9 9 0 0 1-9 9h-18M80 193H62a9 9 0 0 1-9-9v-16" />
        <g className="bottle" transform="rotate(27 120 110)">
          <path d="M108 45h24v14h-24zM111 59v14c0 8-15 15-15 30v66a8 8 0 0 0 8 8h32a8 8 0 0 0 8-8v-66c0-15-15-22-15-30V59M96 111h48M96 137h48M96 145h48M108 177v-4M132 177v-4" />
        </g>
      </g>
      <circle
        className="orbit"
        cx="120"
        cy="110"
        r="77"
        stroke="#a9d556"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="130 115"
      />
      <path
        className="scan-line"
        d="M68 110h104"
        stroke="#39744b"
        strokeWidth="1.5"
      />
    </svg>
  );
}
