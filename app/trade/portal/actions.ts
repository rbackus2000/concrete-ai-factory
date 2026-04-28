"use server";

import {
  clearTradeSessionCookie,
} from "@/lib/auth/trade-session";
import {
  findMemberByEmail,
  generateLoginToken,
} from "@/lib/services/trade-member-service";
import { sendTradeMagicLinkEmail } from "@/lib/services/postmark-service";

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Magic-link request from the public /trade/portal/login page.
 *
 * Returns a success-shaped result regardless of whether the email
 * exists in the system — this is intentional, so the endpoint can't
 * be used to enumerate which firms have trade accounts. Console-logs
 * the actual outcome for ops debugging.
 */
export async function requestMagicLinkAction(email: string): Promise<{ ok: true }> {
  const cleaned = email.trim().toLowerCase();
  if (!cleaned || !cleaned.includes("@")) {
    return { ok: true };
  }

  const member = await findMemberByEmail(cleaned);
  if (!member) {
    console.warn("[trade-portal/login] no member found for", cleaned);
    return { ok: true };
  }
  if (member.status !== "ACTIVE") {
    console.warn("[trade-portal/login] member not active:", cleaned, member.status);
    return { ok: true };
  }

  const { rawToken } = await generateLoginToken(member.id);
  const loginUrl = `${getAppUrl()}/trade/portal/verify?token=${encodeURIComponent(rawToken)}`;

  try {
    await sendTradeMagicLinkEmail({
      to: member.email,
      contactName: member.contactName.split(/\s+/)[0] || member.contactName,
      loginUrl,
    });
  } catch (err) {
    console.error("[trade-portal/login] magic-link email failed", err);
  }

  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  await clearTradeSessionCookie();
}
