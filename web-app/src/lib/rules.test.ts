import { test } from "node:test";
import assert from "node:assert/strict";
import {
  guideSchema,
  recommend,
  type Identification,
  type Guide,
} from "./rules";
const item: Identification = {
  object_name: "box",
  material: "cardboard",
  physical_state: "dry",
  contaminated: "no",
  mixed_material: false,
  special_handling: "no",
  explanation: "A cardboard box.",
  clarification_question: null,
};
const guide: Guide = {
  name: "Test guide",
  municipality: "Fictional campus",
  version: "1",
  text: "Clean cardboard goes to paper collection. Flatten it.",
  rules: [
    {
      id: "1",
      material: "cardboard",
      category: "paper collection",
      passage: "Clean cardboard goes to paper collection. Flatten it.",
      section: "1",
      condition: "clean_single_material",
      steps: ["Flatten it."],
    },
  ],
};
test("clean single-material item gets an exact guide passage", () => {
  const r = recommend(item, guide);
  assert.equal(r.status, "supported");
  assert.equal(r.rule?.passage, guide.text);
});
test("missing guides never yield recommendations", () =>
  assert.equal(recommend(item, null).status, "unsupported"));
test("mixed packaging, uncertainty, residue, and hazardous items are withheld", () => {
  for (const attributes of [
    { mixed_material: true },
    { special_handling: "yes" as const },
    { special_handling: "unknown" as const },
    { contaminated: "yes" as const },
    { contaminated: "unknown" as const },
    { clarification_question: "Does it have lining?" },
  ])
    assert.equal(
      recommend({ ...item, ...attributes }, guide).status,
      "unsupported",
    );
});
test("conflicting guide rules are withheld", () =>
  assert.equal(
    recommend(item, {
      ...guide,
      rules: [
        ...guide.rules,
        { ...guide.rules[0], id: "2", category: "other" },
      ],
    }).status,
    "unsupported",
  ));
test("fabricated passages and unsupported preparation steps fail validation", () => {
  assert.equal(
    guideSchema.safeParse({
      ...guide,
      rules: [{ ...guide.rules[0], passage: "Invented rule" }],
    }).success,
    false,
  );
  assert.equal(
    guideSchema.safeParse({
      ...guide,
      rules: [{ ...guide.rules[0], steps: ["Rinse with water"] }],
    }).success,
    false,
  );
});
