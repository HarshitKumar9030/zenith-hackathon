"use client";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Leaf,
  ScanLine,
  Truck,
  Weight,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { PLANS } from "@/lib/catalog";
import LandingHeroArt from "./landing-hero-art";
import TierBadge from "./tier-badge";
import ScanArt from "./scan-art";
import WorkflowArt from "./workflow-art";
import ResizableNavbar from "./ui/resizable-navbar";
import TextHoverEffect from "./ui/text-hover-effect";
import "./landing.css";
function WeighArt() {
  return (
    <svg
      viewBox="0 0 220 150"
      className="landing-weigh-art"
      fill="none"
      aria-hidden="true"
    >
      <path d="M24 126h169v12H24z" fill="#557a56" />
      <path d="M166 124V49" stroke="#71906b" strokeWidth="8" />
      <rect
        x="140"
        y="17"
        width="53"
        height="36"
        rx="7"
        fill="#eef3e8"
        stroke="#6d8c66"
        strokeWidth="3"
      />
      <path
        d="m154 35 8 7 17-18"
        stroke="#8aa776"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M61 48h25l-4 14c18 15 37 35 38 54H26c1-20 20-41 39-54Z"
        fill="#e9efe0"
        stroke="#a3b995"
        strokeWidth="2"
      />
      <path d="m56 88 15-8 14 8v24H56z" fill="#d8e0d0" />
      <path d="M85 72h11v15H85z" fill="#a7a0c8" />
      <path d="M87 87c-2 6-8 7-8 14v11h25v-11c0-7-6-8-8-14" fill="#e1ddee" />
      <path d="M43 101c2-12 11-17 22-16-1 13-10 18-22 16Z" fill="#c2d2b0" />
    </svg>
  );
}
export default function Landing() {
  const reduce = useReducedMotion();
  const reveal = {
    initial: { opacity: 0, y: reduce ? 0 : 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: reduce ? 0 : 0.55 },
  };
  return (
    <div className="landing">
      <a className="landing-skip" href="#main-content">
        Skip to content
      </a>
      <ResizableNavbar />
      <main id="main-content">
        <section className="landing-hero">
          <motion.div {...reveal} className="landing-hero-copy">
            <h1>
              Waste,
              <br />
              handled right.
            </h1>
            <p>
              Scan everyday waste. Confirm the details.
              <br className="desktop-only" /> Book a pickup. Your helper handles
              the weighing.
            </p>
            <div className="landing-actions">
              <a className="primary" href="/app?view=Identify%20waste">
                Start sorting <ArrowRight size={17} />
              </a>
              <a className="text-button" href="#how-it-works">
                See how it works <ArrowRight size={18} />
              </a>
            </div>
          </motion.div>
          <motion.div {...reveal} className="landing-visual">
            <LandingHeroArt />
          </motion.div>
          <div className="landing-facts">
            <span>
              <span className="fact-symbol">₹</span>₹{PLANS.basic.price} base pickup
            </span>
            <span>
              <Weight size={19} />
              Helper-measured weight
            </span>
            <span>
              <Leaf size={19} />
              No weighing at home
            </span>
          </div>
        </section>
        <section id="how-it-works" className="landing-how">
          <motion.div {...reveal} className="landing-section-heading">
            <h2>
              Three steps.
              <br className="mobile-only" /> Less effort.
            </h2>
            <p>From a quick scan to a clear collection receipt.</p>
          </motion.div>
          <div className="landing-steps">
            {[
              {
                title: "Scan your items",
                copy: "Use your camera or a description. Confirm what is actually there.",
                art: <ScanArt key="scan" />,
              },
              {
                title: "Choose your pickup",
                copy: "Pick a date and time. See the pickup fee before you confirm.",
                art: <WorkflowArt key="pickup" scene="pickup" />,
              },
              {
                title: "Weigh. Review. Done.",
                copy: "Your helper records the weight. You approve the receipt before extra charges are due.",
                art: <WeighArt key="weigh" />,
              },
            ].map((step, i) => (
              <motion.article {...reveal} key={step.title}>
                <div className="landing-step-body">
                  <div className="landing-step-art">{step.art}</div>
                  <div className="landing-step-title">
                    <span>{i + 1}</span>
                    <h3>{step.title}</h3>
                  </div>
                  <p className="landing-step-copy">{step.copy}</p>
                </div>
              </motion.article>
            ))}
          </div>
          <motion.div {...reveal} className="landing-scale-note">
            <WorkflowArt scene="reward" />
            <div>
              <h3>No scale? No problem.</h3>
              <p>
                Unsegregated waste adds ₹5/kg, based on your helper’s measured
                weight.
              </p>
            </div>
          </motion.div>
        </section>
        <section id="plans" className="landing-pricing">
          <motion.div {...reveal} className="landing-section-heading">
            <h2>A pickup. Or a routine.</h2>
            <p>Start small, or choose a monthly plan.</p>
          </motion.div>
          <div className="landing-plan-grid">
            {Object.entries(PLANS).map(([key, p]) => (
              <motion.article
                {...reveal}
                key={key}
                className={`landing-plan ${key}`}
              >
                <div className="landing-plan-body">
                  <div className="landing-plan-heading">
                    {key === "basic" ? (
                      <span className="basic-plan-icon">
                        <Leaf size={25} />
                      </span>
                    ) : (
                      <TierBadge tier={key as "gold" | "platinum"} size={48} />
                    )}
                    <div>
                      <h3>{p.name}</h3>
                      <span>
                        {key === "basic"
                          ? "For occasional pickups"
                          : key === "gold"
                            ? "For your weekly routine"
                            : "For a busier household"}
                      </span>
                    </div>
                  </div>
                  <p className="landing-plan-price">
                    ₹{p.price}
                    <span>/{key === "basic" ? "pickup" : "month"}</span>
                  </p>
                  <ul>
                    <li>
                      <Truck size={19} />
                      {p.pickups} pickup{p.pickups > 1 ? "s" : ""}
                    </li>
                    <li>
                      <Weight size={19} />
                      Up to {p.perPickupKg} kg per pickup
                    </li>
                    <li>
                      <Leaf size={19} />
                      {p.recoveryPercent
                        ? `${p.recoveryPercent}% positive net recovery share`
                        : "No recovery payout"}
                    </li>
                    {key !== "basic" && <li><Check size={19} />Segregation included</li>}
                  </ul>
                  <a
                    className="primary"
                    href={
                      key === "basic" ? "/app?view=Pickups" : "/app?view=Plans"
                    }
                  >
                    {key === "basic" ? "Book a pickup" : `View ${p.name}`}
                    <ArrowRight size={16} />
                  </a>
                </div>
              </motion.article>
            ))}
          </div>
          <p className="landing-pricing-note">
            Gold and Platinum include segregation. Basic/reward unsegregated waste: ₹5/kg after helper weighing. Evening fees apply.
            Monthly plans renew manually.
          </p>
          <details className="landing-fee-details">
            <summary>See collection hours and fee details</summary>
            <p>
              Choose 7 am–2 pm (before 2 pm), or 5 pm–7 pm, India time. The 2–5
              pm break is unavailable. Evening fees start at ₹5, plus ₹1 for
              unsegregated Basic/reward waste, and ₹1 after weighing if above 2 kg, up to ₹7.
              Gold and Platinum cover the base pickup fee and segregation. Reward pickups cover the base fee.
              Sorting is extra only for Basic/reward pickups; evening fees apply separately. Collection is subject to helper
              availability. Payment is required before a paid pickup is
              scheduled.
            </p>
          </details>
        </section>
        <section id="helpers" className="landing-helpers">
          <motion.div {...reveal}>
            <h2>
              Good work.
              <br />
              Clearly recorded.
            </h2>
            <p>
              A separate workspace for collection partners. See available jobs,
              record measured handovers and track work payments—in English or
              Hindi.
            </p>
            <a className="primary" href="/app?join=helper">
              Join as a helper <ArrowUpRight size={17} />
            </a>
            <small>
              Operations approval is required before accepting collections.
            </small>
          </motion.div>
          <motion.div {...reveal} className="helper-illustration">
            <WorkflowArt scene="pickup" />
            <div>
              <span>
                <Check size={18} />
                Collection jobs
              </span>
              <span>
                <Check size={18} />
                Measured receipts
              </span>
              <span>
                <Check size={18} />
                Recorded earnings
              </span>
            </div>
          </motion.div>
        </section>
        <section className="landing-final">
          <motion.div {...reveal}>
            <h2>
              A simpler next step
              <br />
              for everyday waste.
            </h2>
            <a className="primary" href="/app">
              Open Waste Right <ArrowRight size={17} />
            </a>
          </motion.div>
        </section>
      </main>
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-intro">
            <a className="landing-brand" href="/">
              <Leaf size={29} />
              <span>
                Waste Right<span className="brand-dot">.</span>
              </span>
            </a>
            <p>
              Less guesswork.
              <br />A better everyday routine.
            </p>
            <a className="footer-app-link" href="/app">
              Make your next pickup simpler <ArrowUpRight size={19} />
            </a>
          </div>
          <nav aria-label="Footer product links">
            <span>Explore</span>
            <a href="#how-it-works">How it works</a>
            <a href="#plans">Pickup plans</a>
            <a href="/app?view=Rewards">Streaks &amp; rewards</a>
          </nav>
          <nav aria-label="Footer community links">
            <span>Take part</span>
            <a href="/app?join=helper">Become a helper</a>
            <a href="/app?view=Pickups">Book a pickup</a>
            <a href="#plans">Fees &amp; collection hours</a>
          </nav>
        </div>
        <TextHoverEffect />
        <div className="footer-bottom">
          <small>© {new Date().getFullYear()} Waste Right</small>
          <span>
            <span className="footer-status" /> Scan. Confirm. Collect.
          </span>
          <a href="#main-content">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}
