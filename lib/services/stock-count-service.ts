import { AuditAction, AuditEntityType } from "@prisma/client";

import type { ActionActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

import { createAuditLog } from "./audit-service";
import { adjustStock } from "./inventory-service";

// ── List Counts ─────────────────────────────────────────────

export async function listStockCounts() {
  return prisma.stockCount.findMany({
    include: { _count: { select: { lines: true } } },
    orderBy: { startedAt: "desc" },
  });
}

// ── Get Single Count ────────────────────────────────────────

export async function getStockCount(id: string) {
  return prisma.stockCount.findUnique({
    where: { id },
    include: {
      lines: { orderBy: [{ countedQty: "asc" }, { itemName: "asc" }] },
    },
  });
}

// ── Start Count ─────────────────────────────────────────────

export async function startStockCount(
  scope: string,
  category: string | undefined,
  actor: ActionActor,
) {
  const where: Record<string, unknown> = { isActive: true };

  if (scope === "FINISHED_PRODUCT") where.type = "FINISHED_PRODUCT";
  if (scope === "RAW_MATERIAL") where.type = "RAW_MATERIAL";
  if (scope === "CATEGORY" && category) where.category = category;

  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: { name: "asc" },
    select: { id: true, name: true, sku: true, qtyOnHand: true },
  });

  if (items.length === 0) throw new Error("No items found for the selected scope");

  const count = await prisma.stockCount.create({
    data: {
      scope,
      startedBy: actor.id,
      lines: {
        create: items.map((item) => ({
          itemId: item.id,
          itemName: item.name,
          itemSku: item.sku,
          systemQty: item.qtyOnHand,
        })),
      },
    },
    include: { lines: true },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.STOCK_COUNT,
    entityId: count.id,
    action: AuditAction.CREATE,
    summary: `Started stock count (${scope}) with ${items.length} items.`,
  });

  return count;
}

// ── Update Count Line ───────────────────────────────────────

export async function updateCountLine(lineId: string, countedQty: number) {
  const line = await prisma.stockCountLine.findUnique({ where: { id: lineId } });
  if (!line) throw new Error("Count line not found");

  return prisma.stockCountLine.update({
    where: { id: lineId },
    data: {
      countedQty,
      variance: countedQty - line.systemQty,
    },
  });
}

// ── Commit Count ────────────────────────────────────────────

export async function commitStockCount(id: string, actor: ActionActor) {
  const count = await prisma.stockCount.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!count) throw new Error("Count not found");
  if (count.status !== "IN_PROGRESS") throw new Error("Count is not in progress");

  let itemsOver = 0;
  let itemsShort = 0;
  let itemsMatch = 0;

  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  for (const line of count.lines) {
    if (line.countedQty === null) continue;

    const variance = line.countedQty - line.systemQty;
    if (Math.abs(variance) < 0.001) {
      itemsMatch++;
      continue;
    }

    if (variance > 0) itemsOver++;
    else itemsShort++;

    await adjustStock(
      line.itemId,
      {
        qtyChange: variance,
        reason: `Cycle count — ${dateStr}`,
        referenceType: "COUNT",
        referenceId: count.id,
      },
      actor,
    );
  }

  await prisma.stockCount.update({
    where: { id },
    data: { status: "COMMITTED", committedAt: new Date() },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.STOCK_COUNT,
    entityId: id,
    action: AuditAction.UPDATE,
    summary: `Committed stock count: ${itemsOver} over, ${itemsShort} short, ${itemsMatch} matched.`,
  });

  return { itemsOver, itemsShort, itemsMatch };
}

// ── Cancel Count ────────────────────────────────────────────

export async function cancelStockCount(id: string) {
  return prisma.stockCount.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
}
