"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
export default function Dropdown({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div
      className="dropdown"
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!open) setOpen(true);
          else {
            const buttons =
              root.current?.querySelectorAll<HTMLButtonElement>(
                "[role=option]",
              );
            const index = Array.from(buttons || []).indexOf(
              document.activeElement as HTMLButtonElement,
            );
            buttons?.[(index + 1) % (buttons.length || 1)]?.focus();
          }
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const buttons =
            root.current?.querySelectorAll<HTMLButtonElement>("[role=option]");
          const index = Array.from(buttons || []).indexOf(
            document.activeElement as HTMLButtonElement,
          );
          buttons?.[
            (index - 1 + (buttons?.length || 0)) % (buttons?.length || 1)
          ]?.focus();
        }
      }}
    >
      <button
        type="button"
        className="select-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {options.find((o) => o.value === value)?.label || label}
        <ChevronDown size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -4 }}
            transition={{ duration: reduce ? 0 : 0.14 }}
            className="options"
            role="listbox"
            aria-label={label}
          >
            {options.map((option) => (
              <button
                type="button"
                key={option.value}
                role="option"
                aria-selected={value === option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  root.current?.querySelector("button")?.focus();
                }}
              >
                {option.label}
                {value === option.value && <Check size={15} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
