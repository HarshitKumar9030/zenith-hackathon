"use client";
import { motion, useReducedMotion } from "framer-motion";
import Dropdown from "./dropdown";
export type DescriptionDetails = {
  material: string;
  residue: string;
  mixed: string;
  special: string;
};
export const emptyDetails: DescriptionDetails = {
  material: "unknown",
  residue: "unknown",
  mixed: "unknown",
  special: "unknown",
};
export default function DescriptionDetailsForm({
  value,
  onChange,
}: {
  value: DescriptionDetails;
  onChange: (value: DescriptionDetails) => void;
}) {
  const reduce = useReducedMotion();
  const answers = [
    { value: "unknown", label: "Not sure" },
    { value: "no", label: "No" },
    { value: "yes", label: "Yes" },
  ];
  return (
    <motion.section
      className="description-details"
      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.2 }}
      aria-label="Description details"
    >
      <h3>A few details help.</h3>
      <p>Optional. Answer what you know; “Not sure” is fine.</p>
      <div className="description-fields">
        <div className="field">
          <label>Main material</label>
          <Dropdown
            label="Description material"
            value={value.material}
            onChange={(material) => onChange({ ...value, material })}
            options={[
              { value: "unknown", label: "Not sure" },
              ...[
                "plastic",
                "paper",
                "cardboard",
                "glass",
                "metal",
                "food_waste",
                "garden_waste",
                "textile",
                "composite_or_other",
              ].map((v) => ({
                value: v,
                label:
                  v === "composite_or_other"
                    ? "Mixed / other"
                    : v.replaceAll("_", " "),
              })),
            ]}
          />
        </div>
        <div className="field">
          <label>Any food, liquid or grease left?</label>
          <Dropdown
            label="Description residue"
            value={value.residue}
            onChange={(residue) => onChange({ ...value, residue })}
            options={answers}
          />
        </div>
        <div className="field">
          <label>Mixed materials or a lining?</label>
          <Dropdown
            label="Description mixed materials"
            value={value.mixed}
            onChange={(mixed) => onChange({ ...value, mixed })}
            options={answers}
          />
        </div>
        <div className="field">
          <label>Battery, electronics or chemicals?</label>
          <Dropdown
            label="Description special contents"
            value={value.special}
            onChange={(special) => onChange({ ...value, special })}
            options={answers}
          />
        </div>
      </div>
    </motion.section>
  );
}
