// Isolated MongoDB integration checks. Starts its own Next.js process; never charges a gateway.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const testDb = `waste_right_qa_${Date.now()}`,
  port = Number(process.env.QA_PORT || 3107),
  base = `http://localhost:${port}`,
  adminEmail = `ops-${Date.now()}@example.test`,
  secret = "isolated-qa-webhook-secret";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--port",
    String(port),
    "--hostname",
    "127.0.0.1",
  ],
  {
    env: {
      ...process.env,
      NODE_ENV: "production",
      MONGODB_DB: testDb,
      ADMIN_EMAILS: adminEmail,
      RAZORPAY_WEBHOOK_SECRET: secret,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let log = "";
server.stdout.on("data", (b) => {
  log = (log + b).slice(-2000);
});
server.stderr.on("data", (b) => {
  log = (log + b).slice(-2000);
});
const client = new MongoClient(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
);
await client.connect();
const database = client.db(testDb);
async function signup(name, email, accountType = "user") {
  const response = await fetch(base + "/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({
      name,
      email,
      accountType,
      password: "QA-only-password-1234",
    }),
  });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  const cookie = response.headers.get("set-cookie").split(";")[0];
  return {
    id: data.user.id,
    async req(path, body) {
      const r = await fetch(base + "/api/" + path, {
        method: body ? "POST" : "GET",
        headers: {
          cookie,
          Origin: base,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: r.status, data: await r.json() };
    },
  };
}
try {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(base + "/api/auth/session");
      if (r.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
    if (i === 79) throw new Error("QA server did not start: " + log);
  }
  const resident = await signup("Resident QA", "resident@example.test"),
    other = await signup("Other QA", "other@example.test"),
    collector = await signup(
      "Collector QA",
      "collector@example.test",
      "helper",
    ),
    admin = await signup("Operations QA", adminEmail);
  await database
    .collection("users")
    .updateOne(
      { _id: new ObjectId(admin.id) },
      { $set: { adminApproved: true } },
    );
  assert.equal(
    (await collector.req("auth/session")).data.user.accountType,
    "helper",
  );
  assert.equal(
    (await resident.req("auth/session")).data.user.accountType,
    "user",
  );
  assert.equal((await resident.req("helper", { action: "apply" })).status, 403);
  assert.equal((await resident.req("operations")).status, 403);
  assert.equal((await collector.req("operations")).status, 403);
  assert.equal(
    (
      await admin.req("operations", {
        action: "approve_collector",
        email: "collector@example.test",
      })
    ).status,
    200,
  );
  const scan = await database.collection("history").insertOne({
    userId: new ObjectId(resident.id),
    identification: {
      object_name: "QA cardboard box",
      material: "cardboard",
      physical_state: "dry",
      contaminated: "no",
      mixed_material: false,
      special_handling: "no",
      explanation: "Isolated QA fixture.",
      clarification_question: null,
    },
    confirmed: false,
    preview: true,
    createdAt: new Date(),
    recommendation: { status: "unsupported" },
  });
  const confirm = {
    id: String(scan.insertedId),
    material: "cardboard",
    contaminated: "no",
    mixed_material: false,
    special_handling: "no",
    reviewed: true,
  };
  assert.equal((await other.req("confirm", confirm)).status, 400);
  assert.equal((await resident.req("confirm", confirm)).data.awarded, true);
  assert.equal((await resident.req("confirm", confirm)).data.awarded, false);
  await database
    .collection("service_accounts")
    .updateOne({ _id: new ObjectId(resident.id) }, { $set: { points: 20 } });
  const redemptions = await Promise.all(
    Array.from({ length: 4 }, () =>
      resident.req("service", { action: "redeem" }),
    ),
  );
  assert.equal(redemptions.filter((r) => r.status === 200).length, 2);
  let a = (await resident.req("service")).data.account;
  assert.equal(a.points, 0);
  assert.equal(a.credits, 2);
  await resident.req("service", {
    action: "profile",
    address: "QA collection address 123",
    locality: "QA campus",
    alias: "QA resident",
    leaderboard: true,
  });
  await resident.req("service", {
    action: "location",
    location: { latitude: 28.6139, longitude: 77.209, accuracy: 12 },
  });
  assert.equal(
    (
      await resident.req("service", {
        action: "location",
        location: { latitude: 91, longitude: 77, accuracy: 12 },
      })
    ).status,
    400,
  );
  const booking = {
    action: "book",
    requestId: randomUUID(),
    source: "reward",
    scanId: String(scan.insertedId),
    weightKg: 1,
    date: new Date(Date.now() + 2 * 86400000).toLocaleDateString("en-CA"),
    window: "09:00–12:00",
    segregated: true,
  };
  const booked = await Promise.all([
    resident.req("service", booking),
    resident.req("service", booking),
  ]);
  assert.equal(booked[0].status, 200);
  assert.equal(booked[1].status, 200);
  assert.equal(booked[0].data.result.id, booked[1].data.result.id);
  a = (await resident.req("service")).data.account;
  assert.equal(a.credits, 1);
  const id = booked[0].data.result.id;
  assert.equal(
    (await other.req("service", { action: "cancel", id })).status,
    400,
  );
  const before = (await collector.req("operations")).data.jobs.find(
    (j) => j.id === id,
  );
  assert.equal(before.address, undefined);
  assert.equal(before.location, undefined);
  const claims = await Promise.all([
    collector.req("operations", {
      action: "claim",
      residentId: resident.id,
      id,
    }),
    collector.req("operations", {
      action: "claim",
      residentId: resident.id,
      id,
    }),
  ]);
  assert.equal(claims.filter((r) => r.status === 200).length, 1);
  assert.equal(
    (
      await collector.req("operations", {
        action: "weigh",
        residentId: resident.id,
        id,
        grossKg: 1.4,
        tareKg: 0.2,
        material: "cardboard",
        notes: "QA scale receipt",
      })
    ).status,
    200,
  );
  assert.equal(
    (await collector.req("service", { action: "accept_receipt", id })).status,
    400,
  );
  assert.equal(
    (await resident.req("service", { action: "accept_receipt", id })).status,
    200,
  );
  assert.equal(
    (
      await admin.req("operations", {
        action: "settle",
        residentId: resident.id,
        id,
        buyerProceedsPaise: 1000,
        directCostsPaise: 200,
        reference: "QA-buyer-receipt",
      })
    ).status,
    200,
  );
  const payBooking = (
    await resident.req("service", {
      ...booking,
      requestId: randomUUID(),
      source: "basic",
    })
  ).data.result;
  const orderId = "order_qa_" + Date.now();
  await database.collection("payment_orders").insertOne({
    orderId,
    userId: resident.id,
    plan: "basic",
    bookingId: payBooking.id,
    amount: 2000,
    currency: "INR",
    status: "created",
  });
  const raw = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_qa_1",
          order_id: orderId,
          amount: 2000,
          currency: "INR",
        },
      },
    },
  });
  const signature = createHmac("sha256", secret).update(raw).digest("hex");
  async function hook(sig, body = raw) {
    return fetch(base + "/api/payments/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": sig,
      },
      body,
    });
  }
  assert.equal((await hook("bad")).status, 400);
  assert.equal((await hook(signature, raw + " ")).status, 400);
  const hooks = await Promise.all([hook(signature), hook(signature)]);
  assert.ok(hooks.every((r) => r.status === 200));
  a = (await resident.req("service")).data.account;
  assert.equal(a.payments.filter((p) => p.orderId === orderId).length, 1);
  assert.equal(
    a.bookings.find((b) => b.id === payBooking.id).status,
    "scheduled",
  );
  const quote = (
    await resident.req("service", {
      ...booking,
      requestId: randomUUID(),
      source: "basic",
      segregated: false,
    })
  ).data.result;
  assert.equal(quote.status, "quote_requested");
  assert.equal(
    (
      await admin.req("operations", {
        action: "quote",
        residentId: resident.id,
        id: quote.id,
        feePaise: 3500,
        terms: "QA sorting and collection quote",
      })
    ).status,
    200,
  );
  const multi = await database.collection("history").insertOne({
    userId: new ObjectId(resident.id),
    identification: {
      object_name: "Bottle and box",
      material: "composite_or_other",
      physical_state: "dry",
      contaminated: "no",
      mixed_material: true,
      special_handling: "no",
      explanation: "QA batch fixture",
      clarification_question: null,
      detected_items: [
        { name: "Bottle", material: "plastic", special_handling: "no" },
        { name: "Box", material: "cardboard", special_handling: "no" },
      ],
    },
    createdAt: new Date(),
    preview: true,
  });
  assert.equal(
    (
      await resident.req("confirm", {
        ...confirm,
        id: String(multi.insertedId),
        selectedItems: [8],
      })
    ).status,
    400,
  );
  const selected = await resident.req("confirm", {
    ...confirm,
    id: String(multi.insertedId),
    selectedItems: [1],
  });
  assert.equal(selected.data.item.identification.detected_items[0].name, "Box");
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({
      permissions: ["geolocation"],
      geolocation: { latitude: 28.6139, longitude: 77.209, accuracy: 12 },
      viewport: { width: 1440, height: 1000 },
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    async function login(email) {
      await page.goto(base);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.getByLabel("Email address").fill(email);
      await page.locator("input[name=password]").fill("QA-only-password-1234");
      await page
        .getByRole("button", { name: "Sign in", exact: true })
        .last()
        .click();
      await page.locator("dialog").waitFor({ state: "hidden" });
    }
    await login("resident@example.test");
    assert.equal(
      await page
        .locator("nav")
        .getByRole("button", { name: "Helper dashboard", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Local guides", exact: true })
        .count(),
      0,
    );
    assert.equal(await page.locator(".nav-dot").count(), 0);
    await page.getByRole("button", { name: "Pickups", exact: true }).click();
    await page
      .getByRole("button", { name: "Use my location", exact: true })
      .click();
    await page.getByText("28.61390, 77.20900", { exact: false }).waitFor();
    const inlineFixture = {
      userId: new ObjectId(resident.id),
      identification: {
        object_name: "QA paper bag",
        material: "paper",
        physical_state: "dry",
        contaminated: "no",
        mixed_material: false,
        special_handling: "no",
        explanation: "Controlled browser test fixture",
        clarification_question: null,
        detected_items: [
          { name: "Paper bag", material: "paper", special_handling: "no" },
        ],
      },
      recommendation: {
        status: "unsupported",
        category: null,
        steps: [],
        rule: null,
        message: "",
      },
      preview: true,
      confirmed: false,
      createdAt: new Date(),
    };
    const inlineScan = await database
      .collection("history")
      .insertOne(inlineFixture);
    await page.route("**/api/classify", (route) =>
      route.fulfill({
        json: { ...inlineFixture, _id: String(inlineScan.insertedId) },
      }),
    );
    await page
      .getByRole("button", { name: "Identify waste", exact: true })
      .click();
    await page
      .getByRole("tab", { name: "Write a description", exact: true })
      .click();
    await page.getByLabel("Describe your item").fill("A paper bag");
    await page
      .getByRole("button", { name: "Identify my item", exact: true })
      .click();
    await page
      .getByLabel(
        "I reviewed the suggestions and answered what I can establish",
      )
      .check();
    await page
      .getByRole("button", { name: "Confirm & schedule pickup", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Schedule this pickup", exact: true })
      .waitFor();
    const quick = page.getByRole("region", { name: "Schedule this scan" });
    await quick.getByLabel("Estimated weight (kg)").fill("1");
    await quick
      .getByLabel("I have separated the materials for collection")
      .check();
    await quick
      .getByRole("button", { name: "Request this pickup", exact: true })
      .click();
    await quick
      .getByRole("heading", { name: "Pickup requested", exact: true })
      .waitFor();
    assert.equal(
      (
        await database
          .collection("service_accounts")
          .findOne({ _id: new ObjectId(resident.id) })
      ).bookings.filter((b) => b.scanId === String(inlineScan.insertedId))
        .length,
      1,
    );
    await page.unroute("**/api/classify");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await login("collector@example.test");
    await page
      .locator("nav")
      .getByRole("button", { name: "Helper dashboard", exact: true })
      .waitFor();
    assert.equal(
      await page
        .locator("nav")
        .getByRole("button", { name: "Plans", exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "Service area", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Use my location", exact: true })
      .click();
    await page.getByText("28.61390, 77.20900", { exact: false }).waitFor();
    await page.getByRole("button", { name: "हिन्दी", exact: true }).click();
    await page
      .getByRole("button", { name: "मेरा स्थान चुनें", exact: true })
      .waitFor();
    await page.screenshot({
      path: "/tmp/waste-right-helper-area.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("button", { name: "New here? Create an account", exact: true })
      .click();
    await page.getByLabel("Your name").fill("New helper QA");
    await page.getByLabel("Email address").fill("signup-helper@example.test");
    await page.locator("input[name=password]").fill("QA-only-password-1234");
    await page
      .getByRole("button", { name: "Account type", exact: true })
      .click();
    await page.getByRole("option", { name: "Helper", exact: true }).click();
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page.locator("dialog").waitFor({ state: "hidden" });
    await page
      .locator("nav")
      .getByRole("button", { name: "Helper dashboard", exact: true })
      .waitFor();
    assert.equal(
      (
        await database
          .collection("users")
          .findOne({ email: "signup-helper@example.test" })
      ).accountType,
      "helper",
    );
    assert.deepEqual(errors, []);
    await ctx.close();
  } finally {
    await browser.close();
  }
  console.log(
    "PASS: owner isolation, collector approval, once-daily points, atomic redemption, booking idempotency, competing claims, measured receipt approval, settlement, signed webhook replay/tamper rejection, quote workflow, multi-item review, role-specific signup/navigation, saved geolocation, Hindi and mobile layout.",
  );
} finally {
  await database.dropDatabase();
  await client.close();
  server.kill("SIGTERM");
}
