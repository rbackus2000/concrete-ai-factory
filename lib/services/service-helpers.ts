import { Prisma, type Sku as PrismaSku } from "@prisma/client";

import type { Sku } from "../schemas/sku";

const DEFAULT_CALCULATOR_DEFAULTS = {
  batchSizeLbs: 0,
  mixType: "",
  waterLbs: 0,
  plasticizerGrams: 0,
  fiberPercent: 0,
  colorIntensityPercent: 0,
  unitsToProduce: 0,
  weightPerUnitLbs: 0,
  wasteFactor: 0,
  autoBatchSizeLbs: 0,
  scaleFactor: 0,
  pigmentGrams: 0,
};

export function decimalToNumber(
  value: Prisma.Decimal | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

export function buildScopedWhere(sku: { id: string; category: PrismaSku["category"] }) {
  return {
    OR: [
      {
        categoryScope: "GLOBAL" as const,
      },
      {
        categoryScope: "SKU_CATEGORY" as const,
        skuCategory: sku.category,
      },
      {
        categoryScope: "SKU_OVERRIDE" as const,
        skuOverrideId: sku.id,
      },
    ],
  };
}

function parseDatumSystem(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (
      typeof entry === "object" &&
      entry !== null &&
      !Array.isArray(entry) &&
      typeof entry["name"] === "string" &&
      typeof entry["description"] === "string"
    ) {
      return [
        {
          name: entry["name"],
          description: entry["description"],
        },
      ];
    }

    return [];
  });
}

function parseCalculatorDefaults(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_CALCULATOR_DEFAULTS };
  }

  const record = value as Record<string, unknown>;

  return {
    batchSizeLbs: Number(record["batchSizeLbs"] ?? 0),
    mixType: typeof record["mixType"] === "string" ? record["mixType"] : "",
    waterLbs: Number(record["waterLbs"] ?? 0),
    plasticizerGrams: Number(record["plasticizerGrams"] ?? 0),
    fiberPercent: Number(record["fiberPercent"] ?? 0),
    colorIntensityPercent: Number(record["colorIntensityPercent"] ?? 0),
    unitsToProduce: Number(record["unitsToProduce"] ?? 0),
    weightPerUnitLbs: Number(record["weightPerUnitLbs"] ?? 0),
    wasteFactor: Number(record["wasteFactor"] ?? 0),
    autoBatchSizeLbs: Number(record["autoBatchSizeLbs"] ?? 0),
    scaleFactor: Number(record["scaleFactor"] ?? 0),
    pigmentGrams: Number(record["pigmentGrams"] ?? 0),
  };
}

export function parseStringArray(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export function parseStringRecord(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function mapSkuRecord(sku: PrismaSku): Sku {
  return {
    code: sku.code,
    name: sku.name,
    slug: sku.slug,
    category: sku.category,
    status: sku.status,
    type: sku.type,
    finish: sku.finish,
    summary: sku.description ?? "",
    targetWeight: {
      min: decimalToNumber(sku.targetWeightMinLbs) ?? 0,
      max: decimalToNumber(sku.targetWeightMaxLbs) ?? 0,
    },
    outerLength: decimalToNumber(sku.outerLength) ?? 0,
    outerWidth: decimalToNumber(sku.outerWidth) ?? 0,
    outerHeight: decimalToNumber(sku.outerHeight) ?? 0,
    innerLength: decimalToNumber(sku.innerLength) ?? 0,
    innerWidth: decimalToNumber(sku.innerWidth) ?? 0,
    innerDepth: decimalToNumber(sku.innerDepth) ?? 0,
    wallThickness: decimalToNumber(sku.wallThickness) ?? 0,
    bottomThickness: decimalToNumber(sku.bottomThickness) ?? 0,
    topLipThickness: decimalToNumber(sku.topLipThickness) ?? 0,
    hollowCoreDepth: decimalToNumber(sku.hollowCoreDepth) ?? 0,
    domeRiseMin: decimalToNumber(sku.domeRiseMin) ?? 0,
    domeRiseMax: decimalToNumber(sku.domeRiseMax) ?? 0,
    longRibCount: sku.longRibCount ?? 0,
    crossRibCount: sku.crossRibCount ?? 0,
    ribWidth: decimalToNumber(sku.ribWidth) ?? 0,
    ribHeight: decimalToNumber(sku.ribHeight) ?? 0,
    drainDiameter: decimalToNumber(sku.drainDiameter) ?? 0,
    reinforcementDiameter: decimalToNumber(sku.reinforcementDiameter) ?? 0,
    reinforcementThickness: decimalToNumber(sku.reinforcementThickness) ?? 0,
    draftAngle: decimalToNumber(sku.draftAngle) ?? 0,
    cornerRadius: decimalToNumber(sku.cornerRadius) ?? 0,
    fiberPercent: decimalToNumber(sku.fiberPercent) ?? 0,
    datumSystem: parseDatumSystem(sku.datumSystemJson),
    calculatorDefaults: parseCalculatorDefaults(sku.calculatorDefaults),
  };
}
