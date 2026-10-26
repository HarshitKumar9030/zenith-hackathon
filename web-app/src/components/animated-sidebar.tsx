"use client";
import SidebarPlanCard from "./sidebar-plan-card";
import { useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  Trophy,
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
  { label: "Discovery Points", Icon: Trophy },
  { label: "Settings", Icon: Settings },
];
export default function AnimatedSidebar({
  page,
  role,
  accountType,
  onNavigate,
  membership,
  signedIn,
}: {
  page: string;
  role?: string;
  accountType?: string;
  onNavigate: (page: string) => void;
  signedIn?: boolean;
  membership?: {
    plan: string;
    remainingPickups: number;
    remainingKg: number;
  } | null;
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
                  { label: "Helper collections", Icon: CalendarDays },
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
      <SidebarPlanCard helper={accountType === "helper"} signedIn={signedIn} membership={membership} onNavigate={onNavigate}/>

    </aside>
  );
}
