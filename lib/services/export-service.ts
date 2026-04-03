import { getGeneratedOutputDetail } from "./generated-output-service";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compactDate(value: string) {
  return new Date(value).toISOString();
}

function stringifyMetricValue(value: unknown) {
  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function renderSourceReferencesMarkdown(detail: NonNullable<Awaited<ReturnType<typeof getGeneratedOutputDetail>>>) {
  const lines = ["## Source References"];

  lines.push(`- GeneratedOutput ID: \`${detail.id}\``);
  lines.push(`- SKU: \`${detail.sku.code}\` (${detail.sku.name})`);
  lines.push(`- Output Type: \`${detail.outputType}\``);
  lines.push(`- Status: \`${detail.status}\``);
  lines.push(`- Version: \`${detail.version}\``);
  lines.push(`- Created At: \`${compactDate(detail.createdAt)}\``);

  if (detail.sourceReferences.promptTemplate) {
    lines.push(
      `- Prompt Template: \`${detail.sourceReferences.promptTemplate.key}\` (${detail.sourceReferences.promptTemplate.name})`,
    );
  }

  if (detail.sourceReferences.primaryBuildPacketTemplate) {
    lines.push(
      `- Primary Build Packet Template: \`${detail.sourceReferences.primaryBuildPacketTemplate.packetKey}/${detail.sourceReferences.primaryBuildPacketTemplate.sectionKey}\` (${detail.sourceReferences.primaryBuildPacketTemplate.name})`,
    );
  }

  if (detail.sourceReferences.buildPacketSections.length > 0) {
    lines.push("- Build Packet Section Sources:");
    detail.sourceReferences.buildPacketSections.forEach((section) => {
      lines.push(
        `  - ${section.sectionOrder}. \`${section.sectionKey}\`${section.templateName ? ` (${section.templateName})` : ""}`,
      );
    });
  }

  return lines.join("\n");
}

function renderRulesMarkdown(detail: NonNullable<Awaited<ReturnType<typeof getGeneratedOutputDetail>>>) {
  if (!Array.isArray(detail.rulesApplied) || detail.rulesApplied.length === 0) {
    return "";
  }

  const lines = ["## Rules Applied"];

  detail.rulesApplied.forEach((rule) => {
    const record = rule as Record<string, unknown>;
    lines.push(
      `- [P${String(record["priority"] ?? "?")}] ${String(record["title"] ?? record["code"] ?? "Rule")}: ${String(record["ruleText"] ?? record["text"] ?? "")}`,
    );
  });

  return lines.join("\n");
}

function renderQcMarkdown(detail: NonNullable<Awaited<ReturnType<typeof getGeneratedOutputDetail>>>) {
  if (!Array.isArray(detail.qcTemplatesApplied) || detail.qcTemplatesApplied.length === 0) {
    return "";
  }

  const sections = ["## QC Templates Applied"];

  detail.qcTemplatesApplied.forEach((template) => {
    const record = template as Record<string, unknown>;
    sections.push(`### ${String(record["name"] ?? "QC Template")}`);
    sections.push(`Category: \`${String(record["category"] ?? "")}\``);

    if (Array.isArray(record["checklist"])) {
      sections.push("Checklist:");
      (record["checklist"] as unknown[]).forEach((item) => {
        sections.push(`- ${String(item)}`);
      });
    }
  });

  return sections.join("\n");
}

function renderCalculationMarkdown(detail: NonNullable<Awaited<ReturnType<typeof getGeneratedOutputDetail>>>) {
  const sections = ["## Calculation Output"];

  if (detail.text) {
    sections.push("", "```text", detail.text, "```");
  }

  if (detail.metrics) {
    sections.push("", "## Calculation Metrics");
    Object.entries(detail.metrics).forEach(([key, value]) => {
      sections.push(`- ${key}: ${stringifyMetricValue(value)}`);
    });
  }

  if (Array.isArray(detail.cards) && detail.cards.length > 0) {
    sections.push("", "## Calculation Cards");
    detail.cards.forEach((card) => {
      const record = card as Record<string, unknown>;
      sections.push(`### ${String(record["title"] ?? "Card")}`);
      const items = Array.isArray(record["items"]) ? record["items"] : [];

      items.forEach((item) => {
        const itemRecord =
          item && typeof item === "object" && !Array.isArray(item)
            ? (item as Record<string, unknown>)
            : {};
        sections.push(
          `- ${String(itemRecord["label"] ?? "Item")}: ${String(itemRecord["value"] ?? "")}`,
        );
      });
    });
  }

  return sections.join("\n");
}

export async function exportGeneratedOutputMarkdown(outputId: string) {
  const detail = await getGeneratedOutputDetail(outputId);

  if (!detail) {
    return null;
  }

  const sections = [
    `# ${detail.title}`,
    "",
    `SKU: \`${detail.sku.code}\``,
    `Output Type: \`${detail.outputType}\``,
    `Status: \`${detail.status}\``,
    `Version: \`${detail.version}\``,
    `Created: \`${compactDate(detail.createdAt)}\``,
    "",
  ];

  if (detail.outputType === "BUILD_PACKET") {
    sections.push("## Build Packet");
    sections.push("");

    detail.sections.forEach((section) => {
      const record = section as Record<string, unknown>;
      const order = String(record["sectionOrder"] ?? "?");
      sections.push(`## ${order.padStart(2, "0")}. ${String(record["name"] ?? "Untitled")}`);
      sections.push("");
      sections.push(String(record["content"] ?? ""));
      sections.push("");
    });
  } else if (detail.outputType === "CALCULATION") {
    sections.push(renderCalculationMarkdown(detail));
    sections.push("");
  } else if (detail.outputType === "IMAGE_RENDER") {
    sections.push("## Rendered Image Output");
    sections.push("");

    detail.imageAssets.forEach((asset, index) => {
      sections.push(`### Image ${index + 1}`);
      sections.push(`- Status: \`${asset.status}\``);
      sections.push(`- Model: \`${asset.modelName}\``);
      if (asset.imageUrl) {
        sections.push(`- Image URL: \`${asset.imageUrl}\``);
      }
      if (asset.filePath) {
        sections.push(`- File Path: \`${asset.filePath}\``);
      }
      if (asset.width && asset.height) {
        sections.push(`- Dimensions: \`${asset.width}x${asset.height}\``);
      }
      sections.push("");
    });

    sections.push("## Underlying Prompt Text");
    sections.push("");
    sections.push("```text");
    sections.push(detail.text);
    sections.push("```");
    sections.push("");
  } else {
    sections.push("## Rendered Output");
    sections.push("");
    sections.push("```text");
    sections.push(detail.text);
    sections.push("```");
    sections.push("");
  }

  const rulesMarkdown = renderRulesMarkdown(detail);
  if (rulesMarkdown) {
    sections.push(rulesMarkdown, "");
  }

  const qcMarkdown = renderQcMarkdown(detail);
  if (qcMarkdown) {
    sections.push(qcMarkdown, "");
  }

  sections.push(renderSourceReferencesMarkdown(detail), "");

  return {
    filename: `${detail.sku.code}-${slugify(detail.title)}.md`,
    content: sections.join("\n"),
    outputType: detail.outputType,
  };
}

export async function getPrintablePacketExport(outputId: string) {
  const detail = await getGeneratedOutputDetail(outputId);

  if (!detail || detail.outputType !== "BUILD_PACKET") {
    return null;
  }

  const technicalDrawings = detail.imageAssets
    .filter((asset) => {
      if (asset.status !== "GENERATED" || !asset.filePath) return false;
      return asset.metadata && typeof asset.metadata["drawingType"] === "string";
    })
    .map((asset) => ({
      drawingType: String(asset.metadata!["drawingType"]),
      sectionKey: String(asset.metadata!["sectionKey"] ?? ""),
      filePath: asset.filePath!,
    }));

  return {
    title: detail.title,
    outputId: detail.id,
    sku: detail.sku,
    status: detail.status,
    version: detail.version,
    createdAt: detail.createdAt,
    sections: detail.sections,
    rulesApplied: detail.rulesApplied,
    qcTemplatesApplied: detail.qcTemplatesApplied,
    sourceReferences: detail.sourceReferences,
    technicalDrawings,
    text: detail.text,
  };
}
