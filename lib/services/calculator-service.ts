import { prisma } from "../db";
import {
  buildCalculatorDefaultsForSku,
  runCalculatorEngine,
} from "../engines/calculator-engine";
import { calculatorRunSchema, type CalculatorRunValues } from "../schemas/calculator";
import { buildScopedWhere, decimalToNumber, mapSkuRecord } from "./service-helpers";

function mapMaterialRecord(material: Awaited<
  ReturnType<typeof prisma.materialsMaster.findMany>
>[number]) {
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

async function getSkuAndMaterials(skuCode: string) {
  const sku = await prisma.sku.findUnique({
    where: { code: skuCode },
    include: {
      laborRate: { select: { hourlyRate: true } },
    },
  });

  if (!sku) {
    return null;
  }

  const materialRows = await prisma.materialsMaster.findMany({
    where: {
      status: "ACTIVE",
      ...buildScopedWhere(sku),
    },
    orderBy: {
      code: "asc",
    },
  });

  return {
    sku,
    laborRate: sku.laborRate ? { hourlyRate: decimalToNumber(sku.laborRate.hourlyRate) ?? 0 } : null,
    materials: materialRows.map(mapMaterialRecord),
  };
}

export async function getCalculatorWorkspace(selectedSkuCode?: string) {
  const skus = await prisma.sku.findMany({
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      code: "asc",
    },
  });
  const selectedSku = skus.find((sku) => sku.code === selectedSkuCode) ?? skus[0];

  if (!selectedSku) {
    return null;
  }

  const skuDetails = await Promise.all(
    skus.map(async (sku) => {
      const detail = await getSkuAndMaterials(sku.code);

      if (!detail) {
        return null;
      }

      const mappedSku = {
        id: detail.sku.id,
        ...mapSkuRecord(detail.sku),
        laborHoursPerUnit: decimalToNumber(detail.sku.laborHoursPerUnit) ?? 0,
        laborRateId: detail.sku.laborRateId,
      };

      return {
        code: mappedSku.code,
        name: mappedSku.name,
        category: mappedSku.category,
        defaults: buildCalculatorDefaultsForSku({
          sku: mappedSku,
          materials: detail.materials,
          defaults: mappedSku.calculatorDefaults,
          laborRate: detail.laborRate,
        }),
      };
    }),
  );

  const selectedDetail = await getSkuAndMaterials(selectedSku.code);

  if (!selectedDetail) {
    return null;
  }

  const mappedSelectedSku = {
    id: selectedDetail.sku.id,
    ...mapSkuRecord(selectedDetail.sku),
    laborHoursPerUnit: decimalToNumber(selectedDetail.sku.laborHoursPerUnit) ?? 0,
    laborRateId: selectedDetail.sku.laborRateId,
  };
  const initialInputs = buildCalculatorDefaultsForSku({
    sku: mappedSelectedSku,
    materials: selectedDetail.materials,
    defaults: mappedSelectedSku.calculatorDefaults,
    laborRate: selectedDetail.laborRate,
  });
  const initialResult = runCalculatorEngine({
    sku: mappedSelectedSku,
    materials: selectedDetail.materials,
    defaults: mappedSelectedSku.calculatorDefaults,
    overrides: initialInputs,
  });

  return {
    selectedSkuCode: selectedSku.code,
    skus: skuDetails.filter((sku): sku is NonNullable<typeof sku> => sku !== null),
    initialResult: {
      sku: mappedSelectedSku,
      ...initialResult,
    },
  };
}

export async function runCalculatorFlow(values: CalculatorRunValues) {
  const parsed = calculatorRunSchema.parse(values);
  const detail = await getSkuAndMaterials(parsed.skuCode);

  if (!detail) {
    throw new Error(`SKU ${parsed.skuCode} was not found.`);
  }

  const mappedSku = {
    id: detail.sku.id,
    ...mapSkuRecord(detail.sku),
  };
  const result = runCalculatorEngine({
    sku: mappedSku,
    materials: detail.materials,
    defaults: mappedSku.calculatorDefaults,
    overrides: {
      unitsToProduce: parsed.unitsToProduce,
      wasteFactor: parsed.wasteFactor,
      pigmentIntensityPercent: parsed.pigmentIntensityPercent,
      sealerCoats: parsed.sealerCoats,
      materialCostMultiplier: parsed.materialCostMultiplier,
      sealerCostPerGallon: parsed.sealerCostPerGallon,
      laborCostPerUnit: parsed.laborCostPerUnit,
      overheadCostPerUnit: parsed.overheadCostPerUnit,
      marginPercent: parsed.marginPercent ?? 0,
    },
  });

  return {
    sku: mappedSku,
    ...result,
  };
}
