"use client";
import { PLANS } from "@/lib/catalog";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, HelpCircle, Play, X } from "lucide-react";
export default function HelpTour({
  helper,
  onNavigate,
  blocked = false,
}: {
  helper: boolean;
  onNavigate: (page: string) => void;
  blocked?: boolean;
}) {
  const [tour, setTour] = useState(false),
    [help, setHelp] = useState(false),
    [step, setStep] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null),
    reduce = useReducedMotion();
  const key = `waste-right-tour-v2-${helper ? "helper" : "user"}`;
  const steps = helper
    ? [
        {
          page: "Helper dashboard",
          title: "Your collection workspace",
          text: "Accept available jobs after Operations approves your helper account. Collection addresses appear after you accept a job.",
        },
        {
          page: "Helper earnings",
          title: "Keep track of your work",
          text: "See recorded work payments and completed handovers. Each payment has a reference recorded by Operations.",
        },
        {
          page: "Service area",
          title: "Set your collection base",
          text: "Use your location once or enter your base address. Switch between English and Hindi from your dashboard.",
        },
      ]
    : [
        {
          page: "Overview",
          title: "Welcome to Waste Right",
          text: "Scan your waste, confirm what is present and arrange a pickup. Your plan and remaining allowance are always in the sidebar.",
        },
        {
          page: "Identify waste",
          title: "Scan. Check. Continue.",
          text: "Use your phone camera or describe your items. Remove incorrect detections, confirm the checklist and continue straight to pickup booking.",
        },
        {
          page: "Pickups",
          title: "A price before you book",
          text: "Choose a date and pickup time. Your helper weighs the waste at collection. A plan or reward credit covers the pickup fee; any sorting charge is shown on your measured receipt.",
        },
        {
          page: "Rewards",
          title: "A small daily habit",
          text: "Earn one point on each day you confirm a new scan. Ten points redeem a pickup credit, up to twice per month. Sorting and evening fees still apply.",
        },
      ];
  useEffect(() => {
    if (!localStorage.getItem(key)) {
      setStep(0);
      setTour(true);
    }
  }, [key]);
  useEffect(() => {
    if ((tour || help) && !blocked) {
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [tour, help, blocked]);
  function close() {
    if (tour) localStorage.setItem(key, "seen");
    setTour(false);
    setHelp(false);
  }
  function next(n: number) {
    if (n >= steps.length) {
      close();
      return;
    }
    setStep(n);
    onNavigate(steps[n].page);
  }
  return (
    <>
      <button
        type="button"
        className="help-trigger"
        aria-label="Help & tour"
        onClick={() => {
          setTour(false);
          setHelp(true);
        }}
      >
        <HelpCircle size={18} />
        <span>Help</span>
      </button>
      <dialog
        ref={dialog}
        className={`guidance-dialog ${tour ? "tour-dialog" : "help-dialog"}`}
        onCancel={close}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <button
          type="button"
          className="icon-button guidance-close"
          aria-label="Close help"
          onClick={close}
        >
          <X size={20} />
        </button>
        {tour ? (
          <>
            <span className="tour-progress">
              A quick introduction · {step + 1} of {steps.length}
            </span>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: reduce ? 0 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduce ? 0 : -12 }}
                transition={{ duration: reduce ? 0 : 0.18 }}
              >
                <h2>{steps[step].title}</h2>
                <p>{steps[step].text}</p>
              </motion.div>
            </AnimatePresence>
            <div className="tour-dots" aria-hidden="true">
              {steps.map((s, i) => (
                <span key={s.page} className={i === step ? "selected" : ""} />
              ))}
            </div>
            <div className="tour-actions">
              <button
                type="button"
                className="text-button"
                onClick={() => (step ? next(step - 1) : close())}
              >
                {step ? (
                  <>
                    <ArrowLeft size={15} />
                    Back
                  </>
                ) : (
                  "Skip tour"
                )}
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => next(step + 1)}
              >
                {step === steps.length - 1 ? "Finish tour" : "Next"}
                <ArrowRight size={15} />
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>A little help.</h2>
            <p>Answers for your next pickup.</p>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setHelp(false);
                setStep(0);
                setTour(true);
                onNavigate(steps[0].page);
              }}
            >
              <Play size={16} />
              Replay the demo tour
            </button>
            {[
              {
                q: "What will my pickup cost?",
                a: `Basic pickups cost ₹${PLANS.basic.price} for either separated or unsegregated waste, up to ${PLANS.basic.perPickupKg} kg. Gold and Platinum use your remaining allowance. A reward credit covers the pickup fee. Segregation is included in Gold and Platinum. Basic and reward pickups with unsegregated waste add ₹5/kg based on the helper’s measured weight. You approve this receipt before the additional charge becomes due. No evening surge applies during the hackathon.`,
              },
              {
                q: "When can I book?",
                a: "For the hackathon, pickups are available 24 hours in India time, with no break or surge charge. Arrival estimates appear when your assigned helper shares a fresh location.",
              },
              {
                q: "Can I correct or remove an item?",
                a: "Open a scan in My history. Edit its checklist, remove incorrect detected products, or remove the entire scan from history. Removing history does not cancel an existing pickup; manage that under My history → Receipts & disputes.",
              },
              {
                q: "Why is my pickup waiting for payment?",
                a: "Pay from your pickup record. Any upfront amount must be paid before scheduling. Extra sorting charges are based on the helper’s measured weight and appear after you approve the receipt. If checkout is unavailable, your request stays saved.",
              },
              {
                q: "What about batteries or hazardous waste?",
                a: "Special-handling or uncertain items cannot be booked as an ordinary pickup. Correct the scan only if you can verify the material and handling requirements. Contact your locality’s appropriate collection service for these items.",
              },
            ].map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </>
        )}
      </dialog>
    </>
  );
}
