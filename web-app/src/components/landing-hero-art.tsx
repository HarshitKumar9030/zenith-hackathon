"use client";
import { useEffect, useId, useRef } from "react";
import { gsap } from "gsap";
import DepthGlyph from "./depth-glyph";
export default function LandingHeroArt() {
  const root = useRef<SVGSVGElement>(null),
    id = useId().replaceAll(":", "");
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.to(".hero-device", {
          y: -7,
          duration: 3.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.to(".hero-leaf", {
          rotation: 3,
          svgOrigin: "510 440",
          duration: 3.8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.to(".hero-beam", {
          y: 158,
          duration: 2.8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.fromTo(
          ".hero-draw",
          { strokeDasharray: 80, strokeDashoffset: 80 },
          { strokeDashoffset: 0, duration: 1.5, repeat: -1, repeatDelay: 3 },
        );
      }, root);
      let visible = true;
      const sync = () =>
        ctx
          .getTweens()
          .forEach((t: gsap.core.Tween) =>
            visible && !document.hidden ? t.resume() : t.pause(),
          );
      const observer = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        sync();
      });
      if (root.current) observer.observe(root.current);
      document.addEventListener("visibilitychange", sync);
      return () => {
        observer.disconnect();
        document.removeEventListener("visibilitychange", sync);
        ctx.revert();
      };
    });
    return () => media.revert();
  }, []);
  return (
    <svg
      ref={root}
      viewBox="0 0 640 550"
      fill="none"
      aria-hidden="true"
      className="landing-hero-art"
    >
      <defs>
        <clipPath id={`${id}-screen`}>
          <rect x="222" y="62" width="228" height="414" rx="28" />
        </clipPath>
        <linearGradient
          id={`${id}-wash`}
          x1="80"
          y1="80"
          x2="530"
          y2="500"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f3f6ef" />
          <stop offset="1" stopColor="#e9ecf6" />
        </linearGradient>
      </defs>
      <path
        d="M55 286C64 148 172 65 302 69c153 4 279 100 280 245 2 115-108 190-258 185C167 493 45 427 55 286Z"
        fill={`url(#${id}-wash)`}
      />
      <path d="M81 386c-6-57 14-95 52-119 9 61-5 105-52 119Z" fill="#a4bd94" />
      <path
        d="m81 423 36-123"
        stroke="#68855f"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g stroke="#79956c" strokeWidth="2" strokeLinejoin="round">
        <path d="m94 340 45-25 47 25v101l-47 24-45-24Z" fill="#e2eacb" />
        <path d="m94 340 45 25 47-25m-47 25v100m-45-125 22-39h48l22 39" />
        <path d="M116 301v-15h48v15" fill="#acc395" />
      </g>
      <g className="hero-device">
        <rect
          x="212"
          y="50"
          width="248"
          height="438"
          rx="39"
          fill="#dbe5d3"
          stroke="#2e5039"
          strokeWidth="6"
        />
        <rect x="222" y="62" width="228" height="414" rx="28" fill="#fbfcf9" />
        <rect x="290" y="72" width="92" height="21" rx="11" fill="#244733" />
        <g clipPath={`url(#${id}-screen)`}>
          <path d="M310 170h48v25h-48z" fill="#7b9d6c" />
          <path
            d="M317 195v19c0 12-24 25-24 46v76c0 14 10 22 23 22h38c13 0 23-8 23-22v-76c0-21-26-34-26-46v-19"
            fill="#dce8d1"
            stroke="#adbf9d"
            strokeWidth="2"
          />
          <path
            d="M294 278h82m-82 21h82m-82 21h82"
            stroke="#f7f9f3"
            strokeWidth="8"
          />
          <path
            d="M309 243c-7 8-8 16-8 21"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M251 171v-16h20m129 0h20v16m0 172v17h-20m-129 0h-20v-17"
            stroke="#7d76b4"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <g className="hero-beam">
            <path d="M251 177h169v14H251z" fill="#c7daba" fillOpacity=".45" />
            <path d="M251 177h169" stroke="#94b67b" strokeWidth="2" />
          </g>
        </g>
        <rect x="250" y="393" width="172" height="49" rx="16" fill="#eff3e9" />
        <circle cx="275" cy="417" r="11" fill="#8ba877" />
        <path
          className="hero-draw"
          d="m270 417 4 4 7-8"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M297 412h100m-100 10h73"
          stroke="#b3c3a8"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
      <g className="hero-leaf">
        <path
          d="M508 427c-15-66 9-118 64-152 6 76-10 130-64 152Z"
          fill="#9ab78d"
        />
        <path
          d="m504 455 42-130m-27 85 30-21m-23-1-5-33"
          stroke="#64835b"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <g className="hero-result">
        <rect x="418" y="178" width="165" height="66" rx="18" fill="#fff" />
        <circle cx="445" cy="211" r="13" fill="#e9f0e1" />
        <path
          d="m439 211 4 4 8-9"
          stroke="#6e8c5b"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M470 203h87m-87 13h61"
          stroke="#becdb4"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
      <path
        d="m159 146 10-15m-25 24-17-3"
        stroke="#a49bc8"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <DepthGlyph kind="box" x={84} y={150} delay={-1} />
      <DepthGlyph kind="bottle" x={520} y={200} delay={-3} />
      <DepthGlyph kind="leaf" x={102} y={368} delay={-2} />
    </svg>
  );
}
