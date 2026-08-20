import "server-only";
import crypto from "node:crypto";

// Basic shared-password admin auth. Structured behind these three functions
// so the whole thing can be swapped for Supabase Auth later without touching
// callers (app/admin/page.tsx and app/api/admin/route.ts only ever call
// checkAdminPassword / createAdminSessionToken / verifyAdminSessionToken).

export const ADMIN_SESSION_COOKIE = "carpark_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function getSecret(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error("Missing ADMIN_PASSWORD environment variable");
  }
  return secret;
}

export function checkAdminPassword(password: string): boolean {
  const expected = getSecret();
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createAdminSessionToken(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;

  const expiresAt = Number(payload);
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) return false;

  return true;
}
