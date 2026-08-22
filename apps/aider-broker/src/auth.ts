import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";

const BEARER_PREFIX = "Bearer ";

export function checkBearer(req: IncomingMessage, secret: string): boolean {
  const header = req.headers.authorization;
  if (!header || !header.startsWith(BEARER_PREFIX)) return false;

  const provided = Buffer.from(header.slice(BEARER_PREFIX.length));
  const expected = Buffer.from(secret);
  if (provided.length !== expected.length) return false;

  return timingSafeEqual(provided, expected);
}

export function getTrustedUserId(req: IncomingMessage): string | null {
  const raw = req.headers["x-aider-user-id"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && value.trim().length > 0 ? value.trim() : null;
}
