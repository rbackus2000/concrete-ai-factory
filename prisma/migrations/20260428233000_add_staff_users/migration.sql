-- Internal staff users — replaces INTERNAL_AUTH_USERS_JSON.

CREATE TYPE "StaffRole" AS ENUM (
  'ADMIN',
  'OPS_MANAGER',
  'SHOP_FOREMAN',
  'SHOP_USER',
  'MARKETING',
  'FINANCE'
);

CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'DISABLED');

CREATE TABLE "staff_users" (
  "id"                  TEXT NOT NULL,
  "email"               TEXT NOT NULL,
  "displayName"         TEXT NOT NULL,
  "role"                "StaffRole" NOT NULL DEFAULT 'SHOP_USER',
  "status"              "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
  "passwordHash"        TEXT NOT NULL,
  "mustChangePassword"  BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt"         TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById"         TEXT,
  "updatedAt"           TIMESTAMP(3) NOT NULL,
  CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_users_email_key" ON "staff_users"("email");
CREATE INDEX "staff_users_status_idx"        ON "staff_users"("status");
CREATE INDEX "staff_users_role_idx"          ON "staff_users"("role");
