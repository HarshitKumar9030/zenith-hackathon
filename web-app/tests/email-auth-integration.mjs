// Exercises real SMTP over TLS against a local sink. Never contacts Google.
import assert from "node:assert/strict";
import { createServer } from "node:tls";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { MongoClient } from "mongodb";
createRequire(import.meta.url)("@next/env").loadEnvConfig(process.cwd());
const dir = await mkdtemp(join(tmpdir(), "waste-right-email-"));
const messages = [];
const sockets = new Set();
let server, app;
const databaseName = `waste_right_email_qa_${Date.now()}`;
const client = new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017");
const port = Number(process.env.QA_EMAIL_PORT || 3108);
const base = `http://localhost:${port}`;
const hash = s => createHash("sha256").update(s).digest("hex");
async function request(action, body, cookie) {
  const response = await fetch(`${base}/api/auth/${action}`, {
    method: body ? "POST" : "GET", headers: { Origin: base, ...(body ? { "Content-Type": "application/json" } : {}), "user-agent":"WasteRightQA/1.0 Chrome/140 Windows", "x-forwarded-for":"203.0.113.25", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined,
  });
  return { response, data: await response.json() };
}
const decodeMail=raw=>raw.replace(/=\r\n/g, "").replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
function notifications(){return messages.map(decodeMail).filter(raw=>raw.includes("New sign-in to your Waste Right account"));}
async function waitForNotifications(n){for(let i=0;i<80;i++){if(notifications().length>=n)return;await new Promise(r=>setTimeout(r,100));}throw new Error("Expected sign-in notification was not received");}
function tokenFromLastEmail() {
  const raw = [...messages].reverse().map(decodeMail).find(raw=>raw.includes("/account#")) || "";
  const link = raw.match(/http:\/\/localhost:\d+\/account#[^\s]+/)?.[0];
  assert.ok(link, "SMTP message contains the account link");
  return new URLSearchParams(new URL(link).hash.slice(1)).get("token");
}
try {
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(dir, "key.pem"), "-out", join(dir, "cert.pem"), "-days", "1", "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost"], { stdio: "ignore" });
  server = createServer({ key: await readFile(join(dir, "key.pem")), cert: await readFile(join(dir, "cert.pem")) }, socket => {
    sockets.add(socket); socket.on("close", () => sockets.delete(socket));
    socket.setEncoding("utf8"); socket.write("220 localhost SMTP test sink\r\n");
    let buffer = "", data = false, message = "";
    socket.on("data", chunk => {
      buffer += chunk;
      while (buffer.includes("\r\n")) {
        const end = buffer.indexOf("\r\n"), line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (data) { if (line === ".") { messages.push(message); message = ""; data = false; socket.write("250 Accepted\r\n"); } else message += line + "\r\n"; }
        else if (/^EHLO/.test(line)) socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
        else if (/^AUTH/.test(line)) socket.write("235 Authenticated\r\n");
        else if (line === "DATA") { data = true; socket.write("354 Send data\r\n"); }
        else if (line === "QUIT") socket.end("221 Bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  await client.connect();
  const db = client.db(databaseName);
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", String(port)], { env: { ...process.env, MONGODB_DB: databaseName, NODE_EXTRA_CA_CERTS: join(dir, "cert.pem"), SMTP_HOST: "localhost", SMTP_SECURE: "true", SMTP_PORT: String(server.address().port), SMTP_USER: "test@example.test", SMTP_PASSWORD: "local-test-password", SMTP_FROM: "test@example.test", APP_URL: base, AUTH_TRUSTED_PROXY_HOPS:"1", VERCEL:"", NODE_ENV: "production" }, stdio: "ignore" });
  // The test server uses implicit TLS on its dynamically assigned port.
  // SMTP_SECURE explicitly enables implicit TLS for a nonstandard test port.
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base + "/api/auth/session")).ok) break; } catch {} await new Promise(r => setTimeout(r, 250)); if (i === 79) throw Error("QA app did not start"); }
  const email = "resident@example.test", password = "First-password-1234";
  let result = await request("signup", { email, password, name: "Mail QA" });
  assert.equal(result.data.verificationRequired, true);
  assert.equal(result.response.headers.get("set-cookie"), null);
  assert.equal(messages.length, 1);
  let token = tokenFromLastEmail();
  assert.equal((await db.collection("email_tokens").findOne({ _id: hash(token) })).purpose, "verify");
  assert.equal((await request("login", { email, password })).response.status, 403);
  assert.equal((await request("reset", { token, password })).response.status, 400, "Wrong purpose cannot consume verification");
  result = await request("verify", { token }); assert.equal(result.response.status, 200);
  const cookie = result.response.headers.get("set-cookie").split(";")[0];
  await waitForNotifications(1);
  assert.match(notifications()[0],/203\.0\.113\.25/);assert.match(notifications()[0],/Email verification/);
  assert.equal((await request("verify", { token })).response.status, 400, "Replay rejected");
  assert.ok((await request("session", undefined, cookie)).data.user);
  const absent = await request("forgot-password", { email: "absent@example.test" });
  result = await request("forgot-password", { email }); assert.deepEqual(result.data, absent.data);
  token = tokenFromLastEmail();
  assert.equal((await request("reset", { token, password: "short" })).response.status, 400);
  const newPassword = "Second-password-1234";
  const concurrent = await Promise.all([request("reset", { token, password: newPassword }), request("reset", { token, password: newPassword })]);
  assert.deepEqual(concurrent.map(r => r.response.status).sort(), [200, 400]);
  assert.equal((await request("session", undefined, cookie)).data.user, null, "Reset revokes old sessions");
  assert.equal((await request("login", { email, password })).response.status, 401);
  assert.equal((await request("login", { email, password: newPassword })).response.status, 200);
  await waitForNotifications(2);
  await request("send-signin", { email }); token = tokenFromLastEmail();
  await db.collection("email_tokens").updateOne({ _id: hash(token) }, { $set: { expiresAt: new Date(0) } });
  assert.equal((await request("signin", { token })).response.status, 400, "Expiry enforced without waiting for TTL cleanup");
  await request("send-signin", { email }); token = tokenFromLastEmail();
  assert.equal((await request("signin", { token })).response.status, 200);
  await waitForNotifications(3);
  assert.equal(notifications().length,3,"Exactly one notice for each verification, password and email-link session");
  assert.equal((await request("signin", { token })).response.status,400);
  assert.equal(notifications().length,3,"Rejected replay does not send another notice");
  assert.equal((await request("send-signin", { email })).response.status, 429);
  console.log("PASS: local TLS SMTP delivery, verification, sign-in, purpose isolation, expiry, replay/race rejection, password reset, session revocation request limits and one sign-in notice per new session.");
} finally {
  app?.kill("SIGTERM");
  if (app) await new Promise(resolve => app.once("exit", resolve));
  for (const socket of sockets) socket.destroy();
  if (server) await new Promise(resolve => server.close(resolve));
  try { await client.db(databaseName).dropDatabase(); } finally { await client.close(); await rm(dir, { recursive: true, force: true }); }
}
