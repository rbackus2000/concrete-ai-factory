import { AuditAction, AuditEntityType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { laborRateAdminSchema, type LaborRateAdminValues } from "@/lib/schemas/labor-rate";
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

export async function listLaborRates() {
  const rows = await prisma.laborRate.findMany({
    include: { _count: { select: { skus: true } } },
    orderBy: [{ isDefault: "desc" }, { hourlyRate: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    hourlyRate: row.hourlyRate.toNumber(),
    isDefault: row.isDefault,
    skuCount: row._count.skus,
    status: row.status,
  }));
}

export async function getLaborRateEditor(id?: string) {
  if (!id) return { record: null };
  const record = await prisma.laborRate.findUnique({ where: { id } });
  if (!record) return { record: null };
  return {
    record: {
      id: record.id,
      code: record.code,
      name: record.name,
      description: record.description ?? "",
      hourlyRate: record.hourlyRate.toNumber(),
      isDefault: record.isDefault,
      status: record.status,
    },
  };
}

export async function createLaborRate(values: LaborRateAdminValues, actor: ActionActor) {
  const parsed = laborRateAdminSchema.parse(values);

  // If setting as default, clear other defaults
  if (parsed.isDefault) {
    await prisma.laborRate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const created = await prisma.laborRate.create({
    data: {
      code: parsed.code,
      name: parsed.name,
      description: parseOptionalString(parsed.description),
      hourlyRate: parsed.hourlyRate,
      isDefault: parsed.isDefault,
      status: parsed.status,
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.LABOR_RATE,
    entityId: created.id,
    action: AuditAction.CREATE,
    summary: summarizeAuditChange("labor rate", AuditAction.CREATE, {}),
    changedFields: buildChangedFields({}, {
      code: parsed.code, name: parsed.name, hourlyRate: parsed.hourlyRate,
    }) as Prisma.InputJsonValue,
  });

  return { id: created.id };
}

export async function updateLaborRate(id: string, values: LaborRateAdminValues, actor: ActionActor) {
  const parsed = laborRateAdminSchema.parse(values);
  const existing = await prisma.laborRate.findUnique({ where: { id } });
  if (!existing) throw new Error("Labor rate not found.");

  if (parsed.isDefault) {
    await prisma.laborRate.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
  }

  const updated = await prisma.laborRate.update({
    where: { id },
    data: {
      code: parsed.code,
      name: parsed.name,
      description: parseOptionalString(parsed.description),
      hourlyRate: parsed.hourlyRate,
      isDefault: parsed.isDefault,
      status: parsed.status,
    },
  });

  const changedFields = buildChangedFields(
    { code: existing.code, name: existing.name, hourlyRate: existing.hourlyRate.toNumber(), status: existing.status },
    { code: parsed.code, name: parsed.name, hourlyRate: parsed.hourlyRate, status: parsed.status },
  );
  const action = determineAuditAction(parsed.status, existing.status);

  await createAuditLog({
    actor,
    entityType: AuditEntityType.LABOR_RATE,
    entityId: updated.id,
    action,
    summary: summarizeAuditChange("labor rate", action, changedFields),
    changedFields: changedFields as Prisma.InputJsonValue,
  });

  return { id: updated.id };
}

/** Get the default labor rate for calculator auto-population */
export async function getDefaultLaborRate() {
  return prisma.laborRate.findFirst({
    where: { isDefault: true, status: "ACTIVE" },
    select: { id: true, code: true, name: true, hourlyRate: true },
  });
}
