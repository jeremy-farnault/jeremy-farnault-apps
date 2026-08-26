/**
 * Normalize a tool call's raw arguments into a plain object. Ollama may hand
 * arguments back as an object or a JSON-encoded string, so every tool routes
 * its `rawArgs` through this before reading fields. Anything unparseable
 * becomes an empty object so callers can apply their own defaults.
 */
export function normalizeToolArguments(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return {};
}
