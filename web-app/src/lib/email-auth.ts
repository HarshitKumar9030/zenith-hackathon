import { randomBytes } from "node:crypto";
import type { WithId, Document } from "mongodb";
import { db } from "./db";
import { createSession, hashToken, passwordHash } from "./auth";
import { accountLink, emailConfigured, sendAccountEmail } from "./email";

export type EmailPurpose = "verify" | "reset" | "signin";
export async function issueEmailToken(user: WithId<Document>, purpose: EmailPurpose) {
  if (!emailConfigured()) throw new Error("Email delivery is not configured.");
  const database = await db();
  const token = randomBytes(32).toString("hex");
  const id = hashToken(token);
  await database.collection("email_tokens").insertOne({
    _id: id as never, userId: user._id, purpose,
    // Tie links to the password version so a reset invalidates outstanding links.
    passwordVersion: hashToken(user.password),
    expiresAt: new Date(Date.now() + 15 * 60000),
  });
  try { await sendAccountEmail(user.email, purpose, accountLink(purpose, token)); }
  catch { await database.collection("email_tokens").deleteOne({ _id: id as never }); throw new Error("Unable to send email. Please try again later."); }
}

export async function consumeEmailToken(token: string, purpose: EmailPurpose, password?: string) {
  const database = await db();
  const nextPassword = purpose === "reset" ? await passwordHash(password!) : undefined;
  const record = await database.collection("email_tokens").findOneAndDelete({
    _id: hashToken(token) as never, purpose, expiresAt: { $gt: new Date() },
  });
  if (!record) throw new Error("This link has expired or already been used. Request a new one.");
  const user = await database.collection("users").findOne({ _id: record.userId });
  if (!user || hashToken(user.password) !== record.passwordVersion) throw new Error("This link is no longer valid. Request a new one.");
  const changed = await database.collection("users").updateOne({ _id: user._id, password: user.password }, {
    $set: { emailVerifiedAt: new Date(), ...(nextPassword ? { password: nextPassword } : {}) },
  });
  if (!changed.matchedCount) throw new Error("Account changed. Request a new link.");
  if (purpose === "reset") {
    await database.collection("sessions").deleteMany({ userId: user._id });
    await database.collection("email_tokens").deleteMany({ userId: user._id });
  } else await createSession(user._id, purpose === "verify" ? "Email verification" : "Email sign-in link");
}
