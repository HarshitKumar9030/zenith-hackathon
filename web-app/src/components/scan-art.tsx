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
          y: 78,
          duration: busy ? 0.9 : 2.8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.to(".paper-object", {
          y: -7,
          rotation: -5,
          transformOrigin: "50% 50%",
          duration: 2.7,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.to(".leaf-object", {
          y: 6,
          rotation: 5,
          transformOrigin: "50% 50%",
          duration: 3.1,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.to(".bottle", {
          y: -3,
          duration: 2.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.fromTo(
          ".detection-tick",
          { strokeDashoffset: 30 },
          {
            strokeDashoffset: 0,
            duration: 1.2,
            repeat: -1,
            repeatDelay: 2.5,
            yoyo: true,
            ease: "power2.inOut",
          },
        );
        gsap.to(".flow-path", {
          strokeDashoffset: -32,
          duration: 3,
          repeat: -1,
          ease: "none",
        });
      }, root);
      let visible = true;
      const sync = () =>
        context
          .getTweens()
          .forEach((t: gsap.core.Tween) =>
            visible && !document.hidden ? t.resume() : t.pause(),
          );
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      });
      if (root.current) observer.observe(root.current);
      document.addEventListener("visibilitychange", sync);
      return () => {
        observer.disconnect();
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
      viewBox="0 0 320 220"
      fill="none"
      aria-hidden="true"
    >
      <path
        className="flow-path"
        d="M56 102c0-34 40-52 66-40m77 94c33 18 64-2 64-36"
        stroke="#c8d7bc"
        strokeWidth="2"
        strokeDasharray="4 8"
        strokeLinecap="round"
      />
      <g
        className="paper-object"
        stroke="#72906b"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <path d="m39 99 24-13 25 13v32l-25 14-24-14Z" fill="#f0f4e9" />
        <path d="m39 99 24 14 25-14M63 113v32M51 92l25 14v12l-10-5V99" />
        <path d="m47 126 8 5" strokeLinecap="round" />
      </g>
      <g className="leaf-object">
        <path
          d="M237 102c-7-30 9-49 36-55 5 31-8 55-36 55Z"
          fill="#dce8c9"
          stroke="#78966d"
          strokeWidth="2"
        />
        <path
          d="m234 113 27-49m-18 31 13-3m-6-10-1-12"
          stroke="#78966d"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <rect
        x="111"
        y="22"
        width="98"
        height="166"
        rx="20"
        fill="#fcfdf9"
        stroke="#426c53"
        strokeWidth="2.5"
      />
      <path
        d="M144 32h32"
        stroke="#c6d3bd"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="120" y="48" width="80" height="112" rx="12" fill="#eef2e9" />
      <g
        className="bottle"
        stroke="#7976a7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M153 64h14v12h-14z" fill="#dcdaf0" />
        <path
          d="M155 76v9c0 6-10 9-10 19v35a5 5 0 0 0 5 5h20a5 5 0 0 0 5-5v-35c0-10-10-13-10-19v-9"
          fill="#e5e3f2"
        />
        <path d="M145 108h30m-30 21h30m-19 8h8" />
      </g>
      <path
        d="M130 66v-6h8m44 0h8v6m0 76v6h-8m-44 0h-8v-6"
        stroke="#8fac77"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g className="orbit">
        <path
          d="M124 70h72"
          stroke="#a2bd83"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M125 71h70v8h-70z" fill="#c9d9b5" fillOpacity=".28" />
      </g>
      <rect x="145" y="166" width="30" height="12" rx="6" fill="#e3ebd8" />
      <path
        className="detection-tick"
        d="m153 172 4 4 9-9"
        stroke="#5b8254"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="30"
      />
    </svg>
  );
}
