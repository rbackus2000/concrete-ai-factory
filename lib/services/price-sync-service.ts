import { AuditAction, AuditEntityType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { scrapeShopifyProductPrice } from "@/lib/engines/price-scraper-engine";
import {
  createAuditLog,
  summarizeAuditChange,
  buildChangedFields,
} from "./audit-service";
import type { ActionActor } from "@/lib/auth/session";

export type PriceSyncResult = {
  materialId: string;
  materialCode: string;
  materialName: string;
  success: boolean;
  productTitle?: string;
  tiersFound: number;
  priceChanged: boolean;
  previousUnitCost: number | null;
  newUnitCost: number | null;
  error?: string;
};

/**
 * Scrape and update pricing for a single material.
 * Updates pricingTiers, lastPricedAt, and unitCost (from first available variant).
 */
export async function syncMaterialPrice(
  materialId: string,
  actor: ActionActor,
): Promise<PriceSyncResult> {
  const material = await prisma.materialsMaster.findUnique({ where: { id: materialId } });
  if (!material) throw new Error(`Material ${materialId} not found.`);
  if (!material.supplierProductUrl) {
    return {
      materialId,
      materialCode: material.code,
      materialName: material.name,
      success: false,
      tiersFound: 0,
      priceChanged: false,
      previousUnitCost: material.unitCost?.toNumber() ?? null,
      newUnitCost: null,
      error: "No supplier product URL configured.",
    };
  }

  try {
    const result = await scrapeShopifyProductPrice(material.supplierProductUrl);
    const firstAvailable = result.priceTiers.find((t) => t.available) ?? result.priceTiers[0];
    const newPrice = firstAvailable?.price ?? null;
    const previousPrice = material.unitCost?.toNumber() ?? null;
    const priceChanged = newPrice !== null && newPrice !== previousPrice;

    await prisma.materialsMaster.update({
      where: { id: materialId },
      data: {
        pricingTiers: result.priceTiers as unknown as Prisma.InputJsonValue,
        lastPricedAt: new Date(),
        ...(priceChanged && newPrice !== null ? { unitCost: newPrice } : {}),
      },
    });

    if (priceChanged) {
      const changedFields = buildChangedFields(
        { unitCost: previousPrice },
        { unitCost: newPrice },
      );
      await createAuditLog({
        actor,
        entityType: AuditEntityType.MATERIALS_MASTER,
        entityId: materialId,
        action: AuditAction.UPDATE,
        summary: `Price sync: ${material.code} — $${previousPrice?.toFixed(2) ?? "?"} → $${newPrice?.toFixed(2) ?? "?"}`,
        changedFields: changedFields as Prisma.InputJsonValue,
      });
    }

    return {
      materialId,
      materialCode: material.code,
      materialName: material.name,
      success: true,
      productTitle: result.productTitle,
      tiersFound: result.priceTiers.length,
      priceChanged,
      previousUnitCost: previousPrice,
      newUnitCost: newPrice,
    };
  } catch (e) {
    return {
      materialId,
      materialCode: material.code,
      materialName: material.name,
      success: false,
      tiersFound: 0,
      priceChanged: false,
      previousUnitCost: material.unitCost?.toNumber() ?? null,
      newUnitCost: null,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * Sync prices for ALL materials that have a supplierProductUrl set.
 * Adds a 1-second delay between requests to be polite to Shopify.
 */
export async function syncAllMaterialPrices(actor: ActionActor): Promise<PriceSyncResult[]> {
  const materials = await prisma.materialsMaster.findMany({
    where: {
      supplierProductUrl: { not: null },
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const results: PriceSyncResult[] = [];

  for (const material of materials) {
    const result = await syncMaterialPrice(material.id, actor);
    results.push(result);

    // Polite delay between requests
    if (materials.indexOf(material) < materials.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return results;
}
