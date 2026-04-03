-- CreateEnum
CREATE TYPE "SlatWallProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SlatPosition" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "SlatRecordStatus" AS ENUM ('PENDING', 'PRINTED', 'QC_PASSED', 'INSTALLED');

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'SLAT_WALL_PROJECT';

-- CreateTable
CREATE TABLE "slat_wall_projects" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SlatWallProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "clientName" TEXT,
    "location" TEXT,
    "designer" TEXT,
    "engineer" TEXT,
    "revision" TEXT,
    "description" TEXT,
    "positionAName" TEXT,
    "positionBName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slat_wall_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slat_wall_configs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "totalSlatCount" INTEGER NOT NULL DEFAULT 32,
    "slatWidth" DECIMAL(8,2) NOT NULL DEFAULT 7,
    "slatThickness" DECIMAL(8,2) NOT NULL DEFAULT 0.45,
    "slatHeight" DECIMAL(8,2) NOT NULL DEFAULT 180,
    "totalWallWidth" DECIMAL(8,2),
    "supportFrameType" TEXT,
    "pivotType" TEXT,
    "rotationAngleA" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "rotationAngleB" DECIMAL(8,2) NOT NULL DEFAULT 180,
    "slatSpacing" DECIMAL(8,2) NOT NULL DEFAULT 0.25,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slat_wall_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slat_wall_artworks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "position" "SlatPosition" NOT NULL,
    "originalFilename" TEXT,
    "filePath" TEXT,
    "imageUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "description" TEXT,
    "cropMode" TEXT,
    "fitMode" TEXT,
    "bleedMargin" DECIMAL(8,4),
    "safeMargin" DECIMAL(8,4),
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slat_wall_artworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slat_records" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "slatIndex" INTEGER NOT NULL,
    "slatId" TEXT NOT NULL,
    "wallPosition" INTEGER NOT NULL,
    "width" DECIMAL(8,2),
    "height" DECIMAL(8,2),
    "thickness" DECIMAL(8,2),
    "weight" DECIMAL(8,2),
    "faceASliceId" TEXT,
    "faceAImageUrl" TEXT,
    "faceAFilePath" TEXT,
    "faceAColorRef" TEXT,
    "faceBSliceId" TEXT,
    "faceBImageUrl" TEXT,
    "faceBFilePath" TEXT,
    "faceBColorRef" TEXT,
    "orientation" TEXT NOT NULL DEFAULT 'STANDARD',
    "pivotTopId" TEXT,
    "pivotBottomId" TEXT,
    "status" "SlatRecordStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slat_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slat_wall_projects_code_key" ON "slat_wall_projects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "slat_wall_projects_slug_key" ON "slat_wall_projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "slat_wall_configs_projectId_key" ON "slat_wall_configs"("projectId");

-- CreateIndex
CREATE INDEX "slat_wall_artworks_projectId_idx" ON "slat_wall_artworks"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "slat_wall_artworks_projectId_position_key" ON "slat_wall_artworks"("projectId", "position");

-- CreateIndex
CREATE INDEX "slat_records_projectId_slatIndex_idx" ON "slat_records"("projectId", "slatIndex");

-- CreateIndex
CREATE UNIQUE INDEX "slat_records_projectId_slatIndex_key" ON "slat_records"("projectId", "slatIndex");

-- AddForeignKey
ALTER TABLE "slat_wall_configs" ADD CONSTRAINT "slat_wall_configs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "slat_wall_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slat_wall_artworks" ADD CONSTRAINT "slat_wall_artworks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "slat_wall_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slat_records" ADD CONSTRAINT "slat_records_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "slat_wall_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
