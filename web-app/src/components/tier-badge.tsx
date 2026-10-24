"use client";
import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
export default function TierBadge({
  tier,
  size = 54,
}: {
  tier: "gold" | "platinum";
  size?: number;
}) {
  const id = useId().replaceAll(":", ""),
    gold = tier === "gold",
    reduce = useReducedMotion();
  return (
    <motion.span
      className={`tier-badge ${tier}`}
      style={{ width: size, height: size }}
      whileHover={reduce ? undefined : { y: -2, rotate: 3 }}
      transition={{ duration: reduce ? 0 : 0.2 }}
      aria-label={`${gold ? "Gold" : "Platinum"} tier`}
      role="img"
    >
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="9" y1="5" x2="56" y2="61">
            <stop stopColor={gold ? "#f9e7b3" : "#f1f1fb"} />
            <stop offset=".48" stopColor={gold ? "#d8b46c" : "#bcb9d5"} />
            <stop offset="1" stopColor={gold ? "#b48b48" : "#8583a4"} />
          </linearGradient>
        </defs>
        <path
          d="m32 3 6 4 7-1 4 6 7 3 1 7 4 6-3 7 1 7-6 4-3 7-7 1-6 4-7-3-7 1-4-6-7-3-1-7-4-6 3-7-1-7 6-4 3-7 7-1Z"
          fill={`url(#${id})`}
        />
        <circle
          cx="32"
          cy="32"
          r="21"
          fill={gold ? "#f6e3ae" : "#e7e6f2"}
          fillOpacity=".7"
          stroke={gold ? "#b79250" : "#9591b4"}
          strokeWidth="1"
        />
        {gold ? (
          <>
            <path d="m19 25 7 5 6-11 6 11 7-5-4 16H23Z" fill="#b58d48" />
            <path
              d="M24 45h16"
              stroke="#b58d48"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <path d="m22 21-7 10 17 17 17-17-7-10Z" fill="#aaa6c7" />
            <path
              d="m22 21 3 10 7 17 7-17 3-10M15 31h34m-24 0 7-10 7 10"
              stroke="#eeedf7"
              strokeWidth="1.3"
            />
          </>
        )}
      </svg>
      <span className="badge-shimmer" aria-hidden="true" />
    </motion.span>
  );
}
