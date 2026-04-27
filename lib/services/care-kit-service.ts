import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/services/service-helpers";

export type CareKitComponentRecord = {
  id: string;
  componentKey: string;
  name: string;
  description: string | null;
  supplierName: string | null;
  supplierUrl: string | null;
  unitCost: number | null;
  size: string | null;
  reorderQty: number | null;
  leadTimeDays: number | null;
  storageNotes: string | null;
  labelRequired: boolean;
  assemblyNotes: string | null;
  mixRatio: string | null;
  madeToOrder: boolean;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
};

export type CareKitBuildSheetItemRecord = {
  componentId: string;
  componentKey: string;
  componentName: string;
  qty: number;
  unitCost: number | null;
  lineCost: number;
  notes: string | null;
  supplierName: string | null;
  supplierUrl: string | null;
  reorderQty: number | null;
  leadTimeDays: number | null;
  madeToOrder: boolean;
  labelRequired: boolean;
  assemblyNotes: string | null;
};

export type CareKitBuildSheetRecord = {
  id: string;
  skuCode: string;
  skuName: string;
  retailPrice: number | null;
  assemblyTimeMinutes: number | null;
  assemblyNotes: string[];
  colorRequired: boolean;
  notes: string | null;
  items: CareKitBuildSheetItemRecord[];
  totalCogs: number;
  marginPct: number | null;
};

type ComponentDb = Prisma.CareKitComponentGetPayload<object>;

function mapComponent(record: ComponentDb): CareKitComponentRecord {
  return {
    id: record.id,
    componentKey: record.componentKey,
    name: record.name,
    description: record.description,
    supplierName: record.supplierName,
    supplierUrl: record.supplierUrl,
    unitCost: decimalToNumber(record.unitCost),
    size: record.size,
    reorderQty: record.reorderQty,
    leadTimeDays: record.leadTimeDays,
    storageNotes: record.storageNotes,
    labelRequired: record.labelRequired,
    assemblyNotes: record.assemblyNotes,
    mixRatio: record.mixRatio,
    madeToOrder: record.madeToOrder,
    status: record.status,
  };
}

export async function listCareKitComponents(): Promise<CareKitComponentRecord[]> {
  const records = await prisma.careKitComponent.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
  });
  return records.map(mapComponent);
}

type SheetWithItems = Prisma.CareKitBuildSheetGetPayload<{
  include: { items: { include: { component: true } } };
}>;

export async function listCareKitBuildSheets(): Promise<CareKitBuildSheetRecord[]> {
  const sheets: SheetWithItems[] = await prisma.careKitBuildSheet.findMany({
    where: { status: { not: "ARCHIVED" } },
    include: {
      items: {
        include: { component: true },
      },
    },
    orderBy: { skuCode: "asc" },
  });

  // Pull SKU info (retail price, name) from the Sku table.
  const skuCodes = sheets.map((s: SheetWithItems) => s.skuCode);
  const skus = await prisma.sku.findMany({
    where: { code: { in: skuCodes } },
    select: { code: true, name: true, retailPrice: true },
  });
  type SkuLite = (typeof skus)[number];
  const skuMap = new Map<string, SkuLite>(skus.map((s: SkuLite) => [s.code, s]));

  return sheets.map((sheet: SheetWithItems) => {
    const sku = skuMap.get(sheet.skuCode);
    const retailPrice = sku?.retailPrice ? decimalToNumber(sku.retailPrice) : null;

    const items: CareKitBuildSheetItemRecord[] = sheet.items.map((item: SheetWithItems["items"][number]) => {
      const qty = decimalToNumber(item.qty) ?? 0;
      const unitCost = decimalToNumber(item.component.unitCost);
      const lineCost = unitCost != null ? Math.round(qty * unitCost * 100) / 100 : 0;
      return {
        componentId: item.componentId,
        componentKey: item.component.componentKey,
        componentName: item.component.name,
        qty,
        unitCost,
        lineCost,
        notes: item.notes,
        supplierName: item.component.supplierName,
        supplierUrl: item.component.supplierUrl,
        reorderQty: item.component.reorderQty,
        leadTimeDays: item.component.leadTimeDays,
        madeToOrder: item.component.madeToOrder,
        labelRequired: item.component.labelRequired,
        assemblyNotes: item.component.assemblyNotes,
      };
    });

    const totalCogs = Math.round(items.reduce((sum, item) => sum + item.lineCost, 0) * 100) / 100;
    const marginPct =
      retailPrice && retailPrice > 0
        ? Math.round(((retailPrice - totalCogs) / retailPrice) * 1000) / 10
        : null;

    const assemblyNotes = Array.isArray(sheet.assemblyNotes) ? (sheet.assemblyNotes as string[]) : [];

    return {
      id: sheet.id,
      skuCode: sheet.skuCode,
      skuName: sku?.name ?? sheet.skuCode,
      retailPrice,
      assemblyTimeMinutes: sheet.assemblyTimeMinutes,
      assemblyNotes,
      colorRequired: sheet.colorRequired,
      notes: sheet.notes,
      items,
      totalCogs,
      marginPct,
    };
  });
}

export async function getCareKitBuildSheetByCode(skuCode: string): Promise<CareKitBuildSheetRecord | null> {
  const sheets = await listCareKitBuildSheets();
  return sheets.find((s) => s.skuCode === skuCode) ?? null;
}
