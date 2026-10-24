export async function serviceApi(path: string, body?: unknown) {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new Error("Connection lost. Check your connection and refresh before retrying a payment or booking.");
  }
  let value: Record<string, unknown>;
  try { value = await response.json(); }
  catch { throw new Error(response.ok ? "The server returned an unreadable response. Refresh to check whether your change was saved." : "The service is temporarily unavailable. Refresh and try again."); }
  if (!response.ok) throw new Error(typeof value.error === "string" ? value.error : "Request failed. Refresh and try again.");
  return value as any;
}
