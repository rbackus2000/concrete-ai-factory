-- CreateTable
CREATE TABLE "generated_output_build_packet_sections" (
    "id" TEXT NOT NULL,
    "generatedOutputId" TEXT NOT NULL,
    "buildPacketTemplateId" TEXT,
    "sectionKey" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "sectionOrder" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_output_build_packet_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generated_output_build_packet_sections_generatedOutputId_sectionOrder_idx"
ON "generated_output_build_packet_sections"("generatedOutputId", "sectionOrder");

-- AddForeignKey
ALTER TABLE "generated_output_build_packet_sections"
ADD CONSTRAINT "generated_output_build_packet_sections_generatedOutputId_fkey"
FOREIGN KEY ("generatedOutputId")
REFERENCES "generated_outputs"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_output_build_packet_sections"
ADD CONSTRAINT "generated_output_build_packet_sections_buildPacketTemplateId_fkey"
FOREIGN KEY ("buildPacketTemplateId")
REFERENCES "build_packet_templates"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
