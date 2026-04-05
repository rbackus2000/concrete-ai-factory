import { Prisma } from "@prisma/client";

import { prisma } from "../db";
import {
  buildCalculationText,
  buildCalculatorDefaultsForSku,
  runCalculatorEngine,
  type MaterialRecord,
} from "../engines/calculator-engine";
import {
  buildPacketForSku,
  type BuildPacketTemplateRecord,
} from "../engines/packet-builder";
import {
  buildPromptOutput,
  resolvePromptTemplateForRequest,
  type PromptTemplateRecord,
} from "../engines/prompt-engine";
import { resolveRulesForSku, type RuleRecord } from "../engines/rules-engine";
import {
  buildValidationSummary,
  type QcTemplateRecord,
} from "../engines/validation-engine";
import { buildTechnicalDrawingPrompts } from "../engines/drawing-prompt-engine";
import { generateImageRenderOutput, generateImageWithGemini, getSkuReferenceImagePath } from "./image-generation-service";
import { outputTypeValues } from "../schemas/domain";
import { generatorFormSchema, type GeneratorFormValues } from "../schemas/generator";
import {
  buildScopedWhere,
  decimalToNumber,
  mapSkuRecord,
  parseStringArray,
} from "./service-helpers";

function mapPromptTemplateRecord(template: {
  id: string;
  key: string;
  name: string;
  category: PromptTemplateRecord["category"];
  categoryScope: PromptTemplateRecord["categoryScope"];
  skuCategory: PromptTemplateRecord["skuCategory"];
  skuOverrideId: string | null;
  outputType: PromptTemplateRecord["outputType"];
  templateBody: string;
  version: number;
}): PromptTemplateRecord & { id: string; version: number } {
  return {
    id: template.id,
    key: template.key,
    name: template.name,
    category: template.category,
    categoryScope: template.categoryScope,
    skuCategory: template.skuCategory,
    skuOverrideId: template.skuOverrideId,
    outputType: template.outputType,
    templateBody: template.templateBody,
    version: template.version,
  };
}

function mapRuleRecord(rule: {
  code: string;
  title: string;
  category: RuleRecord["category"];
  categoryScope: RuleRecord["categoryScope"];
  skuCategory: RuleRecord["skuCategory"];
  skuOverrideId: string | null;
  outputType: RuleRecord["outputType"];
  status: string;
  priority: number;
  description: string | null;
  ruleText: string;
  source: string | null;
}): RuleRecord {
  return {
    code: rule.code,
    title: rule.title,
    category: rule.category,
    categoryScope: rule.categoryScope,
    skuCategory: rule.skuCategory,
    skuOverrideId: rule.skuOverrideId,
    outputType: rule.outputType,
    status: rule.status,
    priority: rule.priority,
    description: rule.description ?? "",
    ruleText: rule.ruleText,
    source: rule.source ?? "",
  };
}

function mapBuildPacketTemplateRecord(template: {
  id: string;
  packetKey: string;
  sectionKey: string;
  name: string;
  sectionOrder: number;
  categoryScope: BuildPacketTemplateRecord["categoryScope"];
  skuCategory: BuildPacketTemplateRecord["skuCategory"];
  skuOverrideId: string | null;
  outputType: BuildPacketTemplateRecord["outputType"];
  status: string;
  content: string;
}): BuildPacketTemplateRecord & { id: string } {
  return {
    id: template.id,
    packetKey: template.packetKey,
    sectionKey: template.sectionKey,
    name: template.name,
    sectionOrder: template.sectionOrder,
    categoryScope: template.categoryScope,
    skuCategory: template.skuCategory,
    skuOverrideId: template.skuOverrideId,
    outputType: template.outputType,
    status: template.status,
    content: template.content,
  };
}

function mapQcTemplateRecord(template: {
  templateKey: string;
  name: string;
  category: QcTemplateRecord["category"];
  categoryScope: QcTemplateRecord["categoryScope"];
  skuCategory: QcTemplateRecord["skuCategory"];
  skuOverrideId: string | null;
  status: string;
  checklistJson: Prisma.JsonValue;
  acceptanceCriteriaJson: Prisma.JsonValue | null;
  rejectionCriteriaJson: Prisma.JsonValue | null;
}): QcTemplateRecord {
  return {
    templateKey: template.templateKey,
    name: template.name,
    category: template.category,
    categoryScope: template.categoryScope,
    skuCategory: template.skuCategory,
    skuOverrideId: template.skuOverrideId,
    status: template.status,
    checklist: parseStringArray(template.checklistJson),
    acceptanceCriteria: parseStringArray(template.acceptanceCriteriaJson),
    rejectionCriteria: parseStringArray(template.rejectionCriteriaJson),
  };
}

function mapMaterialRecord(material: {
  code: string;
  name: string;
  category: MaterialRecord["category"];
  categoryScope: MaterialRecord["categoryScope"];
  skuCategory: MaterialRecord["skuCategory"];
  skuOverrideId: string | null;
  status: string;
  unit: string;
  quantity: Prisma.Decimal | null;
  unitCost: Prisma.Decimal | null;
  notes: string | null;
}): MaterialRecord {
  return {
    code: material.code,
    name: material.name,
    category: material.category,
    categoryScope: material.categoryScope,
    skuCategory: material.skuCategory,
    skuOverrideId: material.skuOverrideId,
    status: material.status,
    unit: material.unit,
    quantity: decimalToNumber(material.quantity) ?? 0,
    unitCost: decimalToNumber(material.unitCost) ?? 0,
    notes: material.notes ?? "",
  };
}

function readGeneratedText(outputPayload: Prisma.JsonValue | null) {
  if (!outputPayload || typeof outputPayload !== "object" || Array.isArray(outputPayload)) {
    return "";
  }

  if (typeof outputPayload["text"] === "string") {
    return outputPayload["text"];
  }

  if (typeof outputPayload["prompt"] === "string") {
    return outputPayload["prompt"];
  }

  return "";
}

function buildGeneratedTitle(skuCode: string, outputType: GeneratorFormValues["outputType"], opts?: { color?: string; sealer?: string; scenePreset?: string }) {
  const parts = [skuCode, outputType.replaceAll("_", " ")];
  if (opts?.scenePreset) parts.push(`· ${opts.scenePreset.toUpperCase()}`);
  if (opts?.color && opts.color !== "SKU Default") parts.push(`· ${opts.color}`);
  if (opts?.sealer && opts.sealer !== "SKU Default") parts.push(`· ${opts.sealer}`);
  return parts.join(" ");
}

export async function getGeneratorConfig() {
  const [skus, promptTemplates, recentOutputs, referenceImageRows] = await Promise.all([
    prisma.sku.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        code: "asc",
      },
    }),
    prisma.promptTemplate.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: [{ outputType: "asc" }, { version: "desc" }, { name: "asc" }],
    }),
    prisma.generatedOutput.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        sku: true,
        promptTemplate: true,
        buildPacketTemplate: true,
        imageAssets: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    }),
    // Get latest IMAGE_RENDER per SKU for reference image indicators
    prisma.generatedImageAsset.findMany({
      where: {
        status: "GENERATED",
        imageUrl: { not: null },
        generatedOutput: {
          outputType: "IMAGE_RENDER",
          status: "GENERATED",
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        generatedOutput: {
          select: { sku: { select: { code: true } } },
        },
      },
    }),
  ]);

  // Deduplicate to latest per SKU code
  const referenceImages: Record<string, string> = {};
  for (const row of referenceImageRows) {
    const code = row.generatedOutput.sku?.code;
    if (code && row.imageUrl && !referenceImages[code]) {
      referenceImages[code] = row.imageUrl;
    }
  }

  return {
    skus: skus.map((sku) => ({
      id: sku.id,
      ...mapSkuRecord(sku),
    })),
    promptTemplates: promptTemplates.map(mapPromptTemplateRecord),
    outputTypes: outputTypeValues,
    recentOutputs: recentOutputs.map((output) => ({
      id: output.id,
      skuCode: output.sku.code,
      title: output.title,
      outputType: output.outputType,
      status: output.status,
      createdAt: output.createdAt.toISOString(),
      promptTemplateKey: output.promptTemplate?.key ?? null,
      buildPacketSectionKey: output.buildPacketTemplate?.sectionKey ?? null,
      text: readGeneratedText(output.outputPayload),
      imageUrl: output.imageAssets[0]?.imageUrl ?? null,
      promptText:
        typeof output.outputPayload === "object" &&
        output.outputPayload !== null &&
        !Array.isArray(output.outputPayload) &&
        typeof output.outputPayload["promptText"] === "string"
          ? output.outputPayload["promptText"]
          : readGeneratedText(output.outputPayload),
    })),
    referenceImages,
  };
}

export async function generateOutput(values: GeneratorFormValues) {
  const parsed = generatorFormSchema.parse(values);

  if (parsed.outputType === "IMAGE_RENDER") {
    return generateImageRenderOutput(parsed);
  }

  const sku = await prisma.sku.findUnique({
    where: {
      code: parsed.skuCode,
    },
  });

  if (!sku) {
    throw new Error(`SKU ${parsed.skuCode} was not found.`);
  }

  const mappedSku = {
    id: sku.id,
    ...mapSkuRecord(sku),
  };
  const scopeWhere = buildScopedWhere(sku);
  const ruleRows = await prisma.rulesMaster.findMany({
    where: {
      status: "ACTIVE",
      AND: [
        scopeWhere,
        {
          OR: [{ outputType: null }, { outputType: parsed.outputType }],
        },
      ],
    },
    orderBy: [{ priority: "asc" }, { title: "asc" }],
  });
  const rules = resolveRulesForSku({
    sku: mappedSku,
    rules: ruleRows.map(mapRuleRecord),
  });

  let promptTemplateId: string | null = null;
  let buildPacketTemplateId: string | null = null;
  let buildPacketSectionsToCreate: Prisma.GeneratedOutputBuildPacketSectionCreateWithoutGeneratedOutputInput[] = [];
  let outputPayload: Record<string, unknown>;
  let text = "";
  let imagePromptText: string | null = null;

  if (parsed.outputType === "BUILD_PACKET") {
    const [packetRows, qcRows] = await Promise.all([
      prisma.buildPacketTemplate.findMany({
        where: {
          status: "ACTIVE",
          AND: [scopeWhere, { outputType: "BUILD_PACKET" }],
        },
        orderBy: [{ sectionOrder: "asc" }, { name: "asc" }],
      }),
      prisma.qcTemplate.findMany({
        where: {
          status: "ACTIVE",
          ...scopeWhere,
        },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
    ]);
    const packetTemplates = packetRows.map(mapBuildPacketTemplateRecord);
    const packet = buildPacketForSku({
      sku: mappedSku,
      templates: packetTemplates,
      rules,
      qcTemplates: qcRows.map(mapQcTemplateRecord),
    });
    const templateIdBySectionKey = new Map(
      packetTemplates.map((template) => [template.sectionKey, template.id]),
    );

    buildPacketTemplateId = packetTemplates[0]?.id ?? null;
    buildPacketSectionsToCreate = packet.sections.map((section) => ({
      buildPacketTemplateId: templateIdBySectionKey.get(section.sectionKey) ?? null,
      sectionKey: section.sectionKey,
      sectionName: section.name,
      sectionOrder: section.sectionOrder,
      content: section.content,
    }));
    text = packet.compiled;
    outputPayload = {
      text,
      sections: packet.sections,
      rulesApplied: rules,
      qcTemplatesApplied: packet.qcTemplates,
    };
  } else if (parsed.outputType === "CALCULATION") {
    const materialRows = await prisma.materialsMaster.findMany({
      where: {
        status: "ACTIVE",
        ...scopeWhere,
      },
      orderBy: {
        code: "asc",
      },
    });
    const materials = materialRows.map(mapMaterialRecord);
    const calculation = runCalculatorEngine({
      sku: mappedSku,
      materials,
      defaults: mappedSku.calculatorDefaults,
      overrides: buildCalculatorDefaultsForSku({
        sku: mappedSku,
        materials,
        defaults: mappedSku.calculatorDefaults,
      }),
    });

    text = buildCalculationText({
      sku: mappedSku,
      result: calculation,
    });
    outputPayload = {
      text,
      metrics: calculation.metrics,
      cards: calculation.cards,
    };
  } else {
    const promptRows = await prisma.promptTemplate.findMany({
      where: {
        status: "ACTIVE",
        AND: [scopeWhere, { outputType: parsed.outputType }],
      },
      orderBy: [{ version: "desc" }, { name: "asc" }],
    });
    const promptTemplates = promptRows.map(mapPromptTemplateRecord);
    const template = resolvePromptTemplateForRequest({
      sku: mappedSku,
      promptTemplates,
      values: parsed,
    });

    if (!template) {
      throw new Error(`No active prompt template found for ${parsed.outputType}.`);
    }

    const prompt = buildPromptOutput({
      sku: mappedSku,
      template,
      values: parsed,
      rules,
    });

    promptTemplateId = template.id;
    text = prompt.text;
    imagePromptText = prompt.promptText;
    outputPayload = {
      text,
      promptText: prompt.promptText,
      rulesApplied: rules.map((rule) => ({
        code: rule.code,
        title: rule.title,
        priority: rule.priority,
        ruleText: rule.ruleText,
      })),
      templateKey: template.key,
    };
  }

  const created = await prisma.generatedOutput.create({
    data: {
      skuId: sku.id,
      promptTemplateId,
      buildPacketTemplateId,
      title: buildGeneratedTitle(sku.code, parsed.outputType, {
        color: parsed.colorOverride,
        sealer: parsed.sealerOverride,
        scenePreset: parsed.scenePreset,
      }),
      outputType: parsed.outputType,
      status: "GENERATED",
      inputPayload: parsed as Prisma.InputJsonValue,
      outputPayload: outputPayload as Prisma.InputJsonValue,
      generatedBy: "generator-form",
      buildPacketSections:
        buildPacketSectionsToCreate.length > 0
          ? {
              create: buildPacketSectionsToCreate,
            }
          : undefined,
    },
    include: {
      promptTemplate: true,
      buildPacketTemplate: true,
      buildPacketSections: true,
      sku: true,
    },
  });

  // Look up reference image for this SKU (from a previous IMAGE_RENDER)
  const referenceImagePath = await getSkuReferenceImagePath(sku.id);

  // Generate technical drawings for BUILD_PACKET outputs
  if (parsed.outputType === "BUILD_PACKET") {
    const drawingPrompts = buildTechnicalDrawingPrompts(mappedSku);

    const drawingResults = await Promise.allSettled(
      drawingPrompts.map(async (drawing) => {
        const result = await generateImageWithGemini({
          generatedOutputId: created.id,
          promptText: drawing.promptText,
          suffix: drawing.drawingType,
          imageSize: "1K",
          referenceImagePath,
        });

        await prisma.generatedImageAsset.create({
          data: {
            generatedOutputId: created.id,
            promptTextUsed: drawing.promptText,
            modelName: result.modelName,
            imageUrl: result.imageUrl,
            filePath: result.filePath,
            status: "GENERATED",
            width: result.width,
            height: result.height,
            metadataJson: {
              drawingType: drawing.drawingType,
              sectionKey: drawing.sectionKey,
            } satisfies Prisma.InputJsonValue,
          },
        });

        return {
          drawingType: drawing.drawingType,
          sectionKey: drawing.sectionKey,
          imageUrl: result.imageUrl,
          filePath: result.filePath,
          status: "GENERATED" as const,
        };
      }),
    );

    const technicalDrawings = drawingResults.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }

      return {
        drawingType: drawingPrompts[index]!.drawingType,
        sectionKey: drawingPrompts[index]!.sectionKey,
        imageUrl: null,
        filePath: null,
        status: "FAILED" as const,
      };
    });

    await prisma.generatedOutput.update({
      where: { id: created.id },
      data: {
        outputPayload: {
          ...outputPayload,
          technicalDrawings,
        } as Prisma.InputJsonValue,
      },
    });
  }

  // Generate image for prompt output types (DETAIL_SHEET, BLUEPRINT, etc.)
  let generatedImageUrl: string | null = null;
  console.log("[prompt-image-gen] Check:", { imagePromptText: !!imagePromptText, outputType: parsed.outputType, endsWithPrompt: parsed.outputType.endsWith("_PROMPT") });
  if (imagePromptText && parsed.outputType.endsWith("_PROMPT")) {
    console.log("[prompt-image-gen] Calling Gemini for", parsed.outputType);
    try {
      const imageResult = await generateImageWithGemini({
        generatedOutputId: created.id,
        promptText: imagePromptText,
        imageSize: "2K",
        referenceImagePath,
      });

      const asset = await prisma.generatedImageAsset.create({
        data: {
          generatedOutputId: created.id,
          promptTextUsed: imagePromptText,
          modelName: imageResult.modelName,
          imageUrl: imageResult.imageUrl,
          filePath: imageResult.filePath,
          status: "GENERATED",
          width: imageResult.width,
          height: imageResult.height,
          metadataJson: imageResult.metadataJson,
        },
      });

      generatedImageUrl = asset.imageUrl;

      await prisma.generatedOutput.update({
        where: { id: created.id },
        data: {
          outputPayload: {
            ...outputPayload,
            imageStatus: "GENERATED",
            imageUrl: asset.imageUrl,
            filePath: asset.filePath,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      console.error("[prompt-image-gen] Failed:", error instanceof Error ? error.message : error);
    }
  }

  return {
    id: created.id,
    title: created.title,
    outputType: created.outputType,
    status: created.status,
    skuCode: created.sku.code,
    createdAt: created.createdAt.toISOString(),
    promptTemplateKey: created.promptTemplate?.key ?? null,
    buildPacketSectionKey: created.buildPacketTemplate?.sectionKey ?? null,
    text,
    promptText: imagePromptText ?? text,
    imageUrl: generatedImageUrl,
  };
}
