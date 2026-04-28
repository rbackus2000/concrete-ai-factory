import { OutputStatus, OutputType, RecordStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

// ── Trade portal catalog helpers ──
// Read-only views of the SKU + GeneratedOutput tables, formatted for the
// trade portal pages. No auth here — callers must already have validated
// the trade member session.

export type TradeCatalogEntry = {
  skuId: string;
  code: string;
  slug: string;
  name: string;
  category: string;
  finish: string;
  retailPrice: number | null;
  tradePrice: number | null;
  buildPacketOutputId: string | null;
  buildPacketGeneratedAt: Date | null;
};

function applyDiscount(retail: number | null, pct: number): number | null {
  if (retail === null) return null;
  return Math.round(retail * (1 - pct / 100) * 100) / 100;
}

/**
 * Returns every active SKU enriched with the latest BUILD_PACKET output
 * (if any) and the trade price computed from `retailPrice * (1 - pct/100)`.
 */
export async function listTradeCatalog(tradeDiscountPct: number): Promise<TradeCatalogEntry[]> {
  const skus = await prisma.sku.findMany({
    where: { status: RecordStatus.ACTIVE },
    orderBy: [{ category: "asc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      slug: true,
      name: true,
      category: true,
      finish: true,
      retailPrice: true,
    },
  });

  const skuIds = skus.map((s) => s.id);

  // Find the latest GENERATED/APPROVED BUILD_PACKET per SKU in one query.
  const packets = await prisma.generatedOutput.findMany({
    where: {
      skuId: { in: skuIds },
      outputType: OutputType.BUILD_PACKET,
      status: { in: [OutputStatus.GENERATED, OutputStatus.APPROVED] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, skuId: true, createdAt: true },
  });

  const latestBySku = new Map<string, { id: string; createdAt: Date }>();
  for (const p of packets) {
    if (!latestBySku.has(p.skuId)) {
      latestBySku.set(p.skuId, { id: p.id, createdAt: p.createdAt });
    }
  }

  return skus.map((s) => {
    const packet = latestBySku.get(s.id);
    const retail = s.retailPrice ? Number(s.retailPrice) : null;
    return {
      skuId: s.id,
      code: s.code,
      slug: s.slug,
      name: s.name,
      category: s.category,
      finish: s.finish,
      retailPrice: retail,
      tradePrice: applyDiscount(retail, tradeDiscountPct),
      buildPacketOutputId: packet?.id ?? null,
      buildPacketGeneratedAt: packet?.createdAt ?? null,
    };
  });
}

export async function findLatestBuildPacketForSku(skuCode: string): Promise<string | null> {
  const sku = await prisma.sku.findUnique({
    where: { code: skuCode },
    select: { id: true },
  });
  if (!sku) return null;
  const packet = await prisma.generatedOutput.findFirst({
    where: {
      skuId: sku.id,
      outputType: OutputType.BUILD_PACKET,
      status: { in: [OutputStatus.GENERATED, OutputStatus.APPROVED] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return packet?.id ?? null;
}
