import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { signatureValid } from "./payments";
test("payment and webhook signatures reject tampering and malformed inputs", () => {
  const body = "order_123|pay_123",
    secret = "unit-test-secret";
  const valid = createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(signatureValid(body, valid, secret), true);
  assert.equal(signatureValid(body + "x", valid, secret), false);
  assert.equal(signatureValid(body, "", secret), false);
  assert.equal(signatureValid(body, "x".repeat(64), secret), false);
  assert.equal(signatureValid(body, valid, "wrong-secret"), false);
});
