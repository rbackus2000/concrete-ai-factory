-- AlterEnum
ALTER TYPE "OutputType" ADD VALUE 'IMAGE_RENDER';

-- CreateTable
CREATE TABLE "generated_image_assets" (
    "id" TEXT NOT NULL,
    "generatedOutputId" TEXT NOT NULL,
    "promptTextUsed" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "filePath" TEXT,
    "status" "OutputStatus" NOT NULL DEFAULT 'QUEUED',
    "width" INTEGER,
    "height" INTEGER,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_image_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generated_image_assets_generatedOutputId_createdAt_idx" ON "generated_image_assets"("generatedOutputId", "createdAt");

-- AddForeignKey
ALTER TABLE "generated_image_assets" ADD CONSTRAINT "generated_image_assets_generatedOutputId_fkey" FOREIGN KEY ("generatedOutputId") REFERENCES "generated_outputs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
