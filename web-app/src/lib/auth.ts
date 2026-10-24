import { randomBytes, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import {emailConfigured} from "./email";
import {signInDetails,sendSignInNotification} from "./signin-notification";
import { db } from "./db";
const derive = promisify(scrypt);
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function passwordHash(
  password: string,
  salt = randomBytes(16).toString("hex"),
) {
  return `${salt}:${((await derive(password, salt, 64)) as Buffer).toString("hex")}`;
}
export async function passwordMatches(password: string, stored: string) {
  const [salt] = stored.split(":");
  const computed = await passwordHash(password, salt);
  return (
    computed.length === stored.length &&
    timingSafeEqual(Buffer.from(computed), Buffer.from(stored))
  );
}
export async function currentUser() {
  const token = (await cookies()).get("ww_session")?.value;
  if (!token) return null;
  const database = await db();
  const session = await database.collection("sessions").findOne({
    _id: hashToken(token) as never,
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  return database
    .collection("users")
    .findOne({ _id: session.userId }, { projection: { password: 0 } });
}
export async function createSession(userId: unknown, method = "Password") {
  const token = randomBytes(32).toString("hex");
  await (await db()).collection("sessions").insertOne({
    _id: hashToken(token) as never,
    userId,
    notification: {status: emailConfigured() ? "pending" : "unconfigured"},
    expiresAt: new Date(Date.now() + 7 * 86400000),
  });
  (await cookies()).set("ww_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 86400,
  });
  if(emailConfigured()){
    const details=signInDetails(await headers(),method);
    after(async()=>{
      const sessions=(await db()).collection("sessions");
      const claimed=await sessions.findOneAndUpdate({_id:hashToken(token) as never,"notification.status":"pending"},{$set:{"notification.status":"sending"}});
      if(!claimed)return;
      try{
        const user=await (await db()).collection("users").findOne({_id:userId as never},{projection:{email:1,name:1}});
        if(!user?.email)throw new Error("Notification recipient unavailable");
        await sendSignInNotification(user.email,user.name||"",details);
        await sessions.updateOne({_id:hashToken(token) as never},{$set:{notification:{status:"sent",at:new Date()}}});
      }catch{
        await sessions.updateOne({_id:hashToken(token) as never},{$set:{notification:{status:"failed",at:new Date()}}});
        console.error("Sign-in notification delivery failed.");
      }
    });
  }
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host"))
    throw new Error("Cross-origin request rejected");
}
