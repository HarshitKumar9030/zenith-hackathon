import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.TEST_BASE_URL || "http://localhost:3001");
await page
  .getByRole("heading", { name: "A little care. A cleaner tomorrow." })
  .waitFor();
await page.waitForTimeout(700);
const first = await page.locator(".orbit").getAttribute("transform");
await page.waitForTimeout(300);
assert.notEqual(await page.locator(".orbit").getAttribute("transform"), first);
for (const [nav, asset] of [
  ["Identify waste", "abstract-illustration-question-mark.svg"],
  ["Local guides", "abstract-animation-education.svg"],
  ["My history", "abstract-animtion-another.svg"],
]) {
  await page.getByRole("button", { name: nav, exact: true }).click();
  await page
    .locator(`img[src="/assets/${asset}"]`)
    .waitFor({ state: "visible" });
  await page.waitForTimeout(400);
  assert.equal(
    await page
      .locator(`img[src="/assets/${asset}"]`)
      .evaluate((img) => img.complete && img.naturalWidth > 0),
    true,
  );
  await page.screenshot({
    path: `/tmp/wastewise-${nav.replaceAll(" ", "-")}.png`,
    fullPage: true,
  });
}
await page.getByRole("button", { name: "Select local guide" }).click();
await page.getByRole("listbox").waitFor();
await page.keyboard.press("Escape");
await page.getByRole("listbox").waitFor({ state: "hidden" });
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: "Local guides", exact: true }).click();
await page.waitForTimeout(700);
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page.screenshot({
  path: "/tmp/wastewise-motion-mobile.png",
  fullPage: true,
});
await page.emulateMedia({ reducedMotion: "reduce" });
await page.getByRole("button", { name: "Overview", exact: true }).click();
await page.waitForTimeout(500);
const reduced = await page.locator(".orbit").getAttribute("transform");
await page.waitForTimeout(250);
assert.equal(await page.locator(".orbit").getAttribute("transform"), reduced);
assert.deepEqual(errors, []);
console.log(
  "PASS: GSAP motion, all illustration assets, page navigation, dropdown exit, mobile overflow, live reduced-motion preference, no runtime errors.",
);
await browser.close();
