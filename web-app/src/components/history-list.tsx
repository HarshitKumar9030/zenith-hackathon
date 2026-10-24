"use client";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Leaf,
  Package,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import WorkflowArt from "./workflow-art";
import styles from "./history-list.module.css";
import type { Result } from "./dashboard";
export default function HistoryList({
  items,
  onOpen,
  onRefresh,
  onScan,
  onExport,
  notify,
  hideHeading = false,
}: {
  items: Result[];
  onOpen: (item: Result) => void;
  onRefresh: () => void;
  onScan: () => void;
  onExport: () => void;
  notify: (text: string) => void;
  hideHeading?: boolean;
}) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [removed, setRemoved] = useState<{ id: string; name: string } | null>(null),
    [busy, setBusy] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const visible = items.filter(
    (i) =>
      i.identification.object_name
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "confirmed"
          ? i.confirmed
          : i.identification.clarification_question ||
            i.identification.material === "unknown")),
  );
  async function mutate(id: string, restore = false) {
    setBusy(id);
    try {
      const r = await fetch("/api/history", {
        method: restore ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, restore }),
      });
      if (!r.ok) throw Error("Could not update history.");
      onRefresh();
      if (restore) setRemoved(null);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const groups = new Map<string, Result[]>();
  for (const i of visible) {
    const date = new Date(i.createdAt).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    groups.set(date, [...(groups.get(date) || []), i]);
  }
  return (
    <section className={`${styles.library} history-library`}>
      {!hideHeading && <div className="page-heading heading-actions">
        <div>
          <h1>My history.</h1>
          <p>A clear record of what you scanned and confirmed.</p>
        </div>
        <button
          className="secondary"
          disabled={!items.length}
          onClick={onExport}
        >
          <ArrowDownToLine size={16} />
          Export history
        </button>
      </div>}
      {hideHeading && <button className="text-button" disabled={!items.length} onClick={onExport}><ArrowDownToLine size={15} />Export scans</button>}
      <div className="history-overview">
        <WorkflowArt scene="history" className="history-heading-art" />
        <div>
          <strong>{items.length}</strong>
          <span>Saved scans</span>
        </div>
        <div>
          <strong>{items.filter((i) => i.confirmed).length}</strong>
          <span>Confirmed</span>
        </div>
        <div>
          <strong>
            {items.reduce(
              (n, i) => n + (i.identification.detected_items?.length || 1),
              0,
            )}
          </strong>
          <span>Items identified</span>
        </div>
      </div>
      <div className="history-controls">
        <label className="history-search">
          <Search size={18} />
          <input
            aria-label="Search history"
            placeholder="Find an item…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div
          className="choice-tabs history-filters"
          role="tablist"
          aria-label="History filter"
        >
          {[
            { id: "all", label: "All scans" },
            { id: "confirmed", label: "Confirmed" },
            { id: "review", label: "Needs review" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={filter === t.id}
              onClick={() => setFilter(t.id)}
            >
              {filter === t.id && (
                <motion.span
                  className="choice-highlight"
                  layoutId="history-filter"
                  transition={{ duration: reduce ? 0 : 0.2 }}
                />
              )}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      {removed && (
        <div className="history-undo" role="status">
          <span>Removed {removed.name}</span>
          <button
            type="button"
            className="text-button"
            onClick={() => void mutate(removed.id, true)}
          >
            <Undo2 size={15} />
            Undo
          </button>
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={filter}
          initial={{ opacity: 0, y: reduce ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
        >
          {visible.length ? (
            [...groups].map(([date, rows]) => (
              <section className="history-group" key={date}>
                <h2>{date}</h2>
                {rows.map((item) => (
                  <motion.article
                    layout={!reduce}
                    className="history-item"
                    key={item._id}
                  >
                    <span
                      className={`history-material ${item.identification.material}`}
                    >
                      {["food_waste", "garden_waste"].includes(
                        item.identification.material,
                      ) ? (
                        <Leaf size={23} />
                      ) : (
                        <Package size={23} />
                      )}
                    </span>
                    <button
                      className="history-open"
                      onClick={() => onOpen(item)}
                    >
                      <strong>{item.identification.object_name}</strong>
                      <small>
                        {(
                          item.correction?.material ||
                          item.identification.material
                        ).replaceAll("_", " ")}{" "}
                        · {item.identification.detected_items?.length || 1} item
                        {(item.identification.detected_items?.length || 1) > 1
                          ? "s"
                          : ""}
                      </small>
                    </button>
                    <span
                      className={`history-state ${item.confirmed ? "confirmed" : ""}`}
                    >
                      {item.confirmed ? "Confirmed" : "Review needed"}
                    </span>
                    <button
                      className="icon-button"
                      aria-label={`View ${item.identification.object_name}`}
                      onClick={() => onOpen(item)}
                    >
                      <ArrowUpRight size={19} />
                    </button>
                    <button
                      className="icon-button history-remove"
                      disabled={busy === item._id}
                      aria-label={`Delete ${item.identification.object_name}`}
                      onClick={async () => {
                        await mutate(item._id);
                        setRemoved({
                          id: item._id,
                          name: item.identification.object_name,
                        });
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </motion.article>
                ))}
              </section>
            ))
          ) : (
            <div className="history-empty">
              <img
                src="/assets/abstract-animtion-another.svg"
                alt=""
                width="130"
                height="130"
              />
              <h2>
                {items.length
                  ? "No matching scans."
                  : "Your next good habit starts here."}
              </h2>
              <p>
                {items.length
                  ? "Try a different search or filter."
                  : "Scan your first items. We’ll keep the confirmed details here."}
              </p>
              <button className="primary" onClick={onScan}>
                Start a scan <ArrowUpRight size={16} />
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
