"use client";
import { selectableWaste } from "@/lib/scan-safety";
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Loader2, Pencil, X } from "lucide-react";
import flow from "./simple-flow.module.css";
import Dropdown from "./dropdown";
import type { Identification } from "@/lib/rules";
import { serviceApi } from "@/lib/client-api";
const materials = [
  "plastic",
  "paper",
  "cardboard",
  "glass",
  "metal",
  "food_waste",
  "garden_waste",
  "textile",
  "composite_or_other",
  "unknown",
];
export default function ConfirmationChecklist({
  id,
  identification,
  confirmed,
  onConfirmed,
  notify,
  onRemoved,
  onSchedule,
  startEditing = false,
}: {
  id: string;
  identification: Identification;
  confirmed?: boolean;
  onConfirmed: (item: unknown) => void;
  notify: (text: string) => void;
  onRemoved?: () => void;
  onSchedule?: () => void;
  startEditing?: boolean;
}) {
  const [editing, setEditing] = useState(startEditing),
    [selected, setSelected] = useState(
      (identification.detected_items || []).flatMap((item, i) => selectableWaste(item) && item.classification !== "uncertain" ? [i] : []),
    ),
    [material, setMaterial] = useState(identification.material),
    [condition, setCondition] = useState(identification.contaminated),
    [special, setSpecial] = useState(identification.special_handling),
    [mixed, setMixed] = useState(identification.mixed_material),
    [busy, setBusy] = useState(false);
  const reduce = useReducedMotion();
  const handlingSection = useRef<HTMLDivElement>(null);
  const [handlingError, setHandlingError] = useState("");
  const items = identification.detected_items?.length
    ? identification.detected_items
    : identification.detected_items ? [] : [{ name: identification.object_name, material: identification.material, classification: undefined }];
  async function remove(index: number) {
    setBusy(true);
    try {
      const response = await fetch("/api/history", {
        method: identification.detected_items?.length ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "remove_item", index }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      if (data.item) onConfirmed(data.item);
      else onRemoved?.();
      notify("Item removed. Existing pickup details are unchanged.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (special === "unknown") {
      setHandlingError("Choose Ordinary for everyday household waste, or Special for batteries, electronics or hazardous items.");
      const details = handlingSection.current?.closest("details");
      if (details) details.open = true;
      handlingSection.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      handlingSection.current?.focus();
      return;
    }
    setHandlingError("");
    setBusy(true);
    try {
      const data = await serviceApi("confirm", {
        id,
        material,
        contaminated: condition,
        special_handling: special,
        mixed_material: mixed,
        reviewed: true,
        selectedItems: identification.detected_items?.length
          ? selected
          : undefined,
      });
      onConfirmed(data.item);
      setEditing(false);
      notify(
        data.awarded
          ? "Confirmed. You earned today’s scan point."
          : "Item details saved.",
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function cancel() {
    setMaterial(identification.material);
    setCondition(identification.contaminated);
    setSpecial(identification.special_handling);
    setMixed(identification.mixed_material);
    setSelected((identification.detected_items || []).flatMap((item, i) => selectableWaste(item) && item.classification !== "uncertain" ? [i] : []));
    setEditing(false);
  }
  function choices(
    label: string,
    value: string,
    onChange: (v: "yes" | "no" | "unknown") => void,
    options: { value: "yes" | "no" | "unknown"; label: string }[],
  ) {
    return (
      <div className="choice-tabs" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            key={o.value}
          >
            {value === o.value && (
              <motion.span
                className="choice-highlight"
                layoutId={`${id}-${label}`}
                transition={{ duration: reduce ? 0 : 0.18 }}
              />
            )}
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    );
  }
  if (confirmed && !editing)
    return (
      <section className="confirmed-summary">
        <div className="section-heading">
          <h3>
            <Check size={18} />
            Confirmed items
          </h3>
          <button
            type="button"
            className="text-button"
            onClick={() => setEditing(true)}
          >
            <Pencil size={14} />
            Edit details
          </button>
        </div>
        {items.map((item, index) => (
          <div className="confirmed-product" key={index}>
            <div>
              <strong>{item.name}</strong>
              <small>{!selectableWaste(item) ? "Not waste · excluded from pickup" : item.classification === "uncertain" ? "Needs your review · select only if this is waste" : item.material.replaceAll("_", " ")}</small>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label={`Remove ${item.name}`}
              disabled={busy}
              onClick={() => void remove(index)}
            >
              <X size={17} />
            </button>
          </div>
        ))}
        {onSchedule && (
          <button type="button" className="primary" onClick={onSchedule}>
            Schedule a pickup <ArrowRight size={16} />
          </button>
        )}
      </section>
    );
  return (
    <motion.section
      className="item-editor"
      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.2 }}
      aria-label="Item details editor"
    >
      <header>
        <h3>{confirmed ? "Edit item details" : "Review your items"}</h3>
        <p>
          {confirmed
            ? "Update what you know. Leave anything uncertain as “Not sure”."
            : "Keep the items you can see. Adjust the details before continuing."}
        </p>
      </header>
      <div className="review-products">
        {!items.length && <p role="status">No waste identified. People are excluded. Try a clearer view of the waste.</p>}
        {items.length > 1 && <p>{items.length} objects reviewed · up to 16 per scan</p>}
        {items.map((item, index) => (
          <label className="review-product" key={index}>
            <input
              type="checkbox"
              aria-label={`Include ${item.name}`}
              checked={
                !identification.detected_items?.length ||
                selected.includes(index)
              }
              disabled={!identification.detected_items?.length || !selectableWaste(item)}
              onChange={(e) =>
                setSelected((v) =>
                  e.target.checked
                    ? [...v, index]
                    : v.filter((i) => i !== index),
                )
              }
            />
            <span>
              <strong>{item.name}</strong>
              <small>{!selectableWaste(item) ? "Not waste · excluded from pickup" : item.classification === "uncertain" ? "Needs your review · select only if this is waste" : item.material.replaceAll("_", " ")}</small>
            </span>
          </label>
        ))}
      </div>
      <div className={flow.editorSummary}><span>{material === "unknown" ? "Material needs review" : material.replaceAll("_", " ")}</span><span>{special === "no" ? "Everyday waste" : special === "yes" ? "Special handling" : "Handling needs review"}</span></div>
      <details className={flow.details} open={confirmed || material === "unknown" || special === "unknown" ? true : undefined}><summary>Check material and condition</summary>
      <div className="editor-settings">
        <div className="editor-setting">
          <div>
            <label>Material</label>
            <small>The main material in this scan</small>
          </div>
          <Dropdown
            label="Confirm material"
            value={material}
            onChange={(v) => setMaterial(v as Identification["material"])}
            options={materials.map((value) => ({
              value,
              label:
                value === "composite_or_other"
                  ? "Mixed / other"
                  : value === "unknown"
                    ? "Not sure"
                    : value.replaceAll("_", " "),
            }))}
          />
        </div>
        <div className="editor-setting">
          <div>
            <label>Condition</label>
            <small>Food, grease or other residue?</small>
          </div>
          {choices("Condition", condition, setCondition, [
            { value: "no", label: "Clean" },
            { value: "yes", label: "Has residue" },
            { value: "unknown", label: "Not sure" },
          ])}
        </div>
        <div className="editor-setting" ref={handlingSection} tabIndex={-1}>
          <div>
            <label>Handling</label>
            <small>Batteries, electronics or hazardous contents?</small>
          </div>
          {choices("Handling", special, (value) => { setSpecial(value); setHandlingError(""); }, [
            { value: "no", label: "Ordinary" },
            { value: "yes", label: "Special" },
            { value: "unknown", label: "Not sure" },
          ])}
        </div>
        <div className="editor-setting">
          <div>
            <label>Mixed materials</label>
            <small>More than one material is present</small>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Mixed materials are present"
            aria-checked={mixed}
            className={`editor-switch ${mixed ? "on" : ""}`}
            onClick={() => setMixed(!mixed)}
          >
            <motion.span
              animate={{ x: mixed ? 19 : 0 }}
              transition={{ duration: reduce ? 0 : 0.18 }}
            />
          </button>
        </div>
      </div>
      </details>
      {handlingError && <p role="alert">{handlingError}</p>}
      {special === "yes" && <p role="status">These items need special handling. Continue to request an Operations review. You’ll see the collection terms and price before accepting.</p>}
      <footer>
        <p>
          By confirming, you’re checking that these details match your items.
        </p>
        <div>
          {confirmed && (
            <button
              type="button"
              className="secondary"
              onClick={cancel}
              disabled={busy}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className="primary"
            aria-label={
              confirmed ? "Save item changes" : "Continue to pickup"
            }
            disabled={
              busy ||
              Boolean(identification.detected_items && !selected.length)
            }
            onClick={() => void save()}
          >
            {busy ? (
              <Loader2 className="spin" size={17} />
            ) : (
              <Check size={17} />
            )}{" "}
            {busy
              ? "Saving…"
              : confirmed
                ? "Save changes"
                : special === "yes" ? "Continue to special collection" : "Continue to pickup"}
            {!confirmed && <ArrowRight size={16} />}
          </button>
        </div>
      </footer>
    </motion.section>
  );
}
