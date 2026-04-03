import { prisma } from "../db";
import { auditLogFilterSchema, auditActionValues, auditEntityTypeValues } from "../schemas/audit";

export async function getAuditLogWorkspace(rawFilters: {
  actorId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
}) {
  const filters = auditLogFilterSchema.parse(rawFilters);

  const [logs, actors] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        actorId: filters.actorId || undefined,
        entityType: filters.entityType || undefined,
        entityId: filters.entityId || undefined,
        action: filters.action || undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    }),
    prisma.auditLog.findMany({
      select: {
        actorId: true,
        actorName: true,
      },
      distinct: ["actorId"],
      orderBy: {
        actorId: "asc",
      },
    }),
  ]);

  return {
    filters,
    actors: actors.map((actor) => ({
      id: actor.actorId,
      name: actor.actorName,
    })),
    actions: auditActionValues,
    entityTypes: auditEntityTypeValues,
    logs: logs.map((log) => ({
      id: log.id,
      actorId: log.actorId,
      actorName: log.actorName,
      actorRole: log.actorRole,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      summary: log.summary,
      changedFieldsJson: JSON.stringify(log.changedFields ?? null, null, 2),
      createdAt: log.createdAt.toISOString(),
    })),
  };
}
