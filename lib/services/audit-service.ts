import {
  AuditAction,
  AuditEntityType,
  UserRole,
  type Prisma,
} from "@prisma/client";

import type { ActionActor } from "@/lib/auth/session";

import { prisma } from "../db";

type FlatRecord = Record<string, unknown>;

function normalizeValue(value: unknown) {
  return value === undefined ? null : value;
}

function isSameValue(left: unknown, right: unknown) {
  return JSON.stringify(normalizeValue(left)) === JSON.stringify(normalizeValue(right));
}

export function buildChangedFields(
  before: FlatRecord,
  after: FlatRecord,
  trackedKeys = Object.keys(after),
) {
  const changedFields: Record<string, { from: unknown; to: unknown }> = {};

  trackedKeys.forEach((key) => {
    if (!isSameValue(before[key], after[key])) {
      changedFields[key] = {
        from: normalizeValue(before[key]),
        to: normalizeValue(after[key]),
      };
    }
  });

  return changedFields;
}

export function summarizeAuditChange(
  label: string,
  action: AuditAction,
  changedFields: Record<string, { from: unknown; to: unknown }>,
) {
  if (action === "EXPORT_MARKDOWN") {
    return `Exported markdown for ${label}.`;
  }

  if (action === "EXPORT_PDF") {
    return `Exported PDF for ${label}.`;
  }

  if (action === "VIEW_PRINT") {
    return `Viewed print layout for ${label}.`;
  }

  if (action === "CREATE") {
    return `Created ${label}.`;
  }

  const changedKeys = Object.keys(changedFields);

  if (action === "ARCHIVE") {
    return changedKeys.length > 0
      ? `Archived ${label}; changed ${changedKeys.join(", ")}.`
      : `Archived ${label}.`;
  }

  return changedKeys.length > 0
    ? `Updated ${label}; changed ${changedKeys.join(", ")}.`
    : `Updated ${label} with no field delta.`;
}

export async function createAuditLog(input: {
  actor: ActionActor;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  summary: string;
  changedFields?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actor.id,
      actorName: input.actor.displayName,
      actorRole: input.actor.role === "ADMIN" ? UserRole.ADMIN : UserRole.USER,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      summary: input.summary,
      changedFields: input.changedFields,
    },
  });
}

export async function logGeneratedOutputEvent(input: {
  actor: ActionActor;
  outputId: string;
  action: "EXPORT_MARKDOWN" | "EXPORT_PDF" | "VIEW_PRINT";
}) {
  const output = await prisma.generatedOutput.findUnique({
    where: {
      id: input.outputId,
    },
    select: {
      id: true,
      title: true,
      outputType: true,
      sku: {
        select: {
          code: true,
        },
      },
    },
  });

  if (!output) {
    return;
  }

  await createAuditLog({
    actor: input.actor,
    entityType: AuditEntityType.GENERATED_OUTPUT,
    entityId: output.id,
    action: input.action,
    summary: summarizeAuditChange(`${output.sku.code} ${output.title}`, input.action, {}),
    changedFields: {
      outputId: output.id,
      outputType: output.outputType,
      exportAction: input.action,
      skuCode: output.sku.code,
    } satisfies Prisma.InputJsonValue,
  });
}
