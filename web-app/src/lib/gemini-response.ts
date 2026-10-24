/** Send only the schema constraints accepted by the generation API.
 * Local Zod validation still enforces field types and length limits. */
export function geminiJsonSchema(schema: Record<string, unknown>, maxItems = 16): Record<string, unknown> {
  const omitted = new Set(["$schema", "additionalProperties", "minLength", "maxLength"]);
  function visit(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => !omitted.has(key)).map(([key, item]) => [key, key === "maxItems" && typeof item === "number" ? Math.min(item, maxItems) : visit(item)]));
  }
  return visit(schema) as Record<string, unknown>;
}
export function identificationFailure(status: number, payload: unknown) {
  const invalidKey = JSON.stringify(payload ?? {}).includes("API_KEY_INVALID");
  if (invalidKey || status === 401 || status === 403) return { status: 503, error: "The identification service credentials were rejected. An administrator needs to check API access." };
  if (status === 429) return { status: 429, error: "The identification service is busy or its quota has been reached. Please try again later." };
  if (status === 404) return { status: 503, error: "The configured identification model is unavailable. An administrator needs to update the model setting." };
  if (status === 400) return { status: 502, error: "The identification service rejected the scan format. Please try again; if this persists, contact support." };
  return { status: 503, error: "The identification service is temporarily unavailable. Please try again shortly." };
}
