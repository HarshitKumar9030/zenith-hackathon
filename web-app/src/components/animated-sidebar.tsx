"use client";
import { useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  Home,
  ScanLine,
  Clock3,
  Settings,
  Leaf,
  CalendarDays,
  Gift,
  CreditCard,
  Truck,
  ShieldCheck,
  Wallet,
  MapPin,
} from "lucide-react";
const items = [
  { label: "Overview", Icon: Home },
  { label: "Identify waste", Icon: ScanLine },
  { label: "My history", Icon: Clock3 },
  { label: "Plans", Icon: CreditCard },
  { label: "Pickups", Icon: CalendarDays },
  { label: "Rewards", Icon: Gift },
  { label: "Settings", Icon: Settings },
];
export default function AnimatedSidebar({
  page,
  role,
  accountType,
  onNavigate,
}: {
  page: string;
  role?: string;
  accountType?: string;
  onNavigate: (page: string) => void;
}) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);
  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 410, damping: 34 };
  return (
    <aside className="sidebar animated-sidebar">
      <motion.a
        className="brand"
        href="/"
        aria-label="Waste Right home"
        initial={{ opacity: 0, y: reduce ? 0 : -7 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.4 }}
        whileHover={reduce ? undefined : { scale: 1.02 }}
      >
        <Leaf size={30} strokeWidth={2.2} />
        <span>
          Waste Right<span className="brand-dot">.</span>
        </span>
      </motion.a>
      <LayoutGroup id="sidebar-navigation">
        <motion.nav
          aria-label="Main navigation"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: reduce ? 0 : 0.065,
                delayChildren: reduce ? 0 : 0.08,
              },
            },
          }}
          onMouseLeave={() => setHovered(null)}
        >
          {[
            ...(accountType === "helper"
              ? [
                  { label: "Helper dashboard", Icon: Truck },
                  { label: "Helper earnings", Icon: Wallet },
                  { label: "Service area", Icon: MapPin },
                  { label: "Settings", Icon: Settings },
                ]
              : items),
            ...(role === "admin"
              ? [{ label: "Operations", Icon: ShieldCheck }]
              : []),
          ].map(({ label, Icon }) => (
            <motion.button
              key={label}
              className={`nav-item ${page === label ? "active" : ""}`}
              aria-label={label}
              title={label}
              aria-current={page === label ? "page" : undefined}
              onClick={() => onNavigate(label)}
              onMouseEnter={() => setHovered(label)}
              onFocus={() => setHovered(label)}
              onBlur={() => setHovered(null)}
              variants={{
                hidden: { opacity: 0, x: reduce ? 0 : -9 },
                visible: { opacity: 1, x: 0 },
              }}
              transition={{ duration: reduce ? 0 : 0.32 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
            >
              {hovered === label && page !== label && (
                <motion.span
                  className="nav-surface hover-surface"
                  layoutId="navigation-hover"
                  transition={spring}
                  aria-hidden="true"
                />
              )}
              {page === label && (
                <motion.span
                  className="nav-surface active-surface"
                  layoutId="navigation-active"
                  transition={spring}
                  aria-hidden="true"
                />
              )}
              <motion.span
                className="nav-icon"
                animate={{
                  rotate: reduce ? 0 : page === label ? [0, -8, 5, 0] : 0,
                  scale: page === label ? 1.06 : 1,
                }}
                transition={{ duration: reduce ? 0 : 0.36 }}
              >
                <Icon size={19} />
              </motion.span>
              <span className="nav-label">{label}</span>
            </motion.button>
          ))}
        </motion.nav>
      </LayoutGroup>
      <motion.div
        className="sidebar-bottom"
        initial={{ opacity: 0, y: reduce ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.3 }}
      >
        <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <motion.path
            d="M50 86V47M50 64C21 68 18 45 18 34c22-1 34 9 32 30ZM50 48C49 21 64 13 85 14c0 23-11 38-35 34Z"
            stroke="currentColor"
            strokeWidth="2"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduce ? 0 : 1.4, delay: reduce ? 0 : 0.3 }}
          />
          <motion.path
            d="m50 64-20-19m20 3 23-23"
            stroke="currentColor"
            strokeWidth="2"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.8 }}
          />
        </svg>
        <p>
          Small actions.
          <br />
          Lasting change.
        </p>
        <motion.span
          className="tiny-line"
          initial={{ scaleX: reduce ? 1 : 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : 0.75 }}
          style={{ transformOrigin: "left" }}
        />
        <small>Made for a better everyday.</small>
      </motion.div>
    </aside>
  );
}
