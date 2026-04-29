/**
 * One-shot: import the legacy INTERNAL_AUTH_USERS_JSON env users into the
 * new staff_users table. Their existing plaintext passwords are PBKDF2-
 * hashed so they can keep using the same credentials after the cutover.
 *
 * mustChangePassword is set to FALSE for migrated users — they already
 * had a working password, no need to force a change. New invites get
 * mustChangePassword=true.
 *
 * Usage:
 *   INTERNAL_AUTH_USERS_JSON='[...]' DATABASE_URL='...' npx tsx scripts/migrate-env-users-to-staff-table.ts
 *
 * Idempotent: skips users whose email already exists in staff_users.
 */
import path from "node:path";
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadDotenv({ path: path.resolve(process.cwd(), ".env"), quiet: true });

import { PrismaClient } from "@prisma/client";

import { hashPassword } from "@/lib/auth/password";
import { staffRoleSchema, type StaffRole } from "@/lib/schemas/domain";

type LegacyUser = {
  username: string;
  password: string;
  displayName?: string;
  role?: string;
  email?: string;
};

function parseLegacyUsers(): LegacyUser[] {
  const raw = process.env.INTERNAL_AUTH_USERS_JSON;
  if (!raw) throw new Error("INTERNAL_AUTH_USERS_JSON not set in environment.");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("INTERNAL_AUTH_USERS_JSON must be an array.");
  return parsed as LegacyUser[];
}

/**
 * Convert legacy role string ("ADMIN" | "USER") to a StaffRole. Anything
 * other than ADMIN becomes SHOP_USER as the safe default — the admin can
 * promote later via /admin/staff.
 */
function mapRole(legacy: string | undefined): StaffRole {
  const candidate = legacy === "ADMIN" ? "ADMIN" : "SHOP_USER";
  const parsed = staffRoleSchema.safeParse(candidate);
  return parsed.success ? parsed.data : "SHOP_USER";
}

/**
 * Username may be an email already, or just a handle. If it's not an email
 * we synthesize one as <handle>@local.staff so the unique constraint holds
 * — admin can edit later.
 */
function emailFor(user: LegacyUser): string {
  if (user.email && user.email.includes("@")) return user.email.trim().toLowerCase();
  if (user.username.includes("@")) return user.username.trim().toLowerCase();
  return `${user.username.trim().toLowerCase()}@local.staff`;
}

async function main() {
  const legacyUsers = parseLegacyUsers();
  console.log(`Found ${legacyUsers.length} legacy users in INTERNAL_AUTH_USERS_JSON.`);

  const prisma = new PrismaClient();
  let created = 0;
  let skipped = 0;

  for (const u of legacyUsers) {
    const email = emailFor(u);
    const existing = await prisma.staffUser.findUnique({ where: { email } });
    if (existing) {
      console.log(`  SKIP  ${email} (already exists)`);
      skipped++;
      continue;
    }
    const role = mapRole(u.role);
    const passwordHash = await hashPassword(u.password);
    await prisma.staffUser.create({
      data: {
        email,
        displayName: u.displayName?.trim() || u.username,
        role,
        status: "ACTIVE",
        passwordHash,
        // Legacy users keep their existing password — no forced change.
        mustChangePassword: false,
      },
    });
    console.log(`  ADD   ${email} (${role})`);
    created++;
  }

  await prisma.$disconnect();
  console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
  console.log(`\nNext step: remove INTERNAL_AUTH_USERS_JSON from Vercel env once you've verified login works.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
