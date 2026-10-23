import assert from "node:assert/strict";
// Run from web-app: node tests/smoke.mjs (creates one test account and fictional guide).
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.TEST_BASE_URL || "http://localhost:3001");
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/wastewise-desktop.png", fullPage: true });
await page.getByRole("button", { name: "Or describe your item" }).click();
await page
  .getByRole("textbox", { name: "Describe your item" })
  .fill("A cardboard box with a plastic lining");
await page.getByRole("button", { name: "Identify my item" }).click();
await page.getByRole("button", { name: "New here? Create an account" }).click();
await page.getByLabel("Your name").fill("QA User");
await page.getByLabel("Email address").fill(`qa-${Date.now()}@example.test`);
await page.locator("input[name=password]").fill("test-password-12345");
await page.getByRole("button", { name: "Create account", exact: true }).click();
await page.waitForTimeout(1500);
assert.equal(await page.locator("dialog").isVisible(), false);
await page.getByRole("button", { name: "Local guides", exact: true }).click();
await page
  .locator('input[accept=".pdf,.txt,.json"]')
  .setInputFiles(
    new URL("../public/guide-template.json", import.meta.url).pathname,
  );
await page
  .getByRole("button", { name: "I reviewed the source · Save guide" })
  .click();
await page.waitForTimeout(700);
console.log(
  "Guide saved:",
  await page.getByText("1 reviewed rules").isVisible(),
);
const other = await browser.newContext();
console.log(
  "Other user history status:",
  (
    await other.request.get(
      `${process.env.TEST_BASE_URL || "http://localhost:3001"}/api/history`,
    )
  ).status(),
);
await other.close();
await page.getByRole("button", { name: "Overview", exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "/tmp/wastewise-mobile.png", fullPage: true });
console.log(
  "Mobile overflow:",
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
console.log("Runtime errors:", errors);
await browser.close();
