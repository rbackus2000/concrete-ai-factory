import { createHash, randomBytes } from "crypto";

import { TradeMemberStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

export type TradeMemberRecord = {
  id: string;
  email: string;
  firmName: string;
  contactName: string;
  phone: string | null;
  profession: string | null;
  tradeDiscountPct: number;
  status: TradeMemberStatus;
  linkedContactId: string | null;
  approvedAt: Date;
  approvedBy: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const LOGIN_TOKEN_TTL_MINUTES = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateRawToken(): string {
  // 32 bytes (~256 bits) base64url-encoded — fits cleanly in a magic link URL.
  return randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function findMemberByEmail(email: string): Promise<TradeMemberRecord | null> {
  const m = await prisma.tradeMember.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  return m;
}

export async function findMemberById(id: string): Promise<TradeMemberRecord | null> {
  const m = await prisma.tradeMember.findUnique({ where: { id } });
  return m;
}

/**
 * Create a new TradeMember from an approved trade application. Idempotent
 * on email — if a member already exists, returns the existing record.
 */
export async function createTradeMember(input: {
  email: string;
  firmName: string;
  contactName: string;
  phone?: string | null;
  profession?: string | null;
  linkedContactId?: string | null;
  approvedBy: string;
  tradeDiscountPct?: number;
}): Promise<TradeMemberRecord> {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.tradeMember.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.tradeMember.create({
    data: {
      email,
      firmName: input.firmName,
      contactName: input.contactName,
      phone: input.phone ?? null,
      profession: input.profession ?? null,
      linkedContactId: input.linkedContactId ?? null,
      approvedBy: input.approvedBy,
      tradeDiscountPct: input.tradeDiscountPct ?? 15,
      status: TradeMemberStatus.ACTIVE,
    },
  });
}

/**
 * Generate a one-time magic-link token. Returns the raw token (which is
 * only shown to the email recipient) and stores only the hash.
 */
export async function generateLoginToken(memberId: string, meta?: {
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.tradeMemberLoginToken.create({
    data: {
      memberId,
      tokenHash,
      expiresAt,
      requestedFromIp: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    },
  });

  return { rawToken, expiresAt };
}

/**
 * Validate a raw token from a magic-link URL. On success, marks the
 * token as consumed and returns the linked TradeMember. Returns null
 * for any failure mode (unknown, expired, already-used, suspended).
 */
export async function consumeLoginToken(rawToken: string): Promise<TradeMemberRecord | null> {
  if (!rawToken || typeof rawToken !== "string") return null;
  const tokenHash = hashToken(rawToken);

  const record = await prisma.tradeMemberLoginToken.findUnique({
    where: { tokenHash },
    include: { member: true },
  });
  if (!record) return null;
  if (record.consumedAt) return null;
  if (record.expiresAt < new Date()) return null;
  if (record.member.status !== TradeMemberStatus.ACTIVE) return null;

  await prisma.$transaction([
    prisma.tradeMemberLoginToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    prisma.tradeMember.update({
      where: { id: record.memberId },
      data: { lastLoginAt: new Date() },
    }),
  ]);

  return record.member;
}

export async function listTradeMembers(): Promise<TradeMemberRecord[]> {
  return prisma.tradeMember.findMany({
    orderBy: { approvedAt: "desc" },
  });
}

export async function updateMemberStatus(
  id: string,
  status: TradeMemberStatus,
): Promise<TradeMemberRecord> {
  return prisma.tradeMember.update({
    where: { id },
    data: { status },
  });
}
