import { AuditAction, AuditEntityType } from "@prisma/client";
import type { ActionActor } from "@/lib/auth/session";
import { prisma } from "../db";
import { createAuditLog } from "./audit-service";
import { clientAdminSchema, type ClientAdminValues } from "../schemas/client";

export async function listClients() {
  return prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { jobs: true, slatWallProjects: true } } },
  });
}

export async function getClientById(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      jobs: { take: 10, orderBy: { createdAt: "desc" }, include: { sku: { select: { code: true, name: true } } } },
      slatWallProjects: { take: 10, orderBy: { createdAt: "desc" } },
    },
  });
}

export async function createClient(values: ClientAdminValues, actor: ActionActor) {
  const parsed = clientAdminSchema.parse(values);
  const client = await prisma.client.create({
    data: {
      name: parsed.name,
      company: parsed.company || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      address: parsed.address || null,
      notes: parsed.notes || null,
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.CLIENT,
    entityId: client.id,
    action: AuditAction.CREATE,
    summary: `Created client ${parsed.name}${parsed.company ? ` (${parsed.company})` : ""}`,
  });

  return client;
}

export async function updateClient(id: string, values: ClientAdminValues, actor: ActionActor) {
  const parsed = clientAdminSchema.parse(values);
  const client = await prisma.client.update({
    where: { id },
    data: {
      name: parsed.name,
      company: parsed.company || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      address: parsed.address || null,
      notes: parsed.notes || null,
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.CLIENT,
    entityId: client.id,
    action: AuditAction.UPDATE,
    summary: `Updated client ${parsed.name}`,
  });

  return client;
}
