"use client";
// Adapted from Aceternity UI's Resizable Navbar, by Manu Arora.
// https://ui.aceternity.com/components/resizable-navbar
import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { ArrowUpRight, Leaf, Menu, X } from "lucide-react";
const links = [
  { name: "How it works", href: "#how-it-works" },
  { name: "Plans", href: "#plans" },
  { name: "For helpers", href: "#helpers" },
  { name: "Quiz", href: "/quiz" },
];
export default function ResizableNavbar() {
  const [compact, setCompact] = useState(false),
    [open, setOpen] = useState(false),
    [hover, setHover] = useState<string | null>(null);
  const { scrollY } = useScroll(),
    reduce = useReducedMotion();
  useMotionValueEvent(scrollY, "change", (v) => setCompact(v > 80));
  return (
    <header className={`landing-nav-wrap ${compact ? "is-compact" : ""}`}>
      <motion.div
        className="landing-header"
        animate={{ maxWidth: compact ? 1080 : 1340 }}
        transition={{ duration: reduce ? 0 : 0.35 }}
      >
        <a className="landing-brand" href="/" aria-label="EcoMitra home">
          <Leaf size={29} strokeWidth={1.8} />
          <span>
            EcoMitra<span className="brand-dot">.</span>
          </span>
        </a>
        <nav
          aria-label="Landing navigation"
          onMouseLeave={() => setHover(null)}
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onMouseEnter={() => setHover(link.href)}
              onFocus={() => setHover(link.href)}
              onBlur={() => setHover(null)}
            >
              {hover === link.href && (
                <motion.span
                  className="nav-hover-surface"
                  layoutId="landing-nav-hover"
                  transition={{ duration: reduce ? 0 : 0.2 }}
                />
              )}
              <span>{link.name}</span>
            </a>
          ))}
        </nav>
        <a className="primary nav-open-app" href="/app">
          Open app <ArrowUpRight size={16} />
        </a>
        <button
          type="button"
          className="landing-menu-toggle"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </motion.div>
      <AnimatePresence>
        {open && (
          <motion.nav
            id="landing-mobile-menu"
            className="landing-mobile-menu"
            aria-label="Mobile landing navigation"
            initial={{ opacity: 0, y: reduce ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -8 }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
          >
            {links.map((link) => (
              <a
                href={link.href}
                key={link.href}
                onClick={() => setOpen(false)}
              >
                {link.name}
                <ArrowUpRight size={18} />
              </a>
            ))}
            <a href="/app">
              Open app
              <ArrowUpRight size={18} />
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
