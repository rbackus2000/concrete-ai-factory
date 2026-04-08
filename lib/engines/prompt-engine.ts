import type {
  GeneratorFormValues,
  ImageScenePreset,
} from "../schemas/generator";
import type { Sku } from "../schemas/sku";
import type {
  CategoryScope,
  OutputType,
  PromptTemplateCategory,
  SkuCategory,
} from "../schemas/domain";

export type PromptSku = Sku & {
  id?: string;
};

export type PromptTemplateRecord = {
  key: string;
  name: string;
  category: PromptTemplateCategory;
  categoryScope: CategoryScope;
  skuCategory?: SkuCategory | null;
  skuOverrideId?: string | null;
  outputType: OutputType;
  templateBody: string;
};

const sceneControlsByPreset: Record<
  ImageScenePreset,
  {
    sceneType: string;
    cameraAngle: string;
    lightingStyle: string;
    backgroundStyle: string;
  }
> = {
  lifestyle: {
    sceneType: "lifestyle",
    cameraAngle: "three-quarter hero",
    lightingStyle: "soft architectural daylight with premium contrast",
    backgroundStyle: "restrained architectural bathroom backdrop",
  },
  catalog: {
    sceneType: "catalog",
    cameraAngle: "clean three-quarter catalog",
    lightingStyle: "balanced neutral studio lighting",
    backgroundStyle: "clean minimal studio sweep",
  },
  detail: {
    sceneType: "detail",
    cameraAngle: "close three-quarter detail",
    lightingStyle: "soft directional light with material emphasis",
    backgroundStyle: "minimal tonal backdrop",
  },
  installed: {
    sceneType: "installed",
    cameraAngle: "architectural perspective",
    lightingStyle: "soft natural architectural lighting",
    backgroundStyle: "refined installed environment",
  },
  sample: {
    sceneType: "sample",
    cameraAngle: "straight-on product sample",
    lightingStyle: "clean studio lighting",
    backgroundStyle: "neutral studio background",
  },
  repeat_pattern: {
    sceneType: "repeat pattern",
    cameraAngle: "angled surface overview",
    lightingStyle: "balanced raking light for pattern definition",
    backgroundStyle: "minimal architectural context",
  },
};

const imageRenderTemplateKeyByCategory: Partial<
  Record<SkuCategory, Partial<Record<ImageScenePreset, string>>>
> = {
  VESSEL_SINK: {
    lifestyle: "sink_image_lifestyle",
    catalog: "sink_image_catalog",
    detail: "sink_image_detail",
  },
  FURNITURE: {
    lifestyle: "furniture_image_lifestyle",
    catalog: "furniture_image_catalog",
    detail: "furniture_image_detail",
  },
  PANEL: {
    installed: "panel_image_installed",
    sample: "panel_image_sample",
    repeat_pattern: "panel_image_repeat_pattern",
  },
};

const finishDescriptions: Record<string, string> = {
  Classic:
    "smooth, uniform GFRC surface with fine sand particle texture and consistent coloring",
  Foundry:
    "naturally mottled, hand-troweled GFRC surface with subtle color variation and artisan character",
  Industrial:
    "raw, distressed GFRC surface with visible air pores, exposed aggregate texture, and intentional imperfections",
  Woodform:
    "GFRC concrete cast against real wood-grain molds so the finished surface carries a realistic, deeply embossed wood-plank texture with visible grain lines, knots, and saw marks — the object is concrete but reads visually as reclaimed hardwood lumber",
};

const categoryNegativeRules: Partial<Record<SkuCategory, string[]>> = {
  VESSEL_SINK: [
    "Do not make the basin look like a generic trough sink, ramp sink, or simple rectangular bowl.",
    "Do not crop out the faucet when faucet visibility is requested.",
    "Do not hide the drain when drain visibility is requested.",
    "Do not place the drain off-center unless the SKU explicitly says so.",
    "Do not create warped walls, unrealistic thickness, or cracked concrete.",
    "Do not add extra fixtures or decorative clutter.",
  ],
  FURNITURE: [
    "No faucet.",
    "No drain.",
    "No sink basin.",
    "No bathroom vanity styling.",
    "No impossible spans.",
    "No structurally implausible support.",
    "No warped slab edges.",
    "No surreal concrete deformation.",
  ],
  PANEL: [
    "No faucet.",
    "No drain.",
    "No sink-like cavity.",
    "No furniture base.",
    "No inconsistent module sizing.",
    "No broken repeat logic.",
    "No unrealistic grout spacing.",
    "No chaotic texture distortion.",
  ],
};

function matchesPromptScope(template: PromptTemplateRecord, sku: PromptSku) {
  if (template.categoryScope === "GLOBAL") {
    return true;
  }

  if (template.categoryScope === "SKU_CATEGORY") {
    return template.skuCategory === sku.category;
  }

  return template.skuOverrideId === sku.id;
}

function formatCategoryLabel(category: SkuCategory) {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? `${value}` : `${value}`.replace(/\.0+$/, "");
}

function buildImageTemplateKey(category: SkuCategory, scenePreset?: ImageScenePreset) {
  if (!scenePreset) {
    return null;
  }

  return imageRenderTemplateKeyByCategory[category]?.[scenePreset] ?? null;
}

function applyConditionals(templateBody: string, variables: Record<string, string | boolean>) {
  return templateBody.replace(/{{#if\s+([a-zA-Z0-9_]+)}}([\s\S]*?){{\/if}}/g, (_, key, content) => {
    return variables[key] ? content : "";
  });
}

function replaceTokens(templateBody: string, variables: Record<string, string | boolean>) {
  return Object.entries(variables).reduce((current, [key, value]) => {
    const replacement = typeof value === "boolean" ? (value ? "true" : "") : value;
    return current.replaceAll(`{{${key}}}`, replacement);
  }, templateBody);
}

function cleanupPromptText(text: string) {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildPromptVariables({
  sku,
  values,
}: {
  sku: PromptSku;
  values: GeneratorFormValues;
}) {
  const scenePreset = values.scenePreset ?? "lifestyle";
  const controls = sceneControlsByPreset[scenePreset];
  const baseFinish = sku.finish;
  const overrideColor = values.colorOverride && values.colorOverride !== "SKU Default"
    ? values.colorOverride
    : null;
  const overrideFinish = values.finishOverride && values.finishOverride !== "SKU Default"
    ? values.finishOverride
    : null;
  const overrideSealer = values.sealerOverride && values.sealerOverride !== "SKU Default"
    ? values.sealerOverride
    : null;
  const colorName = overrideColor ?? baseFinish.replace(/^(Matte|Satin|Gloss|Classic|Foundry|Industrial)\s+/i, "");
  const finishName = overrideFinish ?? "Classic";
  const sealerName = overrideSealer ?? "Matte";
  const effectiveFinish = `${sealerName} ${finishName} ${colorName}`;
  const isSink = sku.category === "VESSEL_SINK";
  const isFurniture = sku.category === "FURNITURE";
  const isPanel = sku.category === "PANEL";
  const showDrain = isSink && sku.drainDiameter > 0;
  const showFaucet = isSink && scenePreset === "lifestyle";

  return {
    skuCode: sku.code,
    productName: sku.name,
    categoryLabel: formatCategoryLabel(sku.category),
    finish: effectiveFinish,
    finishDescription: finishDescriptions[finishName] ?? `${finishName} GFRC surface finish`,
    outerDimensions: `${formatNumber(sku.outerLength)} x ${formatNumber(sku.outerWidth)} x ${formatNumber(sku.outerHeight)} inches`,
    innerDimensions: `${formatNumber(sku.innerLength)} x ${formatNumber(sku.innerWidth)} inches at ${formatNumber(sku.innerDepth)} inches deep`,
    targetWeight: `${formatNumber(sku.targetWeight.min)} to ${formatNumber(sku.targetWeight.max)}`,
    styleLabel: isPanel
      ? "modular architectural surface design"
      : isFurniture
        ? "architectural minimal"
        : "premium architectural minimal",
    materialLabel: "GFRC",
    outerLength: formatNumber(sku.outerLength),
    outerWidth: formatNumber(sku.outerWidth),
    outerHeight: formatNumber(sku.outerHeight),
    innerLength: formatNumber(sku.innerLength),
    innerWidth: formatNumber(sku.innerWidth),
    innerDepth: formatNumber(sku.innerDepth),
    wallThickness: formatNumber(sku.wallThickness),
    bottomThickness: formatNumber(sku.bottomThickness),
    topLipThickness: formatNumber(sku.topLipThickness),
    drainDiameter: formatNumber(sku.drainDiameter),
    drainType: sku.drainType || "Round",
    basinSlopeDeg: formatNumber(sku.basinSlopeDeg),
    slopeDirection: sku.slopeDirection || "Center",
    hasDrain: showDrain,
    showDrain,
    showFaucet,
    mountType: sku.mountType || (isFurniture ? "freestanding" : "vessel mount"),
    supportType: isFurniture ? "integrated architectural support" : "",
    useContext: isFurniture ? "a refined residential or hospitality interior" : "",
    topThickness: formatNumber(sku.topLipThickness || sku.outerHeight),
    baseMaterial: "GFRC",
    tileLength: formatNumber(sku.outerLength),
    tileWidth: formatNumber(sku.outerWidth),
    tileThickness: formatNumber(sku.outerHeight),
    edgeProfile: sku.cornerRadius > 0 ? `${formatNumber(sku.cornerRadius)} inch softened radius` : "crisp eased edge",
    patternRepeatType: scenePreset === "repeat_pattern" ? "clean modular repeat" : "single module",
    installOrientation: "horizontal running bond",
    sceneType: controls.sceneType,
    cameraAngle: controls.cameraAngle,
    lightingStyle: controls.lightingStyle,
    backgroundStyle: controls.backgroundStyle,
    creativeDirection: values.creativeDirection,
    requestedOutput: values.requestedOutput,
  } satisfies Record<string, string | boolean>;
}

function buildPromptBody({
  template,
  sku,
  values,
  appliedRules,
}: {
  template: PromptTemplateRecord;
  sku: PromptSku;
  values: GeneratorFormValues;
  appliedRules: string[];
}) {
  const variables = buildPromptVariables({ sku, values });
  const interpolated = replaceTokens(applyConditionals(template.templateBody, variables), variables);
  const negativeRules = categoryNegativeRules[sku.category] ?? [];
  const sections = [cleanupPromptText(interpolated)];

  if (values.creativeDirection) {
    sections.push(`Creative direction: ${values.creativeDirection}`);
  }

  if (values.requestedOutput) {
    sections.push(`Requested output: ${values.requestedOutput}`);
  }

  if (appliedRules.length > 0) {
    sections.push(`Manufacturing rules:\n${appliedRules.map((rule) => `- ${rule}`).join("\n")}`);
  }

  if (negativeRules.length > 0) {
    sections.push(`Negative rules:\n${negativeRules.map((rule) => `- ${rule}`).join("\n")}`);
  }

  return cleanupPromptText(sections.join("\n\n"));
}

export function resolvePromptTemplatesForSku<T extends PromptTemplateRecord>({
  sku,
  promptTemplates,
  outputType,
}: {
  sku: PromptSku;
  promptTemplates: T[];
  outputType?: PromptTemplateRecord["outputType"];
}) {
  return promptTemplates
    .filter((template) => matchesPromptScope(template, sku))
    .filter((template) => (outputType ? template.outputType === outputType : true))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function resolvePromptTemplateForRequest<T extends PromptTemplateRecord>({
  sku,
  promptTemplates,
  values,
}: {
  sku: PromptSku;
  promptTemplates: T[];
  values: GeneratorFormValues;
}) {
  const scopedTemplates = resolvePromptTemplatesForSku({
    sku,
    promptTemplates,
    outputType: values.outputType,
  });

  if (values.outputType !== "IMAGE_RENDER") {
    return scopedTemplates[0] ?? null;
  }

  const key = buildImageTemplateKey(sku.category, values.scenePreset);

  if (!key) {
    return null;
  }

  return scopedTemplates.find((template) => template.key === key) ?? null;
}

export function buildPromptPreview({
  values,
  skus,
  promptTemplates,
}: {
  values: GeneratorFormValues;
  skus: PromptSku[];
  promptTemplates: PromptTemplateRecord[];
}) {
  const sku = skus.find((entry) => entry.code === values.skuCode) ?? skus[0];

  if (!sku) {
    return "";
  }

  const template = resolvePromptTemplateForRequest({
    sku,
    promptTemplates,
    values,
  });

  if (!template) {
    return "";
  }

  return buildPromptBody({
    template,
    sku,
    values,
    appliedRules: [],
  });
}

export function buildPromptOutput({
  sku,
  template,
  values,
  rules,
}: {
  sku: PromptSku;
  template: PromptTemplateRecord;
  values: GeneratorFormValues;
  rules: Array<{
    code: string;
    title: string;
    priority: number;
    ruleText: string;
  }>;
}) {
  const appliedRules = rules
    .sort((left, right) => left.priority - right.priority || left.title.localeCompare(right.title))
    .map((rule) => `[P${rule.priority}] ${rule.title}: ${rule.ruleText}`);
  const promptText = buildPromptBody({
    template,
    sku,
    values,
    appliedRules,
  });

  const text = [
    `Output Type: ${template.outputType}`,
    `Template: ${template.name}`,
    `Template Key: ${template.key}`,
    `SKU: ${sku.code}`,
    "",
    promptText,
  ].join("\n");

  return {
    text,
    promptText,
    appliedRules,
  };
}
