-- CreateTable
CREATE TABLE "slat_wall_proposals" (
    "id" TEXT NOT NULL,
    "proposalNumber" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "siteAddress" TEXT,
    "scenarioId" TEXT NOT NULL,
    "wallSize" TEXT NOT NULL,
    "slatCount" INTEGER NOT NULL,
    "slatWidthIn" DECIMAL(6,2),
    "slatHeightFt" DECIMAL(6,2),
    "printMethod" TEXT NOT NULL,
    "includeInstall" BOOLEAN NOT NULL DEFAULT true,
    "clientPrice" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "validUntil" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slat_wall_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slat_wall_proposals_proposalNumber_key" ON "slat_wall_proposals"("proposalNumber");
