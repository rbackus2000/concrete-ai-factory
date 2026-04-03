import type { CategoryScope, MaterialCategory, SkuCategory } from "../schemas/domain";
import type { Sku } from "../schemas/sku";
import type { CalculatorRunValues } from "../schemas/calculator";

export type MaterialRecord = {
  code: string;
  name: string;
  category: MaterialCategory;
  categoryScope: CategoryScope;
  skuCategory?: SkuCategory | null;
  skuOverrideId?: string | null;
  status: string;
  unit: string;
  quantity: number;
  unitCost: number;
  notes: string;
};

type CalculatorDefaults = Sku["calculatorDefaults"];

export type CalculatorOverrides = Pick<
  CalculatorRunValues,
  | "unitsToProduce"
  | "wasteFactor"
  | "pigmentIntensityPercent"
  | "sealerCoats"
  | "materialCostMultiplier"
  | "sealerCostPerGallon"
  | "laborCostPerUnit"
  | "overheadCostPerUnit"
>;

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function matchesMaterialScope(material: MaterialRecord, sku: Sku & { id?: string }) {
  if (material.categoryScope === "GLOBAL") {
    return true;
  }

  if (material.categoryScope === "SKU_CATEGORY") {
    return material.skuCategory === sku.category;
  }

  return material.skuOverrideId === sku.id;
}

export function resolveMaterialsForSku({
  sku,
  materials,
}: {
  sku: Sku & { id?: string };
  materials: MaterialRecord[];
}) {
  return materials.filter((material) => matchesMaterialScope(material, sku));
}

export function buildCalculatorSnapshot({
  sku,
  materials,
  defaults,
}: {
  sku: Sku & { id?: string };
  materials: MaterialRecord[];
  defaults: CalculatorDefaults;
}) {
  const resolvedMaterials = resolveMaterialsForSku({ sku, materials });
  const estimatedMaterialCost = resolvedMaterials.reduce(
    (total, material) => total + material.quantity * material.unitCost,
    0,
  );

  return {
    cards: [
      {
        title: "Mix calculator",
        items: [
          { label: "Batch size", value: `${defaults.batchSizeLbs} lb` },
          { label: "Mix type", value: defaults.mixType },
          { label: "Water", value: `${defaults.waterLbs} lb` },
          { label: "Plasticizer", value: `${defaults.plasticizerGrams} g` },
        ],
      },
      {
        title: "Scaling outputs",
        items: [
          { label: "Units", value: String(defaults.unitsToProduce) },
          { label: "Weight / unit", value: `${defaults.weightPerUnitLbs} lb` },
          { label: "Waste factor", value: String(defaults.wasteFactor) },
          { label: "Auto batch size", value: `${defaults.autoBatchSizeLbs} lb` },
        ],
      },
      {
        title: "Pigment defaults",
        items: [
          {
            label: "Color intensity",
            value: `${(defaults.colorIntensityPercent * 100).toFixed(1)}%`,
          },
          { label: "Pigment", value: `${defaults.pigmentGrams.toFixed(2)} g` },
          { label: "Fiber %", value: `${(sku.fiberPercent * 100).toFixed(1)}%` },
          { label: "Scale factor", value: defaults.scaleFactor.toFixed(2) },
        ],
      },
      {
        title: "Costing baseline",
        items: [
          { label: "Material lines", value: String(resolvedMaterials.length) },
          { label: "Estimated material cost", value: `$${estimatedMaterialCost.toFixed(2)}` },
          { label: "SKU", value: sku.code },
          { label: "Starter mode", value: "Seed scaffold" },
        ],
      },
    ],
    materials: resolvedMaterials,
  };
}

export function buildCalculatorDefaultsForSku({
  sku,
  materials,
  defaults,
}: {
  sku: Sku & { id?: string };
  materials: MaterialRecord[];
  defaults: CalculatorDefaults;
}) {
  const resolvedMaterials = resolveMaterialsForSku({ sku, materials });
  const sealerMaterial = resolvedMaterials.find((material) => material.category === "SEALER");

  return {
    skuCode: sku.code,
    unitsToProduce: defaults.unitsToProduce || 1,
    wasteFactor: defaults.wasteFactor || 1,
    pigmentIntensityPercent: defaults.colorIntensityPercent || 0,
    sealerCoats: 2,
    materialCostMultiplier: 1,
    sealerCostPerGallon: sealerMaterial?.unitCost ?? 0,
    laborCostPerUnit: 0,
    overheadCostPerUnit: 0,
  };
}

export function runCalculatorEngine({
  sku,
  materials,
  defaults,
  overrides,
}: {
  sku: Sku & { id?: string };
  materials: MaterialRecord[];
  defaults: CalculatorDefaults;
  overrides: CalculatorOverrides;
}) {
  const resolvedMaterials = resolveMaterialsForSku({ sku, materials });
  const baseBatchSize = defaults.batchSizeLbs || 1;
  const unitsToProduce = overrides.unitsToProduce;
  const weightPerUnit = defaults.weightPerUnitLbs || ((sku.targetWeight.min + sku.targetWeight.max) / 2);
  const effectiveWasteFactor = overrides.wasteFactor;
  const batchSize = round(unitsToProduce * weightPerUnit * effectiveWasteFactor, 2);
  const scaleFactor = baseBatchSize > 0 ? batchSize / baseBatchSize : 0;
  const water = round(defaults.waterLbs * scaleFactor, 2);
  const plasticizer = round(defaults.plasticizerGrams * scaleFactor, 2);
  const fiber = round(batchSize * sku.fiberPercent, 2);
  const intensityRatio =
    defaults.colorIntensityPercent > 0
      ? overrides.pigmentIntensityPercent / defaults.colorIntensityPercent
      : 0;
  const pigmentGrams = round(defaults.pigmentGrams * scaleFactor * intensityRatio, 2);

  const sealerMaterial = resolvedMaterials.find((material) => material.category === "SEALER");
  const sealerBaseQuantity = sealerMaterial?.quantity ?? 0;
  const sealerEstimate = round(
    sealerBaseQuantity * unitsToProduce * effectiveWasteFactor * (overrides.sealerCoats / 2 || 0),
    3,
  );

  const packagingCost = resolvedMaterials
    .filter((material) => material.category === "PACKAGING" || material.category === "INSERT")
    .reduce((total, material) => total + material.quantity * material.unitCost * unitsToProduce, 0);

  const baseMaterialCost = resolvedMaterials
    .filter((material) => material.category !== "PACKAGING" && material.category !== "INSERT" && material.category !== "SEALER")
    .reduce((total, material) => total + material.quantity * material.unitCost * scaleFactor, 0);

  const sealerCost = round(sealerEstimate * overrides.sealerCostPerGallon, 2);
  const materialCost = round(baseMaterialCost * overrides.materialCostMultiplier, 2);
  const laborCost = round(overrides.laborCostPerUnit * unitsToProduce, 2);
  const overheadCost = round(overrides.overheadCostPerUnit * unitsToProduce, 2);
  const totalCost = round(materialCost + packagingCost + sealerCost + laborCost + overheadCost, 2);
  const costPerUnit = unitsToProduce > 0 ? round(totalCost / unitsToProduce, 2) : 0;

  return {
    inputs: {
      unitsToProduce,
      wasteFactor: effectiveWasteFactor,
      pigmentIntensityPercent: overrides.pigmentIntensityPercent,
      sealerCoats: overrides.sealerCoats,
      materialCostMultiplier: overrides.materialCostMultiplier,
      sealerCostPerGallon: overrides.sealerCostPerGallon,
      laborCostPerUnit: overrides.laborCostPerUnit,
      overheadCostPerUnit: overrides.overheadCostPerUnit,
    },
    metrics: {
      batchSize,
      scaleFactor: round(scaleFactor, 3),
      water,
      plasticizer,
      fiber,
      pigmentGrams,
      sealerEstimateGallons: sealerEstimate,
      materialCost,
      packagingCost: round(packagingCost, 2),
      sealerCost,
      laborCost,
      overheadCost,
      totalCost,
      costPerUnit,
    },
    cards: [
      {
        title: "Mix Outputs",
        items: [
          { label: "Batch size", value: `${batchSize} lb` },
          { label: "Scale factor", value: round(scaleFactor, 2).toFixed(2) },
          { label: "Water", value: `${water} lb` },
          { label: "Plasticizer", value: `${plasticizer} g` },
        ],
      },
      {
        title: "Material Additives",
        items: [
          { label: "Fiber", value: `${fiber} lb` },
          { label: "Pigment", value: `${pigmentGrams} g` },
          { label: "Pigment intensity", value: `${round(overrides.pigmentIntensityPercent * 100, 1)}%` },
          { label: "Sealer estimate", value: `${sealerEstimate} gal` },
        ],
      },
      {
        title: "Cost Placeholders",
        items: [
          { label: "Material cost", value: `$${materialCost.toFixed(2)}` },
          { label: "Packaging + inserts", value: `$${round(packagingCost, 2).toFixed(2)}` },
          { label: "Sealer cost", value: `$${sealerCost.toFixed(2)}` },
          { label: "Cost / unit", value: `$${costPerUnit.toFixed(2)}` },
        ],
      },
    ],
    materials: resolvedMaterials,
  };
}

export function buildCalculationText({
  sku,
  result,
}: {
  sku: Sku;
  result: ReturnType<typeof runCalculatorEngine>;
}) {
  return [
    `Calculation Summary for ${sku.code}`,
    `Batch Size: ${result.metrics.batchSize} lb`,
    `Scale Factor: ${result.metrics.scaleFactor}`,
    `Water: ${result.metrics.water} lb`,
    `Plasticizer: ${result.metrics.plasticizer} g`,
    `Fiber: ${result.metrics.fiber} lb`,
    `Pigment: ${result.metrics.pigmentGrams} g`,
    `Sealer Estimate: ${result.metrics.sealerEstimateGallons} gal`,
    `Estimated Total Cost: $${result.metrics.totalCost.toFixed(2)}`,
    `Estimated Cost Per Unit: $${result.metrics.costPerUnit.toFixed(2)}`,
  ].join("\n");
}
