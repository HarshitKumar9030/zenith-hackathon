"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Leaf,
  Loader2,
  LogOut,
  ScanLine,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  Type,
} from "lucide-react";
import ScanArt from "./scan-art";
import CapturedFrameDrop from "./captured-frame-drop";
import { motion, useReducedMotion } from "framer-motion";
import DescriptionDetailsForm, {
  emptyDetails,
  type DescriptionDetails,
} from "./description-details";
import HistoryList from "./history-list";
import HistoryTabs, { type HistoryView } from "./history-tabs";
import HelpTour from "./help-tour";
import type { Account } from "@/lib/service";
import QuickPickup from "./quick-pickup";
import HelperDashboard from "./helper-dashboard";
import LiveCamera from "./live-camera";
import ServiceHub from "./service-hub";
import BenefitsPanel from "./benefits-panel";
import ConfirmationChecklist from "./confirmation-checklist";
import AnimatedSidebar from "./animated-sidebar";
import { AnimatedIllustration, PageTransition, Reveal } from "./animated-ui";
import Dropdown from "./dropdown";
import { streakSummary } from "@/lib/streak";
import type { Identification } from "@/lib/rules";
type User = {
  id: string;
  name: string;
  email: string;
  role?: string;
  accountType?: "user" | "helper";
};
export type Result = {
  confirmed?: boolean;
  _id: string;
  identification: Identification;
  recommendation: {
    status: string;
    category: string | null;
    steps: string[];
    message: string;
    rule: { passage: string; section: string } | null;
  };
  guideName: string | null;
  guideVersion: string | null;
  municipality: string | null;
  createdAt: string;
  latencyMs: number;
  correction?: { material: string };
};
const title = (value: string) => value.replaceAll("_", " ");
async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
export default function Dashboard() {
  const [photoFlight, setPhotoFlight] = useState(false);
  const reduceMotion = useReducedMotion();
  const [page, setPage] = useState("Overview"),
    [user, setUser] = useState<User | null>(null),
    [auth, setAuth] = useState(false),
    [signup, setSignup] = useState(false),
    [accountType, setAccountType] = useState("user"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [history, setHistory] = useState<Result[]>([]),
    [mode, setMode] = useState("camera"),
    [text, setText] = useState(""),
    [image, setImage] = useState(""),
    [ocr, setOcr] = useState(""),
    [fileName, setFileName] = useState(""),
    [result, setResult] = useState<Result | null>(null),
    [authBusy, setAuthBusy] = useState(false);
  const [descriptionDetails, setDescriptionDetails] =
    useState<DescriptionDetails>(emptyDetails);
  const [pickupScanId, setPickupScanId] = useState<string | undefined>();
  const [serviceAccount, setServiceAccount] = useState<Account | null>(null);
  const [liveStop, setLiveStop] = useState(0);
  const [historyView, setHistoryView] = useState<HistoryView>("scans");
  const scanEpoch = useRef(0);
  const currentPage = useRef(page);
  currentPage.current = page;
  const [activityDays, setActivityDays] = useState<string[]>([]);
  const streak = streakSummary(activityDays);
  const upload = useRef<HTMLInputElement>(null),
    camera = useRef<HTMLInputElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const refresh = useCallback(async () => {
    try {
      const [h, a, s] = await Promise.all([
        api("history"),
        api("activity"),
        api("service"),
      ]);
      setServiceAccount(s.account);
      setActivityDays(a.days);
      setHistory(h.items);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }, []);
  useEffect(() => {
    api("auth/session")
      .then((data) => {
        setUser(data.user);
        const query = new URLSearchParams(window.location.search);
        const requested = query.get("view");
        if (data.user?.accountType === "helper") { const helperView = new URLSearchParams(window.location.search).get("view"); setPage(helperView && ["Helper dashboard", "Helper collections", "Helper earnings", "Service area"].includes(helperView) ? helperView : "Helper dashboard"); }
        else if (requested && ["Overview", "Identify waste", "My history", "Plans", "Pickups", "Rewards", "Settings"].includes(requested)) setPage(requested);
        if (!data.user && query.get("join") === "helper") {
          setSignup(true); setAccountType("helper"); setAuth(true);
        }
        if (data.user) void refresh();
      })
      .catch((e) => setMessage(e.message));
  }, [refresh]);
  useEffect(() => {
    if (auth) {
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [auth]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 9000);
    return () => clearTimeout(timer);
  }, [message]);
  async function pick(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Please use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Please use an image smaller than 10 MB.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 40000000) {
        bitmap.close();
        throw new Error("Image dimensions are too large.");
      }
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      canvas.width = bitmap.width * scale;
      canvas.height = bitmap.height * scale;
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      setImage(canvas.toDataURL("image/jpeg", 0.88));
      setFileName(file.name);
      setMode("photo");
      setOcr("");
      setResult(null);
      setPage("Identify waste");
    } catch {
      setMessage("That image could not be opened. Try another photo.");
    }
  }
  async function readLabel() {
    if (!image) return;
    setBusy(true);
    setProgress("Reading packaging text…");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      try {
        const { data } = await worker.recognize(image);
        setOcr(data.text.slice(0, 8000));
        setMessage(
          data.text.trim()
            ? "Label text extracted. Review it before identifying."
            : "No readable text found. You can still identify this image.",
        );
      } finally {
        await worker.terminate();
      }
    } catch {
      setMessage(
        "OCR could not load. Check your connection or enter label text manually.",
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  async function identify() {
    if (!user) {
      setAuth(true);
      return;
    }
    const description = result?.identification.clarification_question
      ? `Original item: ${result.identification.object_name}. ${result.identification.explanation} Question: ${result.identification.clarification_question} User answer: ${text}`
      : text;
    setBusy(true);
    setProgress("Looking closely at your item…");
    if (mode === "photo" && image) setPhotoFlight(true);
    setResult(null);
    try {
      const data = await api("classify", "POST", {
        text: description.slice(0,4000),
        observedDetails: mode === "text" ? descriptionDetails : undefined,
        ocr,
        image: mode === "photo" ? image : undefined,
      });
      setResult(data);
      void refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  async function scanLive(frame: string, labelText = "") {
    if (!user) {
      setAuth(true);
      throw new Error("Sign in before starting a live identification.");
    }
    const epoch = scanEpoch.current;
    const data = await api("classify", "POST", {
      image: frame,
      preview: true,
      text,
      ocr: labelText,
    });
    if (currentPage.current === "Identify waste" && epoch === scanEpoch.current)
      setResult(data);
  }
  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const data = await api(`auth/${signup ? "signup" : "login"}`, "POST", {
        ...Object.fromEntries(form),
        ...(signup ? { accountType } : {}),
      });
      setUser(data.user);
      setPage(
        data.user.accountType === "helper" ? "Helper dashboard" : "Overview",
      );
      setAuth(false);
      await refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setAuthBusy(false);
    }
  }
  async function signOut() {
    try {
      await api("auth/logout", "POST");
      setUser(null);
      setServiceAccount(null);
      setHistory([]);
      setActivityDays([]);
      setResult(null);
      setPage("Overview");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function exportHistory() {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "wastewise-history.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  const confirmedCount = history.filter((h) => h.confirmed).length;
  const needsReview = (h: Result) =>
    Boolean(
      h.identification.clarification_question ||
      h.identification.material === "unknown",
    );
  function resultPanel(item: Result) {
    return (
      <Reveal className="result-panel">
        <div className="section-heading">
          <div>
            <span className="micro">IDENTIFICATION</span>
            <h2>{item.identification.object_name}</h2>
          </div>
          <span className={`status ${item.confirmed ? "good" : ""}`}>
            {item.confirmed ? "Confirmed" : "Review checklist"}
          </span>
        </div>
        <ConfirmationChecklist
          key={item._id + JSON.stringify(item.identification.detected_items)}
          id={item._id}
          identification={item.identification}
          confirmed={item.confirmed}
          notify={setMessage}
          onSchedule={
            page === "My history"
              ? () => {
                  setPickupScanId(item._id);
                  setPage("Pickups");
                  setResult(null);
                }
              : undefined
          }
          onRemoved={() => {
            setResult(null);
            void refresh();
          }}
          onConfirmed={(value) => {
            scanEpoch.current++;
            setLiveStop((v) => v + 1);
            setResult(value as Result);
            void refresh();
          }}
        />
        {item.confirmed && page === "Identify waste" && (
          <QuickPickup
            key={item._id + item.identification.object_name}
            scanId={item._id}
            onRecords={() => { setHistoryView("collections"); setPage("My history"); }}
            notify={setMessage}
            onPlans={() => setPage("Plans")}
            onBooked={() => void refresh()}
          />
        )}
        {!item.confirmed && (
          <>
            <div className="attribute-row">
              <span>
                {title(
                  item.correction?.material || item.identification.material,
                )}
              </span>
              <span>{item.identification.physical_state}</span>
              <span>
                Special handling: {item.identification.special_handling}
              </span>
            </div>
            <p>{item.identification.explanation}</p>
            {item.identification.clarification_question && (
              <div className="clarification">
                <AnimatedIllustration
                  asset="abstract-illustration-question-mark.svg"
                  className="clarification-art"
                />
                <h3>A quick clarification</h3>
                <p>{item.identification.clarification_question}</p>
                <input
                  aria-label="Clarification answer"
                  placeholder="Tell us what you can see…"
                  onChange={(e) => setText(e.target.value)}
                />
                <button className="primary" disabled={busy} onClick={identify}>
                  Reassess with my answer <ArrowRight size={16} />
                </button>
              </div>
            )}
            {item.recommendation.rule && (
              <div className="recommendation">
                <ShieldCheck size={24} />
                <div>
                  <h3>
                    {item.recommendation.category ||
                      "Guidance needs more evidence"}
                  </h3>
                  <p>{item.recommendation.message}</p>
                  {item.recommendation.steps.length > 0 && (
                    <ol>
                      {item.recommendation.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  )}
                  {item.recommendation.rule && (
                    <>
                      <blockquote>
                        “{item.recommendation.rule.passage}”
                      </blockquote>
                      <small>
                        {item.guideName} · {item.municipality} ·{" "}
                        {item.guideVersion} · {item.recommendation.rule.section}
                      </small>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Reveal>
    );
  }
  return (
    <div className="app-shell">
      <AnimatedSidebar
        role={user?.role}
        signedIn={Boolean(user)}
        membership={
          serviceAccount?.membership as {
            plan: string;
            remainingPickups: number;
            remainingKg: number;
          } | null
        }
        accountType={user?.accountType}
        page={page}
        onNavigate={(next) => {
          setPickupScanId(undefined);
          setPage(next);
          setResult(null);
        }}
      />
      <div className="main-shell">
        <header className="topbar">
          <span>{page}</span>
          <div className="top-actions">
            <HelpTour
              helper={user?.accountType === "helper"}
              onNavigate={setPage}
              blocked={auth}
            />
            <button
              className="account"
              aria-label={user ? `Account: ${user.name}` : "Sign in"}
              onClick={() => (user ? setPage("Settings") : setAuth(true))}
            >
              <span className="avatar">
                {user ? user.name.charAt(0).toUpperCase() : <Leaf size={15} />}
              </span>
              <span>{user ? user.name : "Sign in"}</span>
            </button>
          </div>
        </header>
        <PageTransition page={page}>
          {page === "Overview" && (
            <>
              <div className="page-heading">
                <h1>
                  A little care.
                  <br className="mobile-break" /> A cleaner tomorrow.
                </h1>
                <p>Know your waste. Scan, confirm and arrange collection.</p>
              </div>
              <div className="overview-grid">
                <section
                  className="upload-hero"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void pick(e.dataTransfer.files[0]);
                  }}
                >
                  <ScanArt />
                  <h2>Give your waste a second thought.</h2>
                  <p>
                    A bottle, a takeaway box, that confusing wrapper.
                    <br />
                    Let’s figure it out together.
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      setMode("camera");
                      setPage("Identify waste");
                    }}
                  >
                    <Upload size={18} />
                    Start live scan
                    <ArrowRight size={17} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      setMode("text");
                      setPage("Identify waste");
                    }}
                  >
                    Or describe your item <ArrowRight size={14} />
                  </button>
                  <small>JPG, PNG or WebP · Up to 10 MB</small>
                </section>
                <section className="how-it-works">
                  <h2>
                    A thoughtful way
                    <br />
                    to throw things away.
                  </h2>
                  <p>Less guessing. More clarity.</p>
                  {[
                    {
                      n: "01",
                      Icon: Camera,
                      name: "Start with your item",
                      copy: "Take a clear photo or write a short description.",
                    },
                    {
                      n: "02",
                      Icon: Search,
                      name: "Look a little closer",
                      copy: "Identify the material. Answer a question if something is unclear.",
                    },
                    {
                      n: "03",
                      Icon: Check,
                      name: "Confirm and arrange collection",
                      copy: "Review what was detected, then book a pickup.",
                    },
                  ].map(({ n, Icon, name, copy }) => (
                    <div className="step" key={n}>
                      <span className="step-n">{n}</span>
                      <div>
                        <Icon size={23} />
                        <h3>{name}</h3>
                        <p>{copy}</p>
                      </div>
                    </div>
                  ))}
                </section>
              </div>
              <section
                className="streak-band"
                aria-label="Daily identification streak"
              >
                <div className="streak-intro">
                  <img
                    className={streak.streak ? "fire-icon lit" : "fire-icon"}
                    src="/assets/fire.svg"
                    alt=""
                    width="35"
                    height="40"
                  />
                  <div>
                    <h3>
                      {streak.streak} day{streak.streak === 1 ? "" : "s"} of
                      showing up
                    </h3>
                    <p>
                      {streak.todayActive
                        ? "You made time for a thoughtful choice today."
                        : "Scan your waste today to keep the habit growing."}
                    </p>
                  </div>
                </div>
                <div className="streak-week" aria-label="Last seven days">
                  {streak.week.map((day) => (
                    <div key={day.date} className="streak-day">
                      <span>
                        {new Intl.DateTimeFormat("en", {
                          weekday: "narrow",
                          timeZone: "UTC",
                        }).format(new Date(day.date + "T12:00:00Z"))}
                      </span>
                      <span
                        className={`day-dot ${day.active ? "done" : ""} ${day.today ? "today" : ""}`}
                        aria-label={`${day.date}: ${day.active ? "item identified" : "no saved identification"}`}
                      >
                        {day.active ? (
                          <Check size={13} />
                        ) : day.today ? (
                          "·"
                        ) : (
                          ""
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              {user && <BenefitsPanel />}
              <div className="service-shortcuts">
                <button
                  className="secondary"
                  onClick={() => setPage("Pickups")}
                >
                  Arrange a pickup <ArrowRight size={15} />
                </button>
                <button
                  className="secondary"
                  onClick={() => setPage("Rewards")}
                >
                  Scan points & free pickups <ArrowRight size={15} />
                </button>
                <button className="secondary" onClick={() => setPage("Plans")}>
                  Explore collection plans <ArrowRight size={15} />
                </button>
              </div>
              <div className="stats">
                {[
                  {
                    name: "Scans saved",
                    value: history.length,
                    Icon: Leaf,
                  },
                  {
                    name: "Confirmed scans",
                    value: confirmedCount,
                    Icon: ShieldCheck,
                  },
                  {
                    name: "Needs a closer look",
                    value: history.filter(needsReview).length,
                    Icon: ScanLine,
                  },
                ].map(({ name, value, Icon }) => (
                  <div className="stat" key={name}>
                    <span className="stat-icon">
                      <Icon size={23} />
                    </span>
                    <div>
                      <p>{name}</p>
                      <strong>{value.toString().padStart(2, "0")}</strong>
                    </div>
                  </div>
                ))}
              </div>
              <section className="activity">
                <div className="section-heading">
                  <h2>Your recent activity</h2>
                  <button
                    className="text-button"
                    onClick={() => setPage("My history")}
                  >
                    View all <ArrowRight size={15} />
                  </button>
                </div>
                {history.length ? (
                  history.slice(0, 3).map((item) => (
                    <button
                      className="history-row mt-2"
                      key={item._id}
                      onClick={() => {
                        setResult(item);
                        setPage("My history");
                      }}
                    >
                      <span className="item-icon">
                        <Leaf size={20} />
                      </span>
                      <span>
                        <strong>{item.identification.object_name}</strong>
                        <small>{title(item.identification.material)}</small>
                      </span>
                      <span className="status">
                        {item.confirmed ? "Confirmed" : "Review needed"}
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))
                ) : (
                  <div className="empty">
                    <div className="empty-art">
                      <Leaf size={29} strokeWidth={1.3} />
                    </div>
                    <h3>A fresh start.</h3>
                    <p>
                      {user
                        ? "Your first identification will appear here."
                        : "Sign in to keep a little history of your everyday choices."}
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
          {page === "Identify waste" && (
            <>
              <div className="page-heading">
                <h1>What are we sorting today?</h1>
                <p>Start with what you can see. We’ll help with the rest.</p>
              </div>
              <div className="identify-grid">
                <section>
                  <div
                    className="tabs"
                    role="tablist"
                    aria-label="Input method"
                  >
                    {[
                      { id: "camera", label: "Live camera", Icon: ScanLine },
                      { id: "photo", label: "Photo", Icon: Camera },
                      { id: "text", label: "Write a description", Icon: Type },
                    ].map(({ id, label, Icon }) => (
                      <button
                        role="tab"
                        aria-selected={mode === id}
                        className={mode === id ? "selected" : ""}
                        key={id}
                        onClick={() => {
                          setMode(id);
                          setResult(null);
                        }}
                      >
                        {mode === id && (
                          <motion.span
                            className="input-tab-highlight"
                            layoutId="input-method-active"
                            transition={{ duration: reduceMotion ? 0 : 0.22 }}
                          />
                        )}
                        <Icon size={17} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                  {mode === "camera" ? (
                    <LiveCamera
                      onDescribe={() => setMode("text")}
                      stopSignal={liveStop}
                      onScan={scanLive}
                      onError={setMessage}
                    />
                  ) : mode === "photo" ? (
                    <div
                      className="scan-upload"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        void pick(e.dataTransfer.files[0]);
                      }}
                    >
                      {image ? (
                        <>
                          <div style={{ position: "relative", maxWidth: "100%", borderRadius: 12 }}>
                            <img
                              className="preview"
                              src={image}
                              alt="Your waste item"
                              style={{ display: "block", opacity: photoFlight ? 0 : 1 }}
                            />
                            {photoFlight && <CapturedFrameDrop frame={image} onComplete={() => setPhotoFlight(false)} />}
                          </div>
                          <p>{fileName}</p>
                          <div className="inline-actions">
                            <button
                              className="secondary"
                              onClick={() => upload.current?.click()}
                            >
                              Change image
                            </button>
                            <button
                              className="secondary"
                              onClick={readLabel}
                              disabled={busy}
                            >
                              <FileText size={16} />
                              Read label with OCR
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <ScanArt busy={busy} />
                          <h2>A clearer photo. A better answer.</h2>
                          <p>
                            Clear lighting and visible packaging labels if
                            visible.
                          </p>
                          <div className="inline-actions">
                            <button
                              className="primary"
                              onClick={() => upload.current?.click()}
                            >
                              <Upload size={17} />
                              Choose an image
                            </button>
                            <button
                              className="secondary"
                              onClick={() => camera.current?.click()}
                            >
                              <Camera size={17} />
                              Camera
                            </button>
                          </div>
                          <small>
                            JPG, PNG, WebP · Up to 10 MB · or drop a file here
                          </small>
                        </>
                      )}
                    </div>
                  ) : (
                    <label className="field">
                      Describe your item
                      <textarea
                        aria-label="Describe your item"
                        value={text}
                        maxLength={4000}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="For example: a paper takeaway cup, with a shiny lining inside and some coffee left in it."
                        rows={7}
                      />
                      <small>
                        Include visible materials, residue, and any packaging
                        symbols.
                      </small>
                    </label>
                  )}
                  {mode === "text" && text.trim() && (
                    <DescriptionDetailsForm
                      value={descriptionDetails}
                      onChange={setDescriptionDetails}
                    />
                  )}
                  {mode === "photo" && (
                    <label className="field">
                      Anything else we should know?
                      <input
                        value={text}
                        maxLength={4000}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Residue, lining, or anything the photo doesn’t show…"
                      />
                    </label>
                  )}
                  {(ocr || image) && (
                    <details className="ocr-details">
                      <summary>
                        Packaging text · OCR <FileText size={15} />
                      </summary>
                      <textarea
                        aria-label="Extracted packaging text"
                        value={ocr}
                        maxLength={8000}
                        onChange={(e) => setOcr(e.target.value)}
                        placeholder="Extract or type packaging text here. OCR can make mistakes."
                        rows={4}
                      />
                    </details>
                  )}
                  {busy && (
                    <Reveal className="processing-state">
                      <div>
                        <h3>A closer look, a clearer answer.</h3>
                        <p role="status">{progress}</p>
                      </div>
                    </Reveal>
                  )}
                  {mode !== "camera" && (
                    <button
                      className="primary identify-button"
                      onClick={identify}
                      disabled={
                        busy || !(mode === "photo" ? image : text.trim())
                      }
                    >
                      {busy ? (
                        <Loader2 className="spin" size={17} />
                      ) : (
                        <ScanLine size={17} />
                      )}{" "}
                      {busy ? progress : "Identify my item"}{" "}
                      {!busy && <ArrowRight size={17} />}
                    </button>
                  )}
                  <small className="privacy-note">
                    Frames are analysed while your camera is running. Images are
                    not saved or used for training.
                  </small>
                </section>
                <aside className="scan-notes scanner-guide">
                  <span className="scanner-guide-label">A little guidance</span>
                  <h2>A clear view.<br/>A simpler pickup.</h2>
                  <ol className="scan-guide-steps"><li><span>1</span><div><h3>Show the whole collection</h3><p>Keep items visible, with labels facing the camera. Good lighting helps.</p></div></li><li><span>2</span><div><h3>Review what we find</h3><p>Remove mistaken items or correct materials. You have the final say.</p></div></li><li><span>3</span><div><h3>Choose a pickup</h3><p>Confirm your items, choose a time and check the fee. Your helper weighs at collection.</p></div></li></ol>
                  <div className="scanner-guide-note"><Leaf size={21}/><p>Mixed packaging or an unclear image? Add a description or scan from another angle.</p></div>
                </aside>
              </div>
              {result && resultPanel(result)}
            </>
          )}
          {page === "My history" && (
            <>
              <div className="page-heading"><h1>My history.</h1><p>Your scans, collection receipts and disputes.</p></div>
              <HistoryTabs view={historyView} onChange={(view) => { setHistoryView(view); setResult(null); }}>
                {historyView === "scans" ? (result ? <div id="history-detail" className="history-detail-view"><button className="text-button" onClick={() => setResult(null)}>Back to scans</button>{resultPanel(result)}</div> : <HistoryList hideHeading items={history} onOpen={setResult} onRefresh={() => void refresh()} onScan={() => setPage("Identify waste")} onExport={exportHistory} notify={setMessage} />) : <ServiceHub page="My history" signedIn={Boolean(user)} onSignIn={() => setAuth(true)} notify={setMessage} onRefresh={() => void refresh()} onNavigate={(next) => { if (next === "My history") setHistoryView("collections"); setPage(next); }} />}
              </HistoryTabs>
            </>
          )}
          {[
            "Plans",
            "Pickups",
            "Rewards",
            "Collection route",
            "Operations",
          ].includes(page) && (
            <ServiceHub
              page={page}
              onNavigate={(next) => { if (next === "My history") setHistoryView("collections"); setPage(next); }}
              initialScanId={pickupScanId}
              signedIn={Boolean(user)}
              onSignIn={() => setAuth(true)}
              notify={setMessage}
              onRefresh={() => void refresh()}
            />
          )}
          {["Helper dashboard", "Helper collections", "Helper earnings", "Service area"].includes(
            page,
          ) &&
            user?.accountType === "helper" && (
              <HelperDashboard
                view={page}
                signedIn={Boolean(user)}
                onSignIn={() => setAuth(true)}
                notify={setMessage}
              />
            )}
          {page === "Settings" && (
            <>
              <div className="page-heading">
                <h1>Your space, your choices.</h1>
                <p>
                  A few things worth knowing about your account and your data.
                </p>
              </div>
              <div className="settings-grid">
                <section className="settings-block">
                  <h2>Account</h2>
                  <p>
                    {user
                      ? user.email
                      : "Sign in to save your scans and pickups."}
                  </p>
                  <button
                    className="secondary"
                    onClick={() => (user ? signOut() : setAuth(true))}
                  >
                    {user ? <LogOut size={16} /> : <Leaf size={16} />}{" "}
                    {user ? "Sign out" : "Sign in or create an account"}
                  </button>
                </section>
                <section className="settings-block">
                  <h2>Private by design</h2>
                  <p>
                    History belongs to your account. Photos are not stored. OCR
                    runs in your browser; language assets download on first use.
                    Image and description content is sent to Google when you
                    identify an item.
                  </p>
                </section>
                <section className="settings-block">
                  <h2>Your confirmation matters</h2>
                  <span className="status">You have the final say</span>
                  <p>
                    Review the suggested materials before booking. You can
                    change the identification or remove an incorrect item.
                  </p>
                </section>
              </div>
            </>
          )}
          <footer className="page-footer">
            <span>
              <Leaf size={13} /> A thoughtful next step.
            </span>
            <span>Waste Right · Made for everyday change</span>
          </footer>
        </PageTransition>
      </div>
      <input
        ref={upload}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture
        hidden
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <dialog
        ref={dialog}
        className="auth-modal"
        onCancel={() => setAuth(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setAuth(false);
        }}
      >
        <button
          className="close icon-button"
          aria-label="Close sign in"
          onClick={() => setAuth(false)}
        >
          <X size={20} />
        </button>
        <span className="round-icon">
          <Leaf size={27} />
        </span>
        <h2>{signup ? "A fresh start." : "Welcome back."}</h2>
        <p>
          {signup
            ? "Make room for better everyday choices."
            : "Your everyday choices, all in one place."}
        </p>
        {message && (
          <p role="alert" className="auth-error">
            {message}
          </p>
        )}
        <form onSubmit={authenticate}>
          {signup && (
            <label className="field">
              Your name
              <input name="name" required autoComplete="name" maxLength={80} />
            </label>
          )}
          {signup && (
            <div className="field">
              <label>Account type</label>
              <Dropdown
                label="Account type"
                value={accountType}
                onChange={setAccountType}
                options={[
                  { value: "user", label: "User" },
                  { value: "helper", label: "Helper" },
                ]}
              />
              <small>
                {accountType === "helper"
                  ? "Your helper dashboard opens after signup. Operations approval is required to accept collections."
                  : "Scan waste, book pickups and earn rewards."}
              </small>
            </div>
          )}
          <label className="field">
            Email address
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
            />
          </label>
          <label className="field">
            Password
            <input
              name="password"
              type="password"
              required
              minLength={10}
              maxLength={128}
              autoComplete={signup ? "new-password" : "current-password"}
            />
            <small>At least 10 characters.</small>
          </label>
          <button className="primary" disabled={authBusy}>
            {authBusy ? (
              <Loader2 className="spin" size={16} />
            ) : (
              <ArrowRight size={16} />
            )}{" "}
            {signup ? "Create account" : "Sign in"}
          </button>
        </form>
        <button className="text-button" onClick={() => setSignup(!signup)}>
          {signup
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </dialog>
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setMessage("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
