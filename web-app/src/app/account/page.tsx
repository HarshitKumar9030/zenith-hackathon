"use client";
import { useEffect, useState } from "react";

export default function AccountLinkPage() {
  const [link, setLink] = useState({ action: "", token: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    setLink({ action: params.get("action") || "", token: params.get("token") || "" });
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  const valid = ["verify", "reset", "signin"].includes(link.action) && /^[a-f0-9]{64}$/.test(link.token);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const password = new FormData(event.currentTarget).get("password");
    try {
      const response = await fetch(`/api/auth/${link.action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: link.token, ...(password ? { password } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to continue.");
      setDone(true);
      setMessage(link.action === "reset" ? "Password updated. Sign in with your new password." : "Your account is ready. Continue to Waste Right.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <main style={{ maxWidth: 520, margin: "10vh auto", padding: 28 }}>
    <a href="/">Waste Right</a>
    <h1>{link.action === "reset" ? "Reset your password" : link.action === "verify" ? "Verify your email" : "Sign in with email"}</h1>
    {message && <p role="status">{message}</p>}
    {!valid && <p>This link is missing or invalid. Request a new email from the sign-in screen.</p>}
    {valid && !done && <form onSubmit={submit}>
      <p>Confirm below to continue. This link works only once.</p>
      {link.action === "reset" && <label className="field">New password<input name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" /><small>At least 10 characters.</small></label>}
      <button className="primary" disabled={busy}>{busy ? "Please wait…" : link.action === "reset" ? "Save new password" : "Continue"}</button>
    </form>}
    <p><a href="/app">{done && link.action !== "reset" ? "Open dashboard" : "Back to sign in"}</a></p>
  </main>;
}
