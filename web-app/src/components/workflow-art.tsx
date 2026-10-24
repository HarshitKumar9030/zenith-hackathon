"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
export default function WorkflowArt({
  scene,
  className = "",
}: {
  scene: "pickup" | "history" | "reward";
  className?: string;
}) {
  const root = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const floating = root.current?.querySelectorAll(".art-float");
        if (floating?.length) gsap.to(floating, {
          y: -4,
          duration: 2.6,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        if (scene === "pickup") {
          gsap.to(".art-wheel", {
            rotation: 360,
            transformOrigin: "50% 50%",
            duration: 6,
            repeat: -1,
            ease: "none",
          });
          gsap.to(".art-route", {
            strokeDashoffset: -36,
            duration: 3.5,
            repeat: -1,
            ease: "none",
          });
        }
        if (scene === "history")
          gsap.to(".art-hand", {
            rotation: 360,
            svgOrigin: "128 61",
            duration: 24,
            repeat: -1,
            ease: "none",
          });
        if (scene === "reward")
          gsap.to(".art-leaf", {
            rotation: 5,
            transformOrigin: "50% 100%",
            duration: 2.4,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
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
  }, [scene]);
  return (
    <svg
      ref={root}
      viewBox="0 0 180 110"
      fill="none"
      className={`workflow-art ${className}`}
      aria-hidden="true"
      data-scene={scene}
    >
      {scene === "pickup" ? (
        <>
          <path
            className="art-route"
            d="M12 91h153"
            stroke="#d6dfcc"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="3 9"
          />
          <g
            stroke="#74916d"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M32 46a6 6 0 0 1 6-6h64v43H32z" fill="#e7eedc" />
            <path d="M102 53h22l19 21v9h-41z" fill="#f1f4eb" />
            <path d="M112 59h9l13 14h-22z" fill="#dce7ce" />
            <path d="M43 52h24v24H43z" fill="#f7f9f2" />
            <path d="M55 52v9m-7 15V66h15v10" />
            <path d="M77 57c10-1 17 3 17 13-10 0-17-4-17-13Z" fill="#c6d8b2" />
          </g>
          {[56, 124].map((x) => (
            <g className="art-wheel" key={x}>
              <circle
                cx={x}
                cy="84"
                r="10"
                fill="#fbfcf8"
                stroke="#74886e"
                strokeWidth="2"
              />
              <path
                d={`M${x} 79v10m-5-5h10`}
                stroke="#9aae8a"
                strokeWidth="1.5"
              />
            </g>
          ))}
        </>
      ) : scene === "history" ? (
        <>
          <g className="art-float" strokeLinecap="round" strokeLinejoin="round">
            <rect
              x="37"
              y="21"
              width="77"
              height="75"
              rx="12"
              fill="#eef0f8"
              stroke="#9a95ba"
              strokeWidth="2"
            />
            <path
              d="M38 43h75M56 16v14m39-14v14"
              stroke="#9a95ba"
              strokeWidth="2"
            />
            <path
              d="M51 58h17m-17 12h31m-31 12h23"
              stroke="#b3afcc"
              strokeWidth="3"
            />
            <circle
              cx="128"
              cy="61"
              r="25"
              fill="#f8faf5"
              stroke="#7f9a72"
              strokeWidth="2"
            />
            <path
              className="art-hand"
              d="M128 45v16l10 5"
              stroke="#7f9a72"
              strokeWidth="2.5"
            />
          </g>
        </>
      ) : (
        <>
          <path
            d="M89 90V49"
            stroke="#7f9e6b"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <g className="art-leaf">
            <path
              d="M89 65C67 66 54 55 54 36c23-1 36 9 35 29Z"
              fill="#dfebce"
              stroke="#8ba676"
              strokeWidth="2"
            />
            <path
              d="M89 51c0-22 14-35 35-34-1 23-15 36-35 34Z"
              fill="#edf3e5"
              stroke="#8ba676"
              strokeWidth="2"
            />
            <path
              d="M89 65 65 46m24 5 23-22"
              stroke="#8ba676"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
          <g className="art-float">
            <rect x="120" y="66" width="27" height="27" rx="9" fill="#eeedf8" />
            <path
              d="m127 79 5 5 9-11"
              stroke="#9b94bd"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <path
            d="M61 94h57"
            stroke="#d1debd"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
