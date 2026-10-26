import { wastePropertiesSchema } from "./waste-properties";
import { z } from "zod";
const materialSchema = z.enum([
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
]);
export const identificationSchema = z.object({
  waste_properties: wastePropertiesSchema.optional(),
  object_name: z.string().max(200),
  detected_items: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        waste_properties: wastePropertiesSchema.optional(),
        material: materialSchema,
        classification: z.enum(["waste", "not_waste", "uncertain"]).optional(),
        special_handling: z.enum(["yes", "no", "unknown"]),
      }),
    )
    .max(30)
    .optional(),
  material: materialSchema,
  physical_state: z.enum(["wet", "dry", "unknown"]),
  contaminated: z.enum(["yes", "no", "unknown"]),
  mixed_material: z.boolean(),
  special_handling: z.enum(["yes", "no", "unknown"]),
  explanation: z.string().max(2000),
  clarification_question: z.string().max(500).nullable(),
});
export type Identification = z.infer<typeof identificationSchema>;
export const ruleSchema = z.object({
  id: z.string().min(1).max(80),
  material: z.string().max(80),
  category: z.string().min(1).max(100),
  passage: z.string().min(1).max(4000),
  section: z.string().min(1).max(100),
  steps: z.array(z.string().max(500)).max(12),
  condition: z.enum(["clean_single_material", "special_handling"]),
});
export const guideSchema = z
  .object({
    name: z.string().min(1).max(150),
    municipality: z.string().min(1).max(150),
    version: z.string().min(1).max(50),
    text: z.string().min(20).max(100000),
    rules: z.array(ruleSchema).min(1).max(100),
  })
  .superRefine((guide, ctx) => {
    for (const rule of guide.rules) {
      if (
        !guide.text.includes(rule.passage) ||
        rule.steps.some((step) => !rule.passage.includes(step))
      )
        ctx.addIssue({
          code: "custom",
          message:
            "Each passage and preparation step must appear verbatim in the supplied guide.",
        });
    }
    if (new Set(guide.rules.map((r) => r.id)).size !== guide.rules.length)
      ctx.addIssue({ code: "custom", message: "Rule IDs must be unique." });
  });
export type Guide = z.infer<typeof guideSchema> & { _id?: string };
export function recommend(item: Identification, guide: Guide | null) {
  const unavailable = {
    status: "unsupported",
    category: null,
    steps: [] as string[],
    rule: null as z.infer<typeof ruleSchema> | null,
    message: "No verified disposal rule was found in the supplied local guide.",
  };
  if (
    !guide ||
    item.clarification_question ||
    item.material === "unknown" ||
    item.mixed_material ||
    item.special_handling === "unknown"
  )
    return unavailable;
  const matches = guide.rules.filter(
    (rule) =>
      rule.material === item.material &&
      guide.text.includes(rule.passage) &&
      (item.special_handling === "yes"
        ? rule.condition === "special_handling"
        : rule.condition === "clean_single_material" &&
          item.contaminated === "no"),
  );
  if (matches.length !== 1)
    return {
      ...unavailable,
      message:
        matches.length > 1
          ? "Conflicting rules need review before a recommendation can be made."
          : unavailable.message,
    };
  return {
    status: "supported",
    category: matches[0].category,
    steps: matches[0].steps,
    rule: matches[0],
    message:
      "Matched to your supplied guide. Review the source passage before disposal.",
  };
}
