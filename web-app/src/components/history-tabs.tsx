"use client";
import { useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import styles from "./history-list.module.css";

const tabs = [{ id: "scans", label: "Scans" }, { id: "collections", label: "Receipts & disputes" }] as const;
export type HistoryView = typeof tabs[number]["id"];

export default function HistoryTabs({ view, onChange, children }: { view: HistoryView; onChange: (view: HistoryView) => void; children: ReactNode }) {
  const id = useId(), reduce = useReducedMotion();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const direction = view === "collections" ? 1 : -1;
  return <>
    <div className={styles.tabs} role="tablist" aria-label="History view">
      {tabs.map((tab, index) => <button type="button" role="tab" id={`${id}-${tab.id}-tab`} aria-controls={`${id}-${tab.id}-panel`} aria-selected={view === tab.id} tabIndex={view === tab.id ? 0 : -1} key={tab.id} ref={(node) => { buttons.current[index] = node; }} onClick={() => onChange(tab.id)} onKeyDown={(e) => {
        let next: number;
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") next = (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = tabs.length - 1;
        else return;
        e.preventDefault(); onChange(tabs[next].id); buttons.current[next]?.focus();
      }}>
        {view === tab.id ? <motion.span className={styles.tabHighlight} layoutId={`${id}-active-history-tab`} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }} aria-hidden="true" /> : null}
        <span>{tab.label}</span>
      </button>)}
    </div>
    <div className={styles.tabStage}>
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div key={view} id={`${id}-${view}-panel`} role="tabpanel" aria-labelledby={`${id}-${view}-tab`} tabIndex={0} custom={direction}
          variants={{ enter: (d: number) => ({ opacity: reduce ? 1 : 0, x: reduce ? 0 : d * 12 }), visible: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: reduce ? 1 : 0, x: reduce ? 0 : -d * 8 }) }}
          initial="enter" animate="visible" exit="exit" transition={{ duration: reduce ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}>
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  </>;
}
