import nodemailer from "nodemailer";

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM && process.env.APP_URL);
}

export function accountLink(action: string, token: string) {
  const base = new URL(process.env.APP_URL || "http://localhost:3001");
  if (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname))
    throw new Error("APP_URL must use HTTPS outside localhost.");
  const link = new URL("/account", base);
  // Fragments keep the bearer token out of access logs and referrer headers.
  link.hash = new URLSearchParams({ action, token }).toString();
  return link.toString();
}

export async function sendAccountEmail(to: string, purpose: string, link: string) {
  if (!emailConfigured()) throw new Error("Email delivery is not configured.");
  const transport = createEmailTransport();
  const title = purpose === "reset" ? "Reset your password" : purpose === "verify" ? "Verify your email" : "Sign in to EcoMitra";
  await transport.sendMail({
    from: { name: "EcoMitra", address: process.env.SMTP_FROM! },
    to,
    subject: `${title} — EcoMitra`,
    text: `${title}\n\nOpen this link to continue:\n${link}\n\nThis link expires in 15 minutes and works only once. If you did not request this email, ignore it.\n\nEcoMitra`,
  });
}

export function createEmailTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS: !secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}
