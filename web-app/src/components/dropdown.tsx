"use client";
import { useEffect, useId, useRef, useState } from "react";
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
  const root = useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),listId=useId(),focusMode=useRef<"selected"|"first"|"last">("selected");
  useEffect(() => {
    const close = (e: MouseEvent) => {if (!root.current?.contains(e.target as Node)) setOpen(false)};
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(()=>{
    if(!open)return;
    const frame=requestAnimationFrame(()=>{
      const buttons=Array.from(root.current?.querySelectorAll<HTMLButtonElement>("[role=option]")||[]);
      const index=focusMode.current==="last"?buttons.length-1:focusMode.current==="first"?0:Math.max(0,options.findIndex(o=>o.value===value));
      buttons[index]?.focus();
    });return()=>cancelAnimationFrame(frame);
  },[open]);
  return (
    <div
      className="dropdown"
      ref={root}
      onBlur={e=>{if(!root.current?.contains(e.relatedTarget as Node))setOpen(false)}}
      onKeyDown={e=>{
        if(e.key==="Escape"&&open){e.preventDefault();e.stopPropagation();setOpen(false);trigger.current?.focus();return;}
        if(!["ArrowDown","ArrowUp","Home","End"].includes(e.key))return;
        if(!open){if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();focusMode.current=e.key==="ArrowUp"?"last":"first";setOpen(true)}return;}
        e.preventDefault();
        const buttons=Array.from(root.current?.querySelectorAll<HTMLButtonElement>("[role=option]")||[]),index=buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next=e.key==="Home"?0:e.key==="End"?buttons.length-1:e.key==="ArrowDown"?(index+1)%buttons.length:(index-1+buttons.length)%buttons.length;
        buttons[next]?.focus();
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="select-trigger"
        aria-label={label}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {focusMode.current="selected";setOpen(!open)}}
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
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              width: "100%",
              zIndex: 40,
            }}
            id={listId}
            role="listbox"
            aria-label={label}
          >
            {options.map((option) => (
              <button
                type="button"
                key={option.value}
                role="option"
                tabIndex={value===option.value?0:-1}
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
