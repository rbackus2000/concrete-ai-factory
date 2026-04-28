import { cookies } from "next/headers";

import { findMemberById, type TradeMemberRecord } from "@/lib/services/trade-member-service";

// ── Trade portal session ──
// Signed cookie holding { memberId, expiresAt }. Verified with HMAC-SHA256
// via the Web Crypto API (subtle.sign) so the same code runs in Edge
// middleware AND Node route handlers without polyfills.

export const TRADE_SESSION_COOKIE = "trade_session";
const SESSION_TTL_DAYS = 30;

type SessionPayload = {
  memberId: string;
  expiresAt: number; // epoch ms
};

function getSecretBytes(): Uint8Array {
  const secret = process.env.TRADE_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "TRADE_SESSION_SECRET is not set or is too short. Set a 32+ character random string.",
    );
  }
  return new TextEncoder().encode(secret);
}


// ── base64url helpers (no Buffer; works in Edge) ──

function bytesToB64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // btoa is available in both Node and Edge runtimes
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

// ── HMAC-SHA256 via Web Crypto ──

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  // Make a fresh ArrayBuffer (not SharedArrayBuffer) for the WebCrypto API.
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

/**
 * Constant-time string compare. Web Crypto's subtle.verify takes the
 * raw signature bytes; doing equality on the base64url string here is
 * fine as long as we keep it constant-time.
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export async function buildSessionCookieValue(payload: SessionPayload): Promise<string> {
  const payloadB64 = stringToB64Url(JSON.stringify(payload));
  const sig = await hmac(payloadB64);
  return `${payloadB64}.${sig}`;
}

async function verifyCookieValue(value: string | undefined | null): Promise<SessionPayload | null> {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;

  let expected: string;
  try {
    expected = await hmac(payloadB64);
  } catch (err) {
    // Surface failures (e.g. missing TRADE_SESSION_SECRET) so they're not
    // silently treated as "session invalid". Tail server logs to debug.
    console.error("[trade-session] HMAC sign failed:", err instanceof Error ? err.message : err);
    return null;
  }

  if (!constantTimeEquals(sig, expected)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(b64UrlToString(payloadB64));
  } catch {
    return null;
  }
  if (typeof payload.memberId !== "string" || typeof payload.expiresAt !== "number") return null;
  if (payload.expiresAt < Date.now()) return null;
  return payload;
}

/**
 * Edge-safe verification. Used by middleware to gate routes without a DB call.
 */
export async function verifyTradeSessionCookie(
  value: string | undefined | null,
): Promise<SessionPayload | null> {
  return verifyCookieValue(value);
}

export async function setTradeSessionCookie(memberId: string): Promise<void> {
  const expiresAt = Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  const value = await buildSessionCookieValue({ memberId, expiresAt });
  const c = await cookies();
  c.set(TRADE_SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearTradeSessionCookie(): Promise<void> {
  const c = await cookies();
  c.delete(TRADE_SESSION_COOKIE);
}

/**
 * Server Component / Server Action helper — returns the active trade
 * member or null. Performs a DB lookup, so call once per request.
 */
export async function getTradeSession(): Promise<TradeMemberRecord | null> {
  const c = await cookies();
  const value = c.get(TRADE_SESSION_COOKIE)?.value;
  const payload = await verifyCookieValue(value);
  if (!payload) return null;
  const member = await findMemberById(payload.memberId);
  if (!member) return null;
  if (member.status !== "ACTIVE") return null;
  return member;
}

/**
 * Throws if not authenticated. Use in portal Server Components/Actions
 * after the middleware has already gated the route — this is the
 * belt-and-suspenders DB-backed check.
 */
export async function requireTradeMember(): Promise<TradeMemberRecord> {
  const m = await getTradeSession();
  if (!m) {
    throw new Error("Not authenticated as trade member");
  }
  return m;
}
