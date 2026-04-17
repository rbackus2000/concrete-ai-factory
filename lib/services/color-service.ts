import { AuditAction, AuditEntityType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  colorCollectionAdminSchema,
  productColorAdminSchema,
  type ColorCollectionAdminValues,
  type ProductColorAdminValues,
} from "@/lib/schemas/color";
import { parseOptionalString } from "@/lib/schemas/admin";
import {
  createAuditLog,
  summarizeAuditChange,
  buildChangedFields,
} from "./audit-service";
import type { ActionActor } from "@/lib/auth/session";

function determineAuditAction(nextStatus: string, previousStatus?: string) {
  if (nextStatus === "ARCHIVED" && previousStatus !== "ARCHIVED") return AuditAction.ARCHIVE;
  if (!previousStatus) return AuditAction.CREATE;
  return AuditAction.UPDATE;
}

// ── Color Collections ─────────────────────────────────────────

export async function listColorCollections() {
  const rows = await prisma.colorCollection.findMany({
    include: {
      colors: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    status: row.status,
    colors: row.colors.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      hexApprox: c.hexApprox,
      pigmentFormula: c.pigmentFormula,
      sortOrder: c.sortOrder,
      status: c.status,
    })),
  }));
}

export async function getColorCollectionEditor(id?: string) {
  if (!id) return { record: null };
  const record = await prisma.colorCollection.findUnique({ where: { id } });
  if (!record) return { record: null };
  return {
    record: {
      id: record.id,
      code: record.code,
      name: record.name,
      description: record.description ?? "",
      sortOrder: record.sortOrder,
      status: record.status,
    },
  };
}

export async function createColorCollection(values: ColorCollectionAdminValues, actor: ActionActor) {
  const parsed = colorCollectionAdminSchema.parse(values);
  const created = await prisma.colorCollection.create({
    data: {
      code: parsed.code,
      name: parsed.name,
      description: parseOptionalString(parsed.description),
      sortOrder: parsed.sortOrder,
      status: parsed.status,
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.COLOR_COLLECTION,
    entityId: created.id,
    action: AuditAction.CREATE,
    summary: summarizeAuditChange("color collection", AuditAction.CREATE, {}),
    changedFields: buildChangedFields({}, { code: parsed.code, name: parsed.name }) as Prisma.InputJsonValue,
  });

  return { id: created.id };
}

export async function updateColorCollection(id: string, values: ColorCollectionAdminValues, actor: ActionActor) {
  const parsed = colorCollectionAdminSchema.parse(values);
  const existing = await prisma.colorCollection.findUnique({ where: { id } });
  if (!existing) throw new Error("Color collection not found.");

  const updated = await prisma.colorCollection.update({
    where: { id },
    data: {
      code: parsed.code,
      name: parsed.name,
      description: parseOptionalString(parsed.description),
      sortOrder: parsed.sortOrder,
      status: parsed.status,
    },
  });

  const changedFields = buildChangedFields(
    { code: existing.code, name: existing.name, status: existing.status },
    { code: parsed.code, name: parsed.name, status: parsed.status },
  );
  const action = determineAuditAction(parsed.status, existing.status);

  await createAuditLog({
    actor,
    entityType: AuditEntityType.COLOR_COLLECTION,
    entityId: updated.id,
    action,
    summary: summarizeAuditChange("color collection", action, changedFields),
    changedFields: changedFields as Prisma.InputJsonValue,
  });

  return { id: updated.id };
}

// ── Product Colors ────────────────────────────────────────────

export async function getProductColorEditor(id?: string) {
  const collectionOptions = await prisma.colorCollection.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, code: true, name: true },
    orderBy: { sortOrder: "asc" },
  });

  const record = id ? await prisma.productColor.findUnique({ where: { id } }) : null;

  return {
    collectionOptions: collectionOptions.map((c) => ({
      id: c.id,
      label: `${c.code} · ${c.name}`,
    })),
    record: record
      ? {
          id: record.id,
          collectionId: record.collectionId,
          code: record.code,
          name: record.name,
          hexApprox: record.hexApprox,
          pigmentFormula: record.pigmentFormula ?? "",
          sortOrder: record.sortOrder,
          status: record.status,
          notes: record.notes ?? "",
        }
      : null,
  };
}

export async function createProductColor(values: ProductColorAdminValues, actor: ActionActor) {
  const parsed = productColorAdminSchema.parse(values);
  const created = await prisma.productColor.create({
    data: {
      collectionId: parsed.collectionId,
      code: parsed.code,
      name: parsed.name,
      hexApprox: parsed.hexApprox,
      pigmentFormula: parseOptionalString(parsed.pigmentFormula),
      sortOrder: parsed.sortOrder,
      status: parsed.status,
      notes: parseOptionalString(parsed.notes),
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.PRODUCT_COLOR,
    entityId: created.id,
    action: AuditAction.CREATE,
    summary: summarizeAuditChange("product color", AuditAction.CREATE, {}),
    changedFields: buildChangedFields({}, { code: parsed.code, name: parsed.name }) as Prisma.InputJsonValue,
  });

  return { id: created.id };
}

export async function updateProductColor(id: string, values: ProductColorAdminValues, actor: ActionActor) {
  const parsed = productColorAdminSchema.parse(values);
  const existing = await prisma.productColor.findUnique({ where: { id } });
  if (!existing) throw new Error("Product color not found.");

  const updated = await prisma.productColor.update({
    where: { id },
    data: {
      collectionId: parsed.collectionId,
      code: parsed.code,
      name: parsed.name,
      hexApprox: parsed.hexApprox,
      pigmentFormula: parseOptionalString(parsed.pigmentFormula),
      sortOrder: parsed.sortOrder,
      status: parsed.status,
      notes: parseOptionalString(parsed.notes),
    },
  });

  const changedFields = buildChangedFields(
    { code: existing.code, name: existing.name, hexApprox: existing.hexApprox, status: existing.status },
    { code: parsed.code, name: parsed.name, hexApprox: parsed.hexApprox, status: parsed.status },
  );
  const action = determineAuditAction(parsed.status, existing.status);

  await createAuditLog({
    actor,
    entityType: AuditEntityType.PRODUCT_COLOR,
    entityId: updated.id,
    action,
    summary: summarizeAuditChange("product color", action, changedFields),
    changedFields: changedFields as Prisma.InputJsonValue,
  });

  return { id: updated.id };
}
