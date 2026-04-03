-- CreateEnum
CREATE TYPE "SkuCategory" AS ENUM ('VESSEL_SINK', 'COUNTERTOP', 'FURNITURE', 'PANEL');

-- CreateEnum
CREATE TYPE "CategoryScope" AS ENUM ('GLOBAL', 'SKU_CATEGORY', 'SKU_OVERRIDE');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OutputStatus" AS ENUM ('QUEUED', 'GENERATED', 'APPROVED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "PromptTemplateCategory" AS ENUM ('IMAGE_PROMPT', 'BLUEPRINT_PROMPT', 'ALIGNMENT_PROMPT', 'MOLD_BREAKDOWN_PROMPT', 'DETAIL_SHEET_PROMPT', 'BUILD_PACKET_SECTION');

-- CreateEnum
CREATE TYPE "OutputType" AS ENUM ('IMAGE_PROMPT', 'BLUEPRINT_PROMPT', 'ALIGNMENT_PROMPT', 'MOLD_BREAKDOWN_PROMPT', 'DETAIL_SHEET_PROMPT', 'BUILD_PACKET', 'CALCULATION');

-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('GFRC', 'FACE_COAT', 'BACKING_MIX', 'PIGMENT', 'REINFORCEMENT', 'INSERT', 'SEALER', 'PACKAGING');

-- CreateEnum
CREATE TYPE "RuleCategory" AS ENUM ('DIMENSIONAL', 'ALIGNMENT', 'MOLD_SYSTEM', 'PROCESS', 'QC');

-- CreateEnum
CREATE TYPE "QcCategory" AS ENUM ('SETUP', 'PRE_DEMOLD', 'POST_DEMOLD', 'ALIGNMENT');

-- CreateTable
CREATE TABLE "skus" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SkuCategory" NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "type" TEXT NOT NULL,
    "finish" TEXT NOT NULL,
    "description" TEXT,
    "targetWeightMinLbs" DECIMAL(8,2),
    "targetWeightMaxLbs" DECIMAL(8,2),
    "retailPrice" DECIMAL(10,2),
    "wholesalePrice" DECIMAL(10,2),
    "dimensionsJson" JSONB,
    "datumSystemJson" JSONB,
    "calculatorDefaults" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" TEXT NOT NULL,
    "skuOverrideId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PromptTemplateCategory" NOT NULL,
    "categoryScope" "CategoryScope" NOT NULL DEFAULT 'GLOBAL',
    "skuCategory" "SkuCategory",
    "outputType" "OutputType" NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "systemPrompt" TEXT,
    "templateBody" TEXT NOT NULL,
    "variablesJson" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules_master" (
    "id" TEXT NOT NULL,
    "skuOverrideId" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "RuleCategory" NOT NULL,
    "categoryScope" "CategoryScope" NOT NULL DEFAULT 'GLOBAL',
    "skuCategory" "SkuCategory",
    "outputType" "OutputType",
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "ruleText" TEXT NOT NULL,
    "source" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rules_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials_master" (
    "id" TEXT NOT NULL,
    "skuOverrideId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "MaterialCategory" NOT NULL,
    "categoryScope" "CategoryScope" NOT NULL DEFAULT 'GLOBAL',
    "skuCategory" "SkuCategory",
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(10,2),
    "unitCost" DECIMAL(10,2),
    "specification" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qc_templates" (
    "id" TEXT NOT NULL,
    "skuOverrideId" TEXT,
    "templateKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "QcCategory" NOT NULL,
    "categoryScope" "CategoryScope" NOT NULL DEFAULT 'GLOBAL',
    "skuCategory" "SkuCategory",
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "checklistJson" JSONB NOT NULL,
    "acceptanceCriteriaJson" JSONB,
    "rejectionCriteriaJson" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qc_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_packet_templates" (
    "id" TEXT NOT NULL,
    "skuOverrideId" TEXT,
    "packetKey" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sectionOrder" INTEGER NOT NULL,
    "categoryScope" "CategoryScope" NOT NULL DEFAULT 'GLOBAL',
    "skuCategory" "SkuCategory",
    "outputType" "OutputType" NOT NULL DEFAULT 'BUILD_PACKET',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "build_packet_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_outputs" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "promptTemplateId" TEXT,
    "buildPacketTemplateId" TEXT,
    "title" TEXT NOT NULL,
    "outputType" "OutputType" NOT NULL,
    "status" "OutputStatus" NOT NULL DEFAULT 'QUEUED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "inputPayload" JSONB NOT NULL,
    "outputPayload" JSONB,
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skus_code_key" ON "skus"("code");

-- CreateIndex
CREATE UNIQUE INDEX "skus_slug_key" ON "skus"("slug");

-- CreateIndex
CREATE INDEX "prompt_templates_categoryScope_skuCategory_outputType_idx" ON "prompt_templates"("categoryScope", "skuCategory", "outputType");

-- CreateIndex
CREATE INDEX "prompt_templates_skuOverrideId_idx" ON "prompt_templates"("skuOverrideId");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_templates_key_version_categoryScope_skuCategory_skuO_key" ON "prompt_templates"("key", "version", "categoryScope", "skuCategory", "skuOverrideId");

-- CreateIndex
CREATE INDEX "rules_master_categoryScope_skuCategory_outputType_idx" ON "rules_master"("categoryScope", "skuCategory", "outputType");

-- CreateIndex
CREATE INDEX "rules_master_skuOverrideId_idx" ON "rules_master"("skuOverrideId");

-- CreateIndex
CREATE UNIQUE INDEX "rules_master_code_categoryScope_skuCategory_skuOverrideId_key" ON "rules_master"("code", "categoryScope", "skuCategory", "skuOverrideId");

-- CreateIndex
CREATE INDEX "materials_master_categoryScope_skuCategory_idx" ON "materials_master"("categoryScope", "skuCategory");

-- CreateIndex
CREATE INDEX "materials_master_skuOverrideId_idx" ON "materials_master"("skuOverrideId");

-- CreateIndex
CREATE UNIQUE INDEX "materials_master_code_categoryScope_skuCategory_skuOverride_key" ON "materials_master"("code", "categoryScope", "skuCategory", "skuOverrideId");

-- CreateIndex
CREATE INDEX "qc_templates_categoryScope_skuCategory_idx" ON "qc_templates"("categoryScope", "skuCategory");

-- CreateIndex
CREATE INDEX "qc_templates_skuOverrideId_idx" ON "qc_templates"("skuOverrideId");

-- CreateIndex
CREATE UNIQUE INDEX "qc_templates_templateKey_categoryScope_skuCategory_skuOverr_key" ON "qc_templates"("templateKey", "categoryScope", "skuCategory", "skuOverrideId");

-- CreateIndex
CREATE INDEX "build_packet_templates_categoryScope_skuCategory_outputType_idx" ON "build_packet_templates"("categoryScope", "skuCategory", "outputType");

-- CreateIndex
CREATE INDEX "build_packet_templates_skuOverrideId_idx" ON "build_packet_templates"("skuOverrideId");

-- CreateIndex
CREATE UNIQUE INDEX "build_packet_templates_packetKey_sectionKey_categoryScope_s_key" ON "build_packet_templates"("packetKey", "sectionKey", "categoryScope", "skuCategory", "skuOverrideId");

-- AddForeignKey
ALTER TABLE "prompt_templates" ADD CONSTRAINT "prompt_templates_skuOverrideId_fkey" FOREIGN KEY ("skuOverrideId") REFERENCES "skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules_master" ADD CONSTRAINT "rules_master_skuOverrideId_fkey" FOREIGN KEY ("skuOverrideId") REFERENCES "skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials_master" ADD CONSTRAINT "materials_master_skuOverrideId_fkey" FOREIGN KEY ("skuOverrideId") REFERENCES "skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qc_templates" ADD CONSTRAINT "qc_templates_skuOverrideId_fkey" FOREIGN KEY ("skuOverrideId") REFERENCES "skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_packet_templates" ADD CONSTRAINT "build_packet_templates_skuOverrideId_fkey" FOREIGN KEY ("skuOverrideId") REFERENCES "skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_outputs" ADD CONSTRAINT "generated_outputs_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_outputs" ADD CONSTRAINT "generated_outputs_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "prompt_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_outputs" ADD CONSTRAINT "generated_outputs_buildPacketTemplateId_fkey" FOREIGN KEY ("buildPacketTemplateId") REFERENCES "build_packet_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
