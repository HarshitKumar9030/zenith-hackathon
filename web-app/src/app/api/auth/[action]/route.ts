import { issueEmailToken, consumeEmailToken, type EmailPurpose } from "@/lib/email-auth";
import { emailConfigured } from "@/lib/email";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { roleFor } from "@/lib/service";
import { db } from "@/lib/db";
import {
  checkOrigin,
  createSession,
  currentUser,
  hashToken,
  passwordHash,
  passwordMatches,
} from "@/lib/auth";
export async function GET() {
  try {
    const user = await currentUser();
    return NextResponse.json({
      user: user
        ? {
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: roleFor(user),
            accountType:
              user.accountType === "helper" || user.role === "collector"
                ? "helper"
                : "user",
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { error: "MongoDB is unavailable. Start your local database." },
      { status: 503 },
    );
  }
}
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  try {
    checkOrigin(request);
    const { action } = await context.params;
    const database = await db();
    if (action === "logout") {
      const jar = await cookies();
      const token = jar.get("ww_session")?.value;
      if (token)
        await database
          .collection("sessions")
          .deleteOne({ _id: hashToken(token) as never });
      jar.delete("ww_session");
      return NextResponse.json({ ok: true });
    }
    const emailActions: Record<string, EmailPurpose> = { "forgot-password": "reset", "send-signin": "signin", "resend-verification": "verify" };
    if (Object.hasOwn(emailActions, action)) {
      if (!emailConfigured()) return NextResponse.json({ error: "Email delivery is not configured yet. Please contact support." }, { status: 503 });
      const { email } = z.object({ email: z.email().max(254).transform(v => v.toLowerCase()) }).parse(await request.json());
      const bucket = `email:${hashToken(email)}:${Math.floor(Date.now() / 600000)}`;
      const attempt = await database.collection("auth_attempts").findOneAndUpdate({ _id: bucket as never }, { $inc: { count: 1 }, $set: { expiresAt: new Date(Date.now() + 600000) } }, { upsert: true, returnDocument: "after" });
      if ((attempt?.count || 0) > 3) return NextResponse.json({ error: "Too many email requests. Try again in ten minutes." }, { status: 429 });
      const user = await database.collection("users").findOne({ email });
      if (user && !(emailActions[action] === "verify" && user.emailVerifiedAt)) {
        try { await issueEmailToken(user, emailActions[action]); }
        catch { /* Keep account existence and transport failures private. */ }
      }
      return NextResponse.json({ ok: true, message: "If an eligible account exists, an email will arrive shortly. Check your spam folder too." });
    }
    if (["verify", "reset", "signin"].includes(action)) {
      const data = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: action === "reset" ? z.string().min(10).max(128) : z.string().optional() }).parse(await request.json());
      try { await consumeEmailToken(data.token, action as EmailPurpose, data.password); }
      catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
      return NextResponse.json({ ok: true });
    }
    if (!["login", "signup"].includes(action))
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = z
      .object({
        email: z.email().max(254),
        password: z.string().min(10).max(128),
        name: z.string().min(1).max(80).optional(),
        accountType: z.enum(["user", "helper"]).default("user"),
      })
      .parse(await request.json());
    const email = data.email.toLowerCase();
    // Shared database-backed limit; cannot be reset by restarting a worker.
    const bucket = `${action}:${hashToken(email)}:${Math.floor(Date.now() / 600000)}`;
    const attempt = await database.collection("auth_attempts").findOneAndUpdate(
      { _id: bucket as never },
      {
        $inc: { count: 1 },
        $set: { expiresAt: new Date(Date.now() + 600000) },
      },
      { upsert: true, returnDocument: "after" },
    );
    if ((attempt?.count || 0) > 10)
      return NextResponse.json(
        { error: "Too many attempts. Try again in ten minutes." },
        { status: 429 },
      );
    if (action === "signup") {
      const user = await database.collection("users").insertOne({
        email,
        name: data.name || email.split("@")[0],
        password: await passwordHash(data.password),
        accountType: data.accountType,
        collectorRequested: data.accountType === "helper",
        ...(data.accountType === "helper"
          ? { collectorRequestedAt: new Date() }
          : {}),
        emailVerificationRequired: emailConfigured(),
        createdAt: new Date(),
      });
      if (emailConfigured()) {
        const created = await database.collection("users").findOne({ _id: user.insertedId });
        try { await issueEmailToken(created!, "verify"); }
        catch { return NextResponse.json({ verificationRequired: true, message: "Account created, but email delivery failed. Use Resend verification to try again." }); }
        return NextResponse.json({ verificationRequired: true, message: "Check your email to verify your account. The link expires in 15 minutes." });
      }
      await createSession(user.insertedId);
    } else {
      const user = await database.collection("users").findOne({ email });
      const valid = await passwordMatches(
        data.password,
        user?.password || (await passwordHash("unused-dummy-password")),
      );
      if (!user || !valid)
        return NextResponse.json(
          { error: "Email or password is incorrect." },
          { status: 401 },
        );
      if (user.emailVerificationRequired && !user.emailVerifiedAt)
        return NextResponse.json({ error: "Verify your email before signing in. Use Resend verification if needed." }, { status: 403 });
      await createSession(user._id);
    }
    return GET();
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    if ((error as { code?: number }).code === 11000)
      return NextResponse.json(
        { error: "Unable to create account. Try signing in." },
        { status: 409 },
      );
    return NextResponse.json(
      { error: "Unable to authenticate. Check your local MongoDB connection." },
      { status: 503 },
    );
  }
}
