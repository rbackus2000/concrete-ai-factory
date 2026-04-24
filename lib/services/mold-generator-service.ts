"use server";

import { prisma } from "@/lib/db";
import { mapSkuRecord } from "./service-helpers";

export type MoldGeneratorSku = {
  id: string;
  code: string;
  name: string;
  category: string;
  type: string;
  finish: string;
  outerLength: number;
  outerWidth: number;
  outerHeight: number;
  innerLength: number;
  innerWidth: number;
  innerDepth: number;
  wallThickness: number;
  bottomThickness: number;
  topLipThickness: number;
  longRibCount: number;
  crossRibCount: number;
  ribWidth: number;
  ribHeight: number;
  drainDiameter: number;
  drainType: string;
  slopeDirection: string;
  cornerRadius: number;
  hasOverflow: boolean;
  overflowHoleDiameter: number;
  basinSlopeDeg: number;
  domeRiseMin: number;
  domeRiseMax: number;
  targetWeight: { min: number; max: number };
  summary: string;
};

export async function getMoldGeneratorSkus(): Promise<{
  sinks: MoldGeneratorSku[];
  tiles: MoldGeneratorSku[];
}> {
  const skus = await prisma.sku.findMany({
    where: {
      status: "ACTIVE",
      category: { in: ["VESSEL_SINK", "WALL_TILE", "PANEL"] },
    },
    orderBy: [{ category: "asc" }, { code: "asc" }],
  });

  const mapped = skus.map((sku) => {
    const m = mapSkuRecord(sku);
    return {
      id: sku.id,
      code: m.code,
      name: m.name,
      category: m.category,
      type: m.type,
      finish: m.finish,
      outerLength: m.outerLength,
      outerWidth: m.outerWidth,
      outerHeight: m.outerHeight,
      innerLength: m.innerLength,
      innerWidth: m.innerWidth,
      innerDepth: m.innerDepth,
      wallThickness: m.wallThickness,
      bottomThickness: m.bottomThickness,
      topLipThickness: m.topLipThickness,
      longRibCount: m.longRibCount,
      crossRibCount: m.crossRibCount,
      ribWidth: m.ribWidth,
      ribHeight: m.ribHeight,
      drainDiameter: m.drainDiameter,
      drainType: m.drainType,
      slopeDirection: m.slopeDirection,
      cornerRadius: m.cornerRadius,
      hasOverflow: m.hasOverflow,
      overflowHoleDiameter: m.overflowHoleDiameter,
      basinSlopeDeg: m.basinSlopeDeg,
      domeRiseMin: m.domeRiseMin,
      domeRiseMax: m.domeRiseMax,
      targetWeight: m.targetWeight,
      summary: m.summary,
    };
  });

  return {
    sinks: mapped.filter((s) => s.category === "VESSEL_SINK"),
    // PANEL and WALL_TILE share a mold-build strategy (flat slab + optional ribs),
    // so they share the same tab in the UI.
    tiles: mapped.filter((s) => s.category === "WALL_TILE" || s.category === "PANEL"),
  };
}
