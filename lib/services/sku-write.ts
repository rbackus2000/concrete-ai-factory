import { AuditAction, AuditEntityType, type Prisma } from "@prisma/client";

import type { ActionActor } from "@/lib/auth/session";

import { prisma } from "../db";
import { buildChangedFields, createAuditLog, summarizeAuditChange } from "./audit-service";
import { mapSkuRecord } from "./service-helpers";

export async function createSku(data: Prisma.SkuCreateInput, actor?: ActionActor) {
  const sku = await prisma.sku.create({ data });

  if (actor) {
    const changedFields = buildChangedFields(
      {},
      {
        code: sku.code,
        name: sku.name,
        status: sku.status,
        category: sku.category,
      },
    );

    await createAuditLog({
      actor,
      entityType: AuditEntityType.SKU,
      entityId: sku.id,
      action: AuditAction.CREATE,
      summary: summarizeAuditChange(`${sku.code} SKU`, AuditAction.CREATE, changedFields),
      changedFields: changedFields as Prisma.InputJsonValue,
    });
  }

  return mapSkuRecord(sku);
}

export async function updateSku(code: string, data: Prisma.SkuUpdateInput) {
  const sku = await prisma.sku.update({
    where: { code },
    data,
  });

  return mapSkuRecord(sku);
}
