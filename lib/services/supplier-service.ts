import { AuditAction, AuditEntityType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { supplierAdminSchema, type SupplierAdminValues } from "@/lib/schemas/supplier";
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

export async function listSuppliers() {
  const rows = await prisma.supplier.findMany({
    include: { _count: { select: { materials: true } } },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    website: row.website,
    status: row.status,
    materialCount: row._count.materials,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getSupplierEditor(id?: string) {
  if (!id) return { record: null };

  const record = await prisma.supplier.findUnique({ where: { id } });
  if (!record) return { record: null };

  return {
    record: {
      id: record.id,
      code: record.code,
      name: record.name,
      website: record.website ?? "",
      contactEmail: record.contactEmail ?? "",
      contactPhone: record.contactPhone ?? "",
      notes: record.notes ?? "",
      status: record.status,
    },
  };
}

export async function createSupplier(values: SupplierAdminValues, actor: ActionActor) {
  const parsed = supplierAdminSchema.parse(values);
  const created = await prisma.supplier.create({
    data: {
      code: parsed.code,
      name: parsed.name,
      website: parseOptionalString(parsed.website),
      contactEmail: parseOptionalString(parsed.contactEmail),
      contactPhone: parseOptionalString(parsed.contactPhone),
      notes: parseOptionalString(parsed.notes),
      status: parsed.status,
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.SUPPLIER,
    entityId: created.id,
    action: AuditAction.CREATE,
    summary: summarizeAuditChange("supplier", AuditAction.CREATE, {}),
    changedFields: buildChangedFields({}, {
      code: parsed.code,
      name: parsed.name,
      status: parsed.status,
    }) as Prisma.InputJsonValue,
  });

  return { id: created.id };
}

export async function updateSupplier(id: string, values: SupplierAdminValues, actor: ActionActor) {
  const parsed = supplierAdminSchema.parse(values);
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) throw new Error("Supplier not found.");

  const updated = await prisma.supplier.update({
    where: { id },
    data: {
      code: parsed.code,
      name: parsed.name,
      website: parseOptionalString(parsed.website),
      contactEmail: parseOptionalString(parsed.contactEmail),
      contactPhone: parseOptionalString(parsed.contactPhone),
      notes: parseOptionalString(parsed.notes),
      status: parsed.status,
    },
  });

  const changedFields = buildChangedFields(
    { code: existing.code, name: existing.name, website: existing.website, status: existing.status },
    { code: parsed.code, name: parsed.name, website: parseOptionalString(parsed.website), status: parsed.status },
  );
  const action = determineAuditAction(parsed.status, existing.status);

  await createAuditLog({
    actor,
    entityType: AuditEntityType.SUPPLIER,
    entityId: updated.id,
    action,
    summary: summarizeAuditChange("supplier", action, changedFields),
    changedFields: changedFields as Prisma.InputJsonValue,
  });

  return { id: updated.id };
}
