import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { Prisma } from "@prisma/client";

import {
  buildPromptOutput,
  resolvePromptTemplateForRequest,
  type PromptTemplateRecord,
} from "../engines/prompt-engine";
import { resolveRulesForSku, type RuleRecord } from "../engines/rules-engine";
import { prisma } from "../db";
import { generatorFormSchema, type GeneratorFormValues } from "../schemas/generator";
import { buildScopedWhere, mapSkuRecord } from "./service-helpers";

type ProviderImageResult = {
  modelName: string;
  imageUrl: string | null;
  filePath: string | null;
  width: number | null;
  height: number | null;
  metadataJson: Prisma.InputJsonValue;
};

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
}) {
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

function buildGeneratedTitle(skuCode: string, opts?: { scenePreset?: string; color?: string; sealer?: string }) {
  const parts = [skuCode, "IMAGE RENDER"];
  if (opts?.scenePreset) parts.push(`· ${opts.scenePreset.toUpperCase()}`);
  if (opts?.color && opts.color !== "SKU Default") parts.push(`· ${opts.color}`);
  if (opts?.sealer && opts.sealer !== "SKU Default") parts.push(`· ${opts.sealer}`);
  return parts.join(" ");
}

function parseDimensionsFromSize(size: string) {
  const match = size.match(/^(\d+)x(\d+)$/);

  if (!match) {
    return {
      width: null,
      height: null,
    };
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

function getProviderConfig() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for IMAGE_RENDER output generation.");
  }

  return {
    apiKey,
    baseUrl:
      process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta",
    model: process.env.GEMINI_IMAGE_MODEL ?? "gemini-3-pro-image-preview",
    aspectRatio: process.env.GEMINI_IMAGE_ASPECT_RATIO ?? "16:9",
    imageSize: process.env.GEMINI_IMAGE_SIZE ?? "2K",
  };
}

async function saveBase64Image({
  generatedOutputId,
  b64Json,
  suffix,
}: {
  generatedOutputId: string;
  b64Json: string;
  suffix?: string;
}) {
  const directory = path.join(process.cwd(), "public", "generated-images");
  const filename = `${generatedOutputId}${suffix ? `-${suffix}` : ""}.png`;
  const absolutePath = path.join(directory, filename);

  await mkdir(directory, { recursive: true });
  await writeFile(absolutePath, Buffer.from(b64Json, "base64"));

  return {
    imageUrl: `/generated-images/${filename}`,
    filePath: absolutePath,
  };
}

/**
 * Look up the most recent successful IMAGE_RENDER for a SKU.
 * Returns the absolute file path if it exists on disk, or null.
 */
export async function getSkuReferenceImagePath(skuId: string): Promise<string | null> {
  const asset = await prisma.generatedImageAsset.findFirst({
    where: {
      status: "GENERATED",
      filePath: { not: null },
      generatedOutput: {
        skuId,
        outputType: "IMAGE_RENDER",
        status: "GENERATED",
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!asset?.filePath) return null;

  try {
    await readFile(asset.filePath);
    return asset.filePath;
  } catch {
    return null;
  }
}

export async function generateImageWithGemini({
  generatedOutputId,
  promptText,
  suffix,
  imageSize,
  referenceImagePath,
}: {
  generatedOutputId: string;
  promptText: string;
  suffix?: string;
  imageSize?: string;
  referenceImagePath?: string | null;
}): Promise<ProviderImageResult> {
  const config = getProviderConfig();
  const effectiveImageSize = imageSize ?? config.imageSize;

  // Build parts array — reference image first (if available), then text
  const requestParts: Record<string, unknown>[] = [];

  if (referenceImagePath) {
    try {
      const imageBuffer = await readFile(referenceImagePath);
      const b64 = imageBuffer.toString("base64");
      requestParts.push({
        inlineData: {
          mimeType: "image/png",
          data: b64,
        },
      });
      // Prepend reference instruction to prompt
      requestParts.push({
        text: `REFERENCE IMAGE: The attached image is the approved hero render for this product. You MUST match the exact same product appearance, shape, color, finish, material texture, and proportions shown in the reference image. Do not deviate from the product design.\n\n${promptText}`,
      });
    } catch {
      // Reference image unreadable — fall back to text-only
      requestParts.push({ text: promptText });
    }
  } else {
    requestParts.push({ text: promptText });
  }

  const response = await fetch(
    `${config.baseUrl}/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: requestParts,
          },
        ],
        generationConfig: {
          imageConfig: {
            aspectRatio: config.aspectRatio,
            imageSize: effectiveImageSize,
          },
        },
      }),
    },
  );

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const message =
      payload && typeof payload["error"] === "object" && payload["error"] !== null
        ? String((payload["error"] as Record<string, unknown>)["message"] ?? "Image generation failed.")
        : "Image generation failed.";
    throw new Error(message);
  }

  const candidates = Array.isArray(payload["candidates"]) ? payload["candidates"] : [];
  const firstCandidate =
    candidates[0] && typeof candidates[0] === "object" && !Array.isArray(candidates[0])
      ? (candidates[0] as Record<string, unknown>)
      : null;
  const content =
    firstCandidate &&
    typeof firstCandidate["content"] === "object" &&
    firstCandidate["content"] !== null &&
    !Array.isArray(firstCandidate["content"])
      ? (firstCandidate["content"] as Record<string, unknown>)
      : null;
  const parts = Array.isArray(content?.["parts"]) ? content["parts"] : [];
  const inlinePart = parts.find((part) => {
    if (!part || typeof part !== "object" || Array.isArray(part)) {
      return false;
    }

    const record = part as Record<string, unknown>;
    return (
      typeof record["inlineData"] === "object" &&
      record["inlineData"] !== null &&
      !Array.isArray(record["inlineData"])
    );
  });

  if (!inlinePart || typeof inlinePart !== "object" || Array.isArray(inlinePart)) {
    throw new Error("Gemini returned no image data.");
  }

  const inlineData = (inlinePart as Record<string, unknown>)["inlineData"] as Record<string, unknown>;

  let imageUrl: string | null = null;
  let filePath: string | null = null;

  if (typeof inlineData["data"] === "string") {
    const persisted = await saveBase64Image({
      generatedOutputId,
      b64Json: inlineData["data"],
      suffix,
    });
    imageUrl = persisted.imageUrl;
    filePath = persisted.filePath;
  } else {
    throw new Error("Gemini returned an image candidate without inline data.");
  }

  const { width, height } = parseDimensionsFromSize(
    effectiveImageSize === "1K"
      ? "1024x1024"
      : effectiveImageSize === "2K"
        ? "2048x1152"
        : effectiveImageSize === "4K"
          ? "4096x2304"
          : "1536x1024",
  );

  return {
    modelName: config.model,
    imageUrl,
    filePath,
    width,
    height,
    metadataJson: payload as Prisma.InputJsonValue,
  };
}

export async function generateImageRenderOutput(values: GeneratorFormValues) {
  const parsed = generatorFormSchema.parse(values);
  const providerModel = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3-pro-image-preview";
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

  const [ruleRows, promptRows] = await Promise.all([
    prisma.rulesMaster.findMany({
      where: {
        status: "ACTIVE",
        AND: [
          scopeWhere,
          {
            OR: [
              { outputType: null },
              { outputType: "IMAGE_PROMPT" },
              { outputType: "IMAGE_RENDER" },
            ],
          },
        ],
      },
      orderBy: [{ priority: "asc" }, { title: "asc" }],
    }),
    prisma.promptTemplate.findMany({
      where: {
        status: "ACTIVE",
        AND: [scopeWhere, { outputType: "IMAGE_RENDER" }],
      },
      orderBy: [{ version: "desc" }, { name: "asc" }],
    }),
  ]);

  const rules = resolveRulesForSku({
    sku: mappedSku,
    rules: ruleRows.map(mapRuleRecord),
  });
  const promptTemplate = resolvePromptTemplateForRequest({
    sku: mappedSku,
    promptTemplates: promptRows.map(mapPromptTemplateRecord),
    values: parsed,
  });

  if (!promptTemplate) {
    throw new Error("No active IMAGE_RENDER template was found for this SKU and scene preset.");
  }

  const prompt = buildPromptOutput({
    sku: mappedSku,
    template: promptTemplate,
    values: parsed,
    rules,
  });

  const createdOutput = await prisma.generatedOutput.create({
    data: {
      skuId: sku.id,
      promptTemplateId: promptTemplate.id,
      title: buildGeneratedTitle(sku.code, {
        scenePreset: parsed.scenePreset,
        color: parsed.colorOverride,
        sealer: parsed.sealerOverride,
      }),
      outputType: "IMAGE_RENDER",
      status: "QUEUED",
      inputPayload: parsed as Prisma.InputJsonValue,
      outputPayload: {
        promptText: prompt.promptText,
        text: prompt.text,
        rulesApplied: rules.map((rule) => ({
          code: rule.code,
          title: rule.title,
          priority: rule.priority,
          ruleText: rule.ruleText,
        })),
        promptTemplateKey: promptTemplate.key,
        scenePreset: parsed.scenePreset,
        imageStatus: "QUEUED",
      } as Prisma.InputJsonValue,
      generatedBy: "gemini-image-generation-service",
    },
  });

  try {
    const providerResult = await generateImageWithGemini({
      generatedOutputId: createdOutput.id,
      promptText: prompt.promptText,
    });

    const asset = await prisma.generatedImageAsset.create({
      data: {
        generatedOutputId: createdOutput.id,
        promptTextUsed: prompt.promptText,
        modelName: providerResult.modelName,
        imageUrl: providerResult.imageUrl,
        filePath: providerResult.filePath,
        status: "GENERATED",
        width: providerResult.width,
        height: providerResult.height,
        metadataJson: providerResult.metadataJson,
      },
    });

    const updatedOutput = await prisma.generatedOutput.update({
      where: {
        id: createdOutput.id,
      },
      data: {
        status: "GENERATED",
        outputPayload: {
          promptText: prompt.promptText,
          text: prompt.text,
          rulesApplied: rules.map((rule) => ({
            code: rule.code,
            title: rule.title,
            priority: rule.priority,
            ruleText: rule.ruleText,
          })),
          promptTemplateKey: promptTemplate.key,
          scenePreset: parsed.scenePreset,
          imageStatus: "GENERATED",
          imageAssetId: asset.id,
          imageUrl: asset.imageUrl,
          filePath: asset.filePath,
          width: asset.width,
          height: asset.height,
          modelName: asset.modelName,
        } as Prisma.InputJsonValue,
      },
      include: {
        imageAssets: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    return {
      id: updatedOutput.id,
      title: updatedOutput.title,
      outputType: updatedOutput.outputType,
      status: updatedOutput.status,
      skuCode: sku.code,
      createdAt: updatedOutput.createdAt.toISOString(),
      promptTemplateKey: promptTemplate.key,
      buildPacketSectionKey: null,
      text: prompt.text,
      imageUrl: updatedOutput.imageAssets[0]?.imageUrl ?? null,
      promptText: prompt.promptText,
    };
  } catch (error) {
    await prisma.generatedImageAsset.create({
      data: {
        generatedOutputId: createdOutput.id,
        promptTextUsed: prompt.promptText,
        modelName: providerModel,
        status: "FAILED",
        metadataJson: {
          error: error instanceof Error ? error.message : "Unknown image generation failure.",
        } satisfies Prisma.InputJsonValue,
      },
    });

    await prisma.generatedOutput.update({
      where: {
        id: createdOutput.id,
      },
      data: {
        status: "FAILED",
        outputPayload: {
          promptText: prompt.promptText,
          text: prompt.text,
          rulesApplied: rules.map((rule) => ({
            code: rule.code,
            title: rule.title,
            priority: rule.priority,
            ruleText: rule.ruleText,
          })),
          promptTemplateKey: promptTemplate.key,
          scenePreset: parsed.scenePreset,
          imageStatus: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Unknown image generation failure.",
        } as Prisma.InputJsonValue,
      },
    });

    throw error;
  }
}
