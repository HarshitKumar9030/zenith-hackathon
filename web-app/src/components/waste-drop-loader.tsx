"use client";
import { useEffect, useRef } from "react";
import styles from "./waste-drop-loader.module.css";

/** Decorative only; the surrounding scan UI announces real request status. */
export default function WasteDropLoader({ compact = false }: { compact?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let visible = true;
    const sync = () => element.style.setProperty("--drop-play", visible && !document.hidden ? "running" : "paused");
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);
  return <div ref={root} className={`${styles.loader} ${compact ? styles.compact : ""}`} aria-hidden="true" data-waste-loader={compact ? "camera" : "upload"}>
    <svg viewBox="0 0 200 180" fill="none" focusable="false">
      <g className={styles.box}>
        {/* Rear flaps and dark interior sit behind the falling objects. */}
        <path d="m49 99 51-29 51 29-51 30Z" fill="#a3a798" />
        <path d="m49 99 51-29-15-17-51 29Z" fill="#e7e0d0" />
        <path d="m100 70 51 29 15-17-51-29Z" fill="#d0c3a9" />
        <path d="m60 99 40-23 40 23-40 24Z" fill="#657668" />
        <g className={`${styles.item} ${styles.first}`}>
          <path d="m83 18 17-9 17 9-17 10Z" fill="#e6ddc9" />
          <path d="m83 18 17 10v22l-17-10Z" fill="#c6b28e" />
          <path d="m100 28 17-10v22l-17 10Z" fill="#a08b69" />
          <path d="m91 14 18 10v9l-6 3v-9L85 17Z" fill="#f5eddd" />
        </g>
        <g className={`${styles.item} ${styles.second}`}>
          <path d="m94 13 11-2 5 4v10l8 9v24l-22 5-11-7V35l9-10Z" fill="#b6d4c3" />
          <path d="m105 11 5 4v10l8 9v24l-10 3V36l-7-10V16Z" fill="#709b86" />
          <path d="m89 38 19 4v14l-19-4Z" fill="#eff0df" />
          <path d="m94 13 11-2 5 4-11 3-5-3Z" fill="#aaa0cc" />
          <path d="m94 15 5 3 11-3v6l-11 3-5-3Z" fill="#77679e" />
        </g>
        <g className={`${styles.item} ${styles.third}`}>
          <path d="M85 40C81 18 96 9 119 14c1 23-13 40-30 32Z" fill="#a6c78b" />
          <path d="M89 46c12-5 22-17 30-32-17 8-27 16-30 32Z" fill="#6e976c" />
          <path d="m84 52 25-29m-13 13-1-9" stroke="#446e50" strokeWidth="2" strokeLinecap="round" />
        </g>
        {/* Front faces occlude the objects as they enter the box. */}
        <path d="m49 99 51 30v40l-51-30Z" fill="#d9c9ab" />
        <path d="m100 129 51-30v40l-51 30Z" fill="#b59e79" />
        <path d="m49 99 51 30-18 13-51-30Z" fill="#f0e7d6" />
        <path d="m100 129 51-30 18 13-51 30Z" fill="#ded2bb" />
        <path d="m120 142 12-7m-12 13 12-7" stroke="#7b765e" strokeWidth="2" strokeLinecap="round" />
        <path d="m63 133 10 6" stroke="#a79473" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  </div>;
}
