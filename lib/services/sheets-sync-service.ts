import { prisma } from "@/lib/db";
import { writeSheet, updateRange } from "./google-sheets-service";
import { mapSkuRecordWithPricing, decimalToNumber } from "./service-helpers";
import {
  buildCalculatorDefaultsForSku,
  runCalculatorEngine,
} from "@/lib/engines/calculator-engine";
import { buildScopedWhere } from "./service-helpers";

type SyncResult = {
  tab: string;
  rows: number;
  success: boolean;
  error?: string;
};

// ── Products Tab ────────────────────────────────────────────

export async function syncProductsToSheet(): Promise<SyncResult> {
  try {
    const skus = await prisma.sku.findMany({
      where: { status: "ACTIVE" },
      include: { laborRate: true },
      orderBy: { code: "asc" },
    });

    const header = [
      "SKU Code", "Name", "Category", "Type", "Finish", "Status",
      "Outer L (in)", "Outer W (in)", "Outer H (in)",
      "Inner L (in)", "Inner W (in)", "Inner D (in)",
      "Wall Thickness", "Bottom Thickness",
      "Weight Min (lbs)", "Weight Max (lbs)",
      "Drain Type", "Drain Dia", "Mount Type",
      "Has Overflow", "Overflow Dia",
      "Labor Rate", "Labor Hrs/Unit", "Labor $/Unit",
      "Batch Qty", "Retail Price", "Wholesale Price",
    ];

    const rows = skus.map((sku) => {
      const mapped = mapSkuRecordWithPricing(sku);
      const laborRate = sku.laborRate ? Number(sku.laborRate.hourlyRate) : 0;
      const laborHours = decimalToNumber(sku.laborHoursPerUnit) ?? 0;
      return [
        mapped.code, mapped.name, mapped.category, mapped.type, mapped.finish, mapped.status,
        mapped.outerLength, mapped.outerWidth, mapped.outerHeight,
        mapped.innerLength, mapped.innerWidth, mapped.innerDepth,
        mapped.wallThickness, mapped.bottomThickness,
        mapped.targetWeight.min, mapped.targetWeight.max,
        mapped.drainType, mapped.drainDiameter, mapped.mountType,
        mapped.hasOverflow ? "Yes" : "No", mapped.overflowHoleDiameter,
        sku.laborRate?.name ?? "", laborHours, Math.round(laborRate * laborHours * 100) / 100,
        mapped.calculatorDefaults.unitsToProduce, mapped.retailPrice ?? "", mapped.wholesalePrice ?? "",
      ];
    });

    const result = await writeSheet("Products", [header, ...rows]);
    return { tab: "Products", rows: result.updatedRows, success: true };
  } catch (e) {
    return { tab: "Products", rows: 0, success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Pricing Tab ─────────────────────────────────────────────

export async function syncPricingToSheet(): Promise<SyncResult> {
  try {
    const skus = await prisma.sku.findMany({
      where: { status: "ACTIVE" },
      include: { laborRate: true },
      orderBy: { code: "asc" },
    });

    const header = [
      "SKU", "Material Cost", "Labor Hours", "Labor Rate ($/hr)",
      "Labor Cost/Unit", "Packaging Cost", "Sealer Cost",
      "Overhead/Unit", "Total Cost/Unit", "Target Margin %",
      "Suggested Price", "Batch Qty",
    ];

    const rows: (string | number | null)[][] = [];

    for (const sku of skus) {
      const mapped = mapSkuRecordWithPricing(sku);
      const defaults = mapped.calculatorDefaults;

      const materialRows = await prisma.materialsMaster.findMany({
        where: { status: "ACTIVE", ...buildScopedWhere(sku) },
      });

      const materials = materialRows.map((m) => ({
        code: m.code,
        name: m.name,
        category: m.category,
        categoryScope: m.categoryScope,
        skuCategory: m.skuCategory,
        skuOverrideId: m.skuOverrideId,
        status: m.status,
        unit: m.unit,
        quantity: decimalToNumber(m.quantity) ?? 0,
        unitCost: decimalToNumber(m.unitCost) ?? 0,
        notes: m.notes ?? "",
      }));

      const laborRate = sku.laborRate ? Number(sku.laborRate.hourlyRate) : 0;
      const laborHours = decimalToNumber(sku.laborHoursPerUnit) ?? 0;

      const calcInputs = buildCalculatorDefaultsForSku({
        sku: { id: sku.id, ...mapped, laborHoursPerUnit: laborHours, laborRateId: sku.laborRateId },
        materials,
        defaults,
        laborRate: sku.laborRate ? { hourlyRate: laborRate } : null,
      });

      const result = runCalculatorEngine({
        sku: { id: sku.id, ...mapped },
        materials,
        defaults,
        overrides: calcInputs,
      });

      rows.push([
        mapped.code,
        result.metrics.materialCost,
        laborHours,
        laborRate,
        result.metrics.laborCost / (defaults.unitsToProduce || 1),
        result.metrics.packagingCost / (defaults.unitsToProduce || 1),
        result.metrics.sealerCost / (defaults.unitsToProduce || 1),
        result.metrics.overheadCost / (defaults.unitsToProduce || 1),
        result.metrics.costPerUnit,
        0.6,
        Math.ceil(result.metrics.costPerUnit / 0.4 / 50) * 50,
        defaults.unitsToProduce,
      ]);
    }

    const writeResult = await writeSheet("Pricing", [header, ...rows]);
    return { tab: "Pricing", rows: writeResult.updatedRows, success: true };
  } catch (e) {
    return { tab: "Pricing", rows: 0, success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Capacity Tab ────────────────────────────────────────────

export async function syncCapacityToSheet(): Promise<SyncResult> {
  try {
    const skus = await prisma.sku.findMany({
      where: { status: "ACTIVE" },
      include: { laborRate: true },
      orderBy: { code: "asc" },
    });

    const header = ["SKU", "Labor Time (min)", "Max Units/Day", "Max Units/Week"];
    const workMinutesPerDay = 480; // 8 hours

    const rows = skus.map((sku) => {
      const laborHours = decimalToNumber(sku.laborHoursPerUnit) ?? 1;
      const laborMins = Math.round(laborHours * 60);
      const maxPerDay = laborMins > 0 ? Math.floor(workMinutesPerDay / laborMins) : 0;
      return [sku.code, laborMins, maxPerDay, maxPerDay * 5];
    });

    const result = await writeSheet("Capacity", [header, ...rows]);
    return { tab: "Capacity", rows: result.updatedRows, success: true };
  } catch (e) {
    return { tab: "Capacity", rows: 0, success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Inventory Tab ───────────────────────────────────────────

export async function syncInventoryToSheet(): Promise<SyncResult> {
  try {
    const skus = await prisma.sku.findMany({
      where: { status: "ACTIVE" },
      orderBy: { code: "asc" },
    });

    const header = ["SKU", "On Hand", "Reserved", "Available", "Reorder Point", "Status"];
    const rows = skus.map((sku) => [sku.code, 0, 0, 0, 5, "In Stock"]);

    const result = await writeSheet("Inventory", [header, ...rows]);
    return { tab: "Inventory", rows: result.updatedRows, success: true };
  } catch (e) {
    return { tab: "Inventory", rows: 0, success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Orders Tab ──────────────────────────────────────────────

export async function syncOrdersToSheet(): Promise<SyncResult> {
  try {
    const jobs = await prisma.job.findMany({
      include: { sku: true, client: true },
      orderBy: { createdAt: "desc" },
    });

    const header = ["Order ID", "SKU", "Client", "Quantity", "Sale Price", "Revenue", "Status", "Due Date"];
    const rows = jobs.map((job) => [
      job.jobNumber,
      job.sku.code,
      job.client?.name ?? "",
      job.quantity,
      decimalToNumber(job.retailPriceTotal) ?? 0,
      (decimalToNumber(job.retailPriceTotal) ?? 0),
      job.status,
      job.dueDate?.toISOString().split("T")[0] ?? "",
    ]);

    const result = await writeSheet("Orders", [header, ...rows]);
    return { tab: "Orders", rows: result.updatedRows, success: true };
  } catch (e) {
    return { tab: "Orders", rows: 0, success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Costing Tab ─────────────────────────────────────────────

export async function syncCostingToSheet(): Promise<SyncResult> {
  try {
    const materials = await prisma.materialsMaster.findMany({
      where: { status: "ACTIVE" },
      include: { supplier: { select: { name: true } } },
      orderBy: [{ category: "asc" }, { code: "asc" }],
    });

    const header = [
      "Code", "Name", "Category", "Supplier", "Unit",
      "Quantity", "Unit Cost", "Scope", "Last Priced",
    ];

    const rows = materials.map((m) => [
      m.code, m.name, m.category, m.supplier?.name ?? "",
      m.unit, decimalToNumber(m.quantity) ?? 0, decimalToNumber(m.unitCost) ?? 0,
      m.categoryScope + (m.skuCategory ? ` · ${m.skuCategory}` : ""),
      m.lastPricedAt?.toISOString().split("T")[0] ?? "",
    ]);

    const result = await writeSheet("Costing", [header, ...rows]);
    return { tab: "Costing", rows: result.updatedRows, success: true };
  } catch (e) {
    return { tab: "Costing", rows: 0, success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Dashboard Tab ───────────────────────────────────────────

export async function syncDashboardToSheet(): Promise<SyncResult> {
  try {
    const [totalSkus, totalJobs, totalOutputs] = await Promise.all([
      prisma.sku.count({ where: { status: "ACTIVE" } }),
      prisma.job.count(),
      prisma.generatedOutput.count(),
    ]);

    const jobRevenue = await prisma.job.aggregate({
      _sum: { retailPriceTotal: true },
    });
    const revenue = decimalToNumber(jobRevenue._sum.retailPriceTotal) ?? 0;

    const rows = [
      ["Metric", "Value"],
      ["Total Revenue", revenue],
      ["Total Orders", totalJobs],
      ["AOV", totalJobs > 0 ? Math.round(revenue / totalJobs) : 0],
      ["Active SKUs", totalSkus],
      ["Generated Outputs", totalOutputs],
      ["Last Synced", new Date().toISOString()],
    ];

    const result = await writeSheet("Dashboard", rows);
    return { tab: "Dashboard", rows: result.updatedRows, success: true };
  } catch (e) {
    return { tab: "Dashboard", rows: 0, success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Sync All ────────────────────────────────────────────────

export async function syncAllToSheet(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  results.push(await syncProductsToSheet());
  results.push(await syncPricingToSheet());
  results.push(await syncCapacityToSheet());
  results.push(await syncInventoryToSheet());
  results.push(await syncOrdersToSheet());
  results.push(await syncCostingToSheet());
  results.push(await syncDashboardToSheet());

  return results;
}
