"use client";
// Adapted from Aceternity UI's Text Hover Effect, by Manu Arora.
// https://ui.aceternity.com/components/text-hover-effect
import { useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
export default function TextHoverEffect() {
  const id = useId().replaceAll(":", ""),
    root = useRef<SVGSVGElement>(null),
    reduce = useReducedMotion();
  const [cursor, setCursor] = useState({ cx: "50%", cy: "50%" }),
    [hovered, setHovered] = useState(false);
  return (
    <svg
      ref={root}
      className="footer-wordmark"
      viewBox="0 0 1000 165"
      aria-hidden="true"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerMove={(e) => {
        if (reduce) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setCursor({
          cx: `${((e.clientX - rect.left) / rect.width) * 100}%`,
          cy: `${((e.clientY - rect.top) / rect.height) * 100}%`,
        });
      }}
    >
      <defs>
        <linearGradient id={`${id}-color`}>
          <stop stopColor="#a9c792" />
          <stop offset=".55" stopColor="#a7a0e0" />
          <stop offset="1" stopColor="#d6e2ca" />
        </linearGradient>
        <motion.radialGradient
          id={`${id}-reveal`}
          animate={cursor}
          transition={{ duration: reduce ? 0 : 0.15 }}
          r="26%"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="black" />
        </motion.radialGradient>
        <mask id={`${id}-mask`}>
          <rect width="100%" height="100%" fill={`url(#${id}-reveal)`} />
        </mask>
      </defs>
      <text
        x="500"
        y="125"
        textAnchor="middle"
        fontSize="145"
        fontWeight="650"
        letterSpacing="-8"
        fill="none"
        stroke="#496653"
        strokeWidth="1"
      >
        Waste Right.
      </text>
      <text
        x="500"
        y="125"
        textAnchor="middle"
        fontSize="145"
        fontWeight="650"
        letterSpacing="-8"
        fill="none"
        stroke={`url(#${id}-color)`}
        strokeWidth="2"
        mask={`url(#${id}-mask)`}
        opacity={hovered ? 1 : 0.35}
      >
        Waste Right.
      </text>
    </svg>
  );
}
