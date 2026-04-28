-- CreateEnum
CREATE TYPE "TradeMemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateTable
CREATE TABLE "trade_members" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firmName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT,
    "profession" TEXT,
    "tradeDiscountPct" INTEGER NOT NULL DEFAULT 15,
    "status" "TradeMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "linkedContactId" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_member_login_tokens" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "requestedFromIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_member_login_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trade_members_email_key" ON "trade_members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "trade_members_linkedContactId_key" ON "trade_members"("linkedContactId");

-- CreateIndex
CREATE INDEX "trade_members_status_idx" ON "trade_members"("status");

-- CreateIndex
CREATE UNIQUE INDEX "trade_member_login_tokens_tokenHash_key" ON "trade_member_login_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "trade_member_login_tokens_memberId_idx" ON "trade_member_login_tokens"("memberId");

-- CreateIndex
CREATE INDEX "trade_member_login_tokens_expiresAt_idx" ON "trade_member_login_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "trade_members" ADD CONSTRAINT "trade_members_linkedContactId_fkey" FOREIGN KEY ("linkedContactId") REFERENCES "contacts_crm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_member_login_tokens" ADD CONSTRAINT "trade_member_login_tokens_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "trade_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

