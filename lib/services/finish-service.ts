import { AuditAction, AuditEntityType } from "@prisma/client";
import type { ActionActor } from "@/lib/auth/session";
import { prisma } from "../db";
import { createAuditLog } from "./audit-service";
import { finishAdminSchema, type FinishAdminValues } from "../schemas/finish";

export async function listFinishes() {
  return prisma.finish.findMany({ orderBy: { code: "asc" } });
}

export async function getFinishById(id: string) {
  return prisma.finish.findUnique({ where: { id } });
}

export async function createFinish(values: FinishAdminValues, actor: ActionActor) {
  const parsed = finishAdminSchema.parse(values);
  const finish = await prisma.finish.create({
    data: {
      code: parsed.code,
      name: parsed.name,
      colorFamily: parsed.colorFamily || null,
      textureType: parsed.textureType || null,
      sealerType: parsed.sealerType || null,
      pigmentFormula: parsed.pigmentFormula || null,
      referenceImageUrl: parsed.referenceImageUrl || null,
      notes: parsed.notes || null,
      status: parsed.status,
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.FINISH,
    entityId: finish.id,
    action: AuditAction.CREATE,
    summary: `Created finish ${parsed.code} — ${parsed.name}`,
  });

  return finish;
}

export async function updateFinish(id: string, values: FinishAdminValues, actor: ActionActor) {
  const parsed = finishAdminSchema.parse(values);
  const finish = await prisma.finish.update({
    where: { id },
    data: {
      code: parsed.code,
      name: parsed.name,
      colorFamily: parsed.colorFamily || null,
      textureType: parsed.textureType || null,
      sealerType: parsed.sealerType || null,
      pigmentFormula: parsed.pigmentFormula || null,
      referenceImageUrl: parsed.referenceImageUrl || null,
      notes: parsed.notes || null,
      status: parsed.status,
    },
  });

  const action = parsed.status === "ARCHIVED" ? AuditAction.ARCHIVE : AuditAction.UPDATE;
  await createAuditLog({
    actor,
    entityType: AuditEntityType.FINISH,
    entityId: finish.id,
    action,
    summary: `${action === AuditAction.ARCHIVE ? "Archived" : "Updated"} finish ${parsed.code}`,
  });

  return finish;
}
