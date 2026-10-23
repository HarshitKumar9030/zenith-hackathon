"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import Dropdown from "./dropdown";
import type { Identification } from "@/lib/rules";
import { serviceApi } from "./service-hub";
export default function ConfirmationChecklist({
  id,
  identification,
  confirmed,
  onConfirmed,
  notify,
}: {
  id: string;
  identification: Identification;
  confirmed?: boolean;
  onConfirmed: (item: unknown) => void;
  notify: (text: string) => void;
}) {
  const [selectedItems, setSelectedItems] = useState(
    (identification.detected_items || []).map((_, i) => i),
  );
  const [material, setMaterial] = useState(identification.material),
    [condition, setCondition] = useState(identification.contaminated),
    [special, setSpecial] = useState(identification.special_handling),
    [mixed, setMixed] = useState(identification.mixed_material),
    [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <section className="confirmation">
      <h3>
        {confirmed ? "Your confirmed checklist" : "Check what the camera found"}
      </h3>
      <p>
        Correct the visible material and condition. Unknown is a valid answer.
      </p>
      {Boolean(identification.detected_items?.length) && (
        <div className="detected-items" aria-label="Detected waste items">
          {identification.detected_items!.map((item, i) => (
            <label className="check-row" key={i}>
              <input
                type="checkbox"
                checked={selectedItems.includes(i)}
                onChange={(e) =>
                  setSelectedItems((v) =>
                    e.target.checked ? [...v, i] : v.filter((n) => n !== i),
                  )
                }
              />
              <span>
                {item.name} · {item.material.replaceAll("_", " ")}
                {item.special_handling !== "no"
                  ? " · Check special handling"
                  : ""}
              </span>
            </label>
          ))}
          <small>
            Keep the items actually present selected. Material and condition
            below describe the collection together.
          </small>
        </div>
      )}
      <div className="checklist-fields">
        <div>
          <label>Material</label>
          <Dropdown
            label="Confirm material"
            value={material}
            onChange={(v) => setMaterial(v as Identification["material"])}
            options={[
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
            ].map((value) => ({ value, label: value.replaceAll("_", " ") }))}
          />
        </div>
        <div>
          <label>Contaminated?</label>
          <Dropdown
            label="Confirm contamination"
            value={condition}
            onChange={(v) => setCondition(v as Identification["contaminated"])}
            options={["yes", "no", "unknown"].map((value) => ({
              value,
              label: value,
            }))}
          />
        </div>
        <div>
          <label>Special handling?</label>
          <Dropdown
            label="Confirm special handling"
            value={special}
            onChange={(v) =>
              setSpecial(v as Identification["special_handling"])
            }
            options={["yes", "no", "unknown"].map((value) => ({
              value,
              label: value,
            }))}
          />
        </div>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={mixed}
          onChange={(e) => setMixed(e.target.checked)}
        />
        Mixed materials are present
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(e) => setReviewed(e.target.checked)}
        />
        I reviewed the suggestions and answered what I can establish
      </label>
      <button
        className="primary"
        disabled={
          !reviewed ||
          busy ||
          Boolean(
            identification.detected_items?.length && !selectedItems.length,
          )
        }
        onClick={async () => {
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
                ? selectedItems
                : undefined,
            });
            onConfirmed(data.item);
            notify(
              data.awarded
                ? "Confirmed. You earned today’s scan point."
                : "Checklist saved. Daily points are awarded once per day.",
            );
          } catch (e) {
            notify((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Check size={16} />
        {confirmed ? "Update confirmed checklist" : "Confirm & schedule pickup"}
      </button>
    </section>
  );
}
