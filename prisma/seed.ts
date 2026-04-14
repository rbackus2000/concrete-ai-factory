import { Prisma, PrismaClient } from "@prisma/client";

import { starterSeedBundle } from "../lib/data/starter-data";

const prisma = new PrismaClient();

async function main() {
  // Only delete seed-created outputs — NEVER delete user-generated outputs or image assets
  await prisma.generatedImageAsset.deleteMany({
    where: { generatedOutput: { generatedBy: "seed-script" } },
  });
  await prisma.generatedOutput.deleteMany({
    where: { generatedBy: "seed-script" },
  });
  // Safe to delete-and-recreate: no FK references from generated outputs
  await prisma.buildPacketTemplate.deleteMany();
  await prisma.qcTemplate.deleteMany();
  await prisma.rulesMaster.deleteMany();
  await prisma.materialsMaster.deleteMany();

  // Upsert SKUs by code — preserves IDs so GeneratedOutput FK references survive
  const skuData = starterSeedBundle.skus.map((sku) => ({
    code: sku.code,
    slug: sku.slug,
    name: sku.name,
    category: sku.category,
    status: sku.status,
    type: sku.type,
    finish: sku.finish,
    description: sku.summary,
    targetWeightMinLbs: sku.targetWeight.min,
    targetWeightMaxLbs: sku.targetWeight.max,
    outerLength: sku.outerLength,
    outerWidth: sku.outerWidth,
    outerHeight: sku.outerHeight,
    innerLength: sku.innerLength,
    innerWidth: sku.innerWidth,
    innerDepth: sku.innerDepth,
    wallThickness: sku.wallThickness,
    bottomThickness: sku.bottomThickness,
    topLipThickness: sku.topLipThickness,
    hollowCoreDepth: sku.hollowCoreDepth,
    domeRiseMin: sku.domeRiseMin,
    domeRiseMax: sku.domeRiseMax,
    longRibCount: sku.longRibCount,
    crossRibCount: sku.crossRibCount,
    ribWidth: sku.ribWidth,
    ribHeight: sku.ribHeight,
    drainDiameter: sku.drainDiameter,
    drainType: sku.drainType || null,
    basinSlopeDeg: sku.basinSlopeDeg || null,
    slopeDirection: sku.slopeDirection || null,
    mountType: sku.mountType || null,
    hasOverflow: sku.hasOverflow ?? false,
    overflowHoleDiameter: sku.overflowHoleDiameter || null,
    overflowPosition: sku.overflowPosition || null,
    bracketSpecJson: sku.bracketSpec ?? Prisma.JsonNull,
    reinforcementDiameter: sku.reinforcementDiameter,
    reinforcementThickness: sku.reinforcementThickness,
    draftAngle: sku.draftAngle,
    cornerRadius: sku.cornerRadius,
    fiberPercent: sku.fiberPercent,
    datumSystemJson: sku.datumSystem,
    calculatorDefaults: sku.calculatorDefaults,
  }));

  const skuRecords = await Promise.all(
    starterSeedBundle.skus.map((sku, i) =>
      prisma.sku.upsert({
        where: { code: sku.code },
        update: skuData[i]!,
        create: skuData[i]!,
      }),
    ),
  );

  const skuIdByCode = new Map(skuRecords.map((sku) => [sku.code, sku.id]));
  const primarySku = skuRecords[0];

  if (!primarySku) {
    throw new Error("Seed bundle must include at least one SKU.");
  }

  // Delete + recreate prompt templates — safe because GeneratedOutput FK uses onDelete: SetNull
  await prisma.promptTemplate.deleteMany();

  const promptTemplates = await Promise.all(
    starterSeedBundle.promptTemplates.map((template) =>
      prisma.promptTemplate.create({
        data: {
          key: template.key,
          name: template.name,
          category: template.category,
          categoryScope: template.categoryScope,
          skuCategory: template.skuCategory,
          skuOverrideId: template.skuOverrideCode
            ? skuIdByCode.get(template.skuOverrideCode)
            : null,
          outputType: template.outputType,
          status: template.status,
          version: template.version,
          systemPrompt: template.systemPrompt,
          templateBody: template.templateBody,
          variablesJson: template.variables,
        },
      }),
    ),
  );

  await Promise.all(
    starterSeedBundle.materials.map((material) =>
      prisma.materialsMaster.create({
        data: {
          code: material.code,
          name: material.name,
          category: material.category,
          categoryScope: material.categoryScope,
          skuCategory: material.skuCategory,
          skuOverrideId: material.skuOverrideCode
            ? skuIdByCode.get(material.skuOverrideCode)
            : null,
          status: material.status,
          unit: material.unit,
          quantity: material.quantity,
          unitCost: material.unitCost,
          notes: material.notes,
        },
      }),
    ),
  );

  await Promise.all(
    starterSeedBundle.rules.map((rule) =>
      prisma.rulesMaster.create({
        data: {
          code: rule.code,
          title: rule.title,
          category: rule.category,
          categoryScope: rule.categoryScope,
          skuCategory: rule.skuCategory,
          skuOverrideId: rule.skuOverrideCode
            ? skuIdByCode.get(rule.skuOverrideCode)
            : null,
          outputType: rule.outputType,
          status: rule.status,
          priority: rule.priority,
          description: rule.description,
          ruleText: rule.ruleText,
          source: rule.source,
        },
      }),
    ),
  );

  await Promise.all(
    starterSeedBundle.qcTemplates.map((template) =>
      prisma.qcTemplate.create({
        data: {
          templateKey: template.templateKey,
          name: template.name,
          category: template.category,
          categoryScope: template.categoryScope,
          skuCategory: template.skuCategory,
          skuOverrideId: template.skuOverrideCode
            ? skuIdByCode.get(template.skuOverrideCode)
            : null,
          status: template.status,
          checklistJson: template.checklist,
          acceptanceCriteriaJson: template.acceptanceCriteria,
          rejectionCriteriaJson: template.rejectionCriteria,
        },
      }),
    ),
  );

  const packetTemplates = await Promise.all(
    starterSeedBundle.buildPacketTemplates.map((section) =>
      prisma.buildPacketTemplate.create({
        data: {
          packetKey: section.packetKey,
          sectionKey: section.sectionKey,
          name: section.name,
          sectionOrder: section.sectionOrder,
          categoryScope: section.categoryScope,
          skuCategory: section.skuCategory,
          skuOverrideId: section.skuOverrideCode
            ? skuIdByCode.get(section.skuOverrideCode)
            : null,
          outputType: section.outputType,
          status: section.status,
          content: section.content,
        },
      }),
    ),
  );

  await prisma.generatedOutput.create({
    data: {
      skuId: primarySku.id,
      promptTemplateId: promptTemplates[0]?.id,
      buildPacketTemplateId: packetTemplates[0]?.id,
      title: starterSeedBundle.generatedOutput.title,
      outputType: starterSeedBundle.generatedOutput.outputType,
      status: starterSeedBundle.generatedOutput.status,
      inputPayload: starterSeedBundle.generatedOutput.inputPayload as Prisma.InputJsonValue,
      outputPayload: starterSeedBundle.generatedOutput.outputPayload as Prisma.InputJsonValue,
      generatedBy: "seed-script",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
