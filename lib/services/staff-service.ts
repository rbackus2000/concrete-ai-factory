import "server-only";

import { prisma } from "@/lib/db";
import {
  generateTempPassword,
  hashPassword,
  verifyPassword,
} from "@/lib/auth/password";
import type { StaffRole, StaffStatus } from "@/lib/schemas/domain";

export type StaffUserRecord = {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
  status: StaffStatus;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

function toRecord(row: {
  id: string; email: string; displayName: string; role: string; status: string;
  mustChangePassword: boolean; lastLoginAt: Date | null; createdAt: Date;
}): StaffUserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role as StaffRole,
    status: row.status as StaffStatus,
    mustChangePassword: row.mustChangePassword,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
  };
}

export async function listStaff(): Promise<StaffUserRecord[]> {
  const rows = await prisma.staffUser.findMany({
    orderBy: [{ status: "asc" }, { displayName: "asc" }],
    select: {
      id: true, email: true, displayName: true, role: true, status: true,
      mustChangePassword: true, lastLoginAt: true, createdAt: true,
    },
  });
  return rows.map(toRecord);
}

export async function findStaffById(id: string): Promise<StaffUserRecord | null> {
  const row = await prisma.staffUser.findUnique({
    where: { id },
    select: {
      id: true, email: true, displayName: true, role: true, status: true,
      mustChangePassword: true, lastLoginAt: true, createdAt: true,
    },
  });
  return row ? toRecord(row) : null;
}

/**
 * Verify email + password and return the staff record on success. Returns
 * null on any failure — caller should not distinguish "no such user" from
 * "wrong password" to avoid email enumeration.
 */
export async function authenticateStaff(
  email: string,
  password: string,
): Promise<StaffUserRecord | null> {
  const cleaned = email.trim().toLowerCase();
  const row = await prisma.staffUser.findUnique({
    where: { email: cleaned },
    select: {
      id: true, email: true, displayName: true, role: true, status: true,
      mustChangePassword: true, lastLoginAt: true, createdAt: true,
      passwordHash: true,
    },
  });
  if (!row) return null;
  if (row.status !== "ACTIVE") return null;
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) return null;
  await prisma.staffUser.update({
    where: { id: row.id },
    data: { lastLoginAt: new Date() },
  });
  return toRecord(row);
}

/**
 * Admin-issued invite: creates a new staff user with a random temp password
 * and returns the plaintext password to the caller exactly once. The admin
 * must convey it to the user out-of-band (until Postmark is wired up for
 * email magic links).
 */
export async function inviteStaff(input: {
  email: string;
  displayName: string;
  role: StaffRole;
  createdById: string | null;
}): Promise<{ user: StaffUserRecord; tempPassword: string }> {
  const cleanedEmail = input.email.trim().toLowerCase();
  if (!cleanedEmail.includes("@")) {
    throw new Error("Invalid email address.");
  }
  const existing = await prisma.staffUser.findUnique({ where: { email: cleanedEmail } });
  if (existing) {
    throw new Error("A staff user with this email already exists.");
  }
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const row = await prisma.staffUser.create({
    data: {
      email: cleanedEmail,
      displayName: input.displayName.trim() || cleanedEmail,
      role: input.role,
      status: "ACTIVE",
      passwordHash,
      mustChangePassword: true,
      createdById: input.createdById,
    },
    select: {
      id: true, email: true, displayName: true, role: true, status: true,
      mustChangePassword: true, lastLoginAt: true, createdAt: true,
    },
  });
  return { user: toRecord(row), tempPassword };
}

export async function updateStaff(
  id: string,
  patch: { displayName?: string; role?: StaffRole; status?: StaffStatus },
): Promise<StaffUserRecord> {
  const row = await prisma.staffUser.update({
    where: { id },
    data: {
      ...(patch.displayName !== undefined && { displayName: patch.displayName.trim() }),
      ...(patch.role !== undefined && { role: patch.role }),
      ...(patch.status !== undefined && { status: patch.status }),
    },
    select: {
      id: true, email: true, displayName: true, role: true, status: true,
      mustChangePassword: true, lastLoginAt: true, createdAt: true,
    },
  });
  return toRecord(row);
}

/**
 * Admin-triggered password reset. Returns the new temp password to the
 * caller; user is forced to change it on next login.
 */
export async function resetStaffPassword(id: string): Promise<{ tempPassword: string }> {
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await prisma.staffUser.update({
    where: { id },
    data: { passwordHash, mustChangePassword: true },
  });
  return { tempPassword };
}

/**
 * User-initiated password change. Requires the current password to verify.
 */
export async function changeOwnPassword(
  id: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (newPassword.length < 10) {
    return { ok: false, reason: "Password must be at least 10 characters." };
  }
  const row = await prisma.staffUser.findUnique({
    where: { id },
    select: { passwordHash: true, status: true },
  });
  if (!row || row.status !== "ACTIVE") return { ok: false, reason: "Account not found." };
  const ok = await verifyPassword(currentPassword, row.passwordHash);
  if (!ok) return { ok: false, reason: "Current password is incorrect." };
  const newHash = await hashPassword(newPassword);
  await prisma.staffUser.update({
    where: { id },
    data: { passwordHash: newHash, mustChangePassword: false },
  });
  return { ok: true };
}

export async function countActiveAdmins(): Promise<number> {
  return prisma.staffUser.count({ where: { role: "ADMIN", status: "ACTIVE" } });
}
