import { cookies } from "next/headers";

import type { StaffRole } from "@/lib/schemas/domain";

// ── Internal staff session ──
// Signed cookie holding { staffId, role, expiresAt }. Verified with
// HMAC-SHA256 via the Web Crypto API (subtle.sign) so the same code
// runs in Edge middleware AND Node route handlers without polyfills.
//
// Mirrors lib/auth/trade-session.ts but uses a different cookie name
// and a different secret env var so staff sessions and trade sessions
// never collide and revoking one doesn't affect the other.

export const STAFF_SESSION_COOKIE = "staff_session";
const SESSION_TTL_HOURS = 12; // staff sessions are shorter than trade sessions

export type StaffSessionPayload = {
  staffId: string;
  email: string;
  displayName: string;
  role: StaffRole;
  expiresAt: number; // epoch ms
};

function getSecretBytes(): Uint8Array {
  // Reuse the trade-portal secret if STAFF_SESSION_SECRET isn't set — both
  // are app-internal HMAC keys and the cookie names are different, so
  // there's no cross-contamination risk. In production we recommend a
  // dedicated STAFF_SESSION_SECRET so they can be rotated independently.
  const secret = process.env.STAFF_SESSION_SECRET ?? process.env.TRADE_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "STAFF_SESSION_SECRET (or TRADE_SESSION_SECRET fallback) must be 32+ chars.",
    );
  }
  return new TextEncoder().encode(secret);
}

function bytesToB64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function stringToB64Url(s: string): string {
  return bytesToB64Url(new TextEncoder().encode(s));
}
function b64UrlToString(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(view.byteLength);
  new Uint8Array(out).set(view);
  return out;
}

async function hmac(payloadB64: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(getSecretBytes()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    toArrayBuffer(new TextEncoder().encode(payloadB64)),
  );
  return bytesToB64Url(new Uint8Array(sig));
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function buildCookieValue(payload: StaffSessionPayload): Promise<string> {
  const payloadB64 = stringToB64Url(JSON.stringify(payload));
  const sig = await hmac(payloadB64);
  return `${payloadB64}.${sig}`;
}

async function verifyCookieValue(
  value: string | undefined | null,
): Promise<StaffSessionPayload | null> {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;

  let expected: string;
  try {
    expected = await hmac(payloadB64);
  } catch (err) {
    console.error("[staff-session] HMAC sign failed:", err instanceof Error ? err.message : err);
    return null;
  }
  if (!constantTimeEquals(sig, expected)) return null;

  let payload: StaffSessionPayload;
  try {
    payload = JSON.parse(b64UrlToString(payloadB64));
  } catch {
    return null;
  }
  if (
    typeof payload.staffId !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.displayName !== "string" ||
    typeof payload.role !== "string" ||
    typeof payload.expiresAt !== "number"
  ) {
    return null;
  }
  if (payload.expiresAt < Date.now()) return null;
  return payload;
}

/**
 * Edge-safe verification used by middleware to gate routes without a DB call.
 */
export async function verifyStaffSessionCookie(
  value: string | undefined | null,
): Promise<StaffSessionPayload | null> {
  return verifyCookieValue(value);
}

export async function setStaffSessionCookie(input: {
  staffId: string;
  email: string;
  displayName: string;
  role: StaffRole;
}): Promise<void> {
  const expiresAt = Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000;
  const value = await buildCookieValue({ ...input, expiresAt });
  const c = await cookies();
  c.set(STAFF_SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearStaffSessionCookie(): Promise<void> {
  const c = await cookies();
  c.delete(STAFF_SESSION_COOKIE);
}

export async function readStaffSessionCookie(): Promise<StaffSessionPayload | null> {
  const c = await cookies();
  const value = c.get(STAFF_SESSION_COOKIE)?.value;
  return verifyCookieValue(value);
}
