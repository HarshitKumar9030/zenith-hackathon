"use client";
import { useEffect, useRef } from "react";
import styles from "./captured-frame-drop.module.css";

/** A single transition of the actual submitted frame, independent of API latency. */
export default function CapturedFrameDrop({ frame, onComplete }: { frame: string; onComplete: () => void }) {
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => complete.current(), reduced ? 300 : 2450);
    return () => clearTimeout(timer);
  }, []);
  return <div className={styles.scene} aria-hidden="true" data-captured-frame-drop>
    <svg className={styles.rear} viewBox="0 0 200 180" fill="none">
      <path d="m49 99 51-29 51 29-51 30Z" fill="#9fa994" />
      <path d="m49 99 51-29-15-17-51 29Z" fill="#e7e0d0" />
      <path d="m100 70 51 29 15-17-51-29Z" fill="#d0c3a9" />
      <path d="m60 99 40-23 40 23-40 24Z" fill="#536e5d" />
    </svg>
    {/* This is the same in-memory JPEG passed to onScan, not a sample asset. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className={styles.photo} src={frame} alt="" onAnimationEnd={() => complete.current()} />
    <svg className={styles.front} viewBox="0 0 200 180" fill="none">
      <path d="m49 99 51 30v40l-51-30Z" fill="#d9c9ab" />
      <path d="m100 129 51-30v40l-51 30Z" fill="#b59e79" />
      <path d="m49 99 51 30-18 13-51-30Z" fill="#f0e7d6" />
      <path d="m100 129 51-30 18 13-51 30Z" fill="#ded2bb" />
      <path d="m120 142 12-7m-12 13 12-7" stroke="#7b765e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </div>;
}
