import { prisma } from "../db";

function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

function readRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export async function listGeneratedOutputs(filters?: {
  skuCode?: string;
  outputType?: string;
}) {
  const skuCode = filters?.skuCode;
  const outputType = filters?.outputType;

  const where: Record<string, unknown> = {};
  if (skuCode) {
    where["sku"] = { code: skuCode };
  }
  if (outputType) {
    where["outputType"] = outputType;
  }

  const [skus, outputs] = await Promise.all([
    prisma.sku.findMany({
      where: { status: "ACTIVE" },
      orderBy: { code: "asc" },
    }),
    prisma.generatedOutput.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        sku: true,
        promptTemplate: true,
        buildPacketTemplate: true,
        imageAssets: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return {
    selectedSkuCode: skuCode ?? "",
    selectedOutputType: outputType ?? "",
    skus: skus.map((sku) => ({
      code: sku.code,
      name: sku.name,
    })),
    outputs: outputs.map((output) => ({
      id: output.id,
      skuCode: output.sku.code,
      outputType: output.outputType,
      title: output.title,
      status: output.status,
      version: output.version,
      createdAt: output.createdAt.toISOString(),
      promptTemplateKey: output.promptTemplate?.key ?? null,
      packetSectionKey: output.buildPacketTemplate?.sectionKey ?? null,
      imageUrl: output.imageAssets[0]?.imageUrl ?? null,
    })),
  };
}

export async function getGeneratedOutputDetail(id: string) {
  const output = await prisma.generatedOutput.findUnique({
    where: { id },
    include: {
      sku: true,
      promptTemplate: true,
      buildPacketTemplate: true,
      buildPacketSections: {
        include: {
          buildPacketTemplate: true,
        },
        orderBy: {
          sectionOrder: "asc",
        },
      },
      imageAssets: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!output) {
    return null;
  }

  const outputPayload = readRecord(output.outputPayload);
  const inputPayload = readRecord(output.inputPayload);
  const maybeSections = readArray(outputPayload["sections"]);
  const maybeCards = readArray(outputPayload["cards"]);
  const maybeRulesApplied = readArray(
    outputPayload["rulesApplied"] ?? outputPayload["appliedRules"] ?? outputPayload["rules"],
  );
  const maybeQcTemplatesApplied = readArray(
    outputPayload["qcTemplatesApplied"] ?? outputPayload["qcTemplates"],
  );
  const maybeMetrics =
    outputPayload["metrics"] && typeof outputPayload["metrics"] === "object"
      ? (outputPayload["metrics"] as Record<string, unknown>)
      : null;
  const maybeText =
    typeof outputPayload["text"] === "string"
      ? outputPayload["text"]
      : typeof outputPayload["promptText"] === "string"
        ? outputPayload["promptText"]
      : typeof outputPayload["prompt"] === "string"
        ? outputPayload["prompt"]
        : "";

  return {
    id: output.id,
    title: output.title,
    outputType: output.outputType,
    status: output.status,
    version: output.version,
    createdAt: output.createdAt.toISOString(),
    updatedAt: output.updatedAt.toISOString(),
    generatedBy: output.generatedBy ?? "unknown",
    sku: {
      code: output.sku.code,
      name: output.sku.name,
    },
    promptTemplate: output.promptTemplate
      ? {
          id: output.promptTemplate.id,
          key: output.promptTemplate.key,
          name: output.promptTemplate.name,
        }
      : null,
    buildPacketTemplate: output.buildPacketTemplate
      ? {
          id: output.buildPacketTemplate.id,
          packetKey: output.buildPacketTemplate.packetKey,
          sectionKey: output.buildPacketTemplate.sectionKey,
          name: output.buildPacketTemplate.name,
        }
      : null,
    sourceReferences: {
      promptTemplate: output.promptTemplate
        ? {
            id: output.promptTemplate.id,
            key: output.promptTemplate.key,
            name: output.promptTemplate.name,
          }
        : null,
      primaryBuildPacketTemplate: output.buildPacketTemplate
        ? {
            id: output.buildPacketTemplate.id,
            packetKey: output.buildPacketTemplate.packetKey,
            sectionKey: output.buildPacketTemplate.sectionKey,
            name: output.buildPacketTemplate.name,
          }
        : null,
      buildPacketSections: output.buildPacketSections.map((section) => ({
        id: section.id,
        sectionKey: section.sectionKey,
        sectionName: section.sectionName,
        sectionOrder: section.sectionOrder,
        buildPacketTemplateId: section.buildPacketTemplateId,
        templateName: section.buildPacketTemplate?.name ?? null,
        packetKey: section.buildPacketTemplate?.packetKey ?? null,
      })),
    },
    text: maybeText,
    sections:
      output.buildPacketSections.length > 0
        ? output.buildPacketSections.map((section) => ({
            id: section.id,
            sectionKey: section.sectionKey,
            name: section.sectionName,
            sectionOrder: section.sectionOrder,
            content: section.content,
          }))
        : maybeSections,
    rulesApplied: maybeRulesApplied,
    qcTemplatesApplied: maybeQcTemplatesApplied,
    cards: maybeCards,
    metrics: maybeMetrics,
    imageAssets: output.imageAssets.map((asset) => ({
      id: asset.id,
      status: asset.status,
      promptTextUsed: asset.promptTextUsed,
      modelName: asset.modelName,
      imageUrl: asset.imageUrl,
      filePath: asset.filePath,
      width: asset.width,
      height: asset.height,
      metadataJson: stringifyJson(asset.metadataJson),
      metadata: readRecord(asset.metadataJson),
    })),
    inputPayloadJson: stringifyJson(output.inputPayload),
    outputPayloadJson: stringifyJson(output.outputPayload),
    inputPayload,
    outputPayload,
  };
}
