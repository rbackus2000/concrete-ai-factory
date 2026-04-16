"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/services/audit-service";

export async function approveOutputAction(outputId: string) {
  const session = await requireSession();
  const output = await prisma.generatedOutput.update({
    where: { id: outputId },
    data: { status: "APPROVED" },
  });

  await createAuditLog({
    actor: session,
    entityType: AuditEntityType.GENERATED_OUTPUT,
    entityId: output.id,
    action: AuditAction.UPDATE,
    summary: `Approved output "${output.title}"`,
  });

  revalidatePath("/outputs");
  revalidatePath(`/outputs/${outputId}`);
  return { success: true };
}

export async function rejectOutputAction(outputId: string) {
  const session = await requireSession();
  const output = await prisma.generatedOutput.update({
    where: { id: outputId },
    data: { status: "REJECTED" },
  });

  await createAuditLog({
    actor: session,
    entityType: AuditEntityType.GENERATED_OUTPUT,
    entityId: output.id,
    action: AuditAction.UPDATE,
    summary: `Rejected output "${output.title}"`,
  });

  revalidatePath("/outputs");
  revalidatePath(`/outputs/${outputId}`);
  return { success: true };
}
