import { AuditAction, AuditEntityType, type JobStatus } from "@prisma/client";
import type { ActionActor } from "@/lib/auth/session";
import { prisma } from "../db";
import { createAuditLog } from "./audit-service";
import { jobCreateSchema, type JobCreateValues } from "../schemas/job";
import { jobStatusValues } from "../schemas/domain";

async function generateJobNumber() {
  const year = new Date().getFullYear();
  const prefix = `JOB-${year}-`;
  const latest = await prisma.job.findFirst({
    where: { jobNumber: { startsWith: prefix } },
    orderBy: { jobNumber: "desc" },
  });
  const seq = latest ? parseInt(latest.jobNumber.replace(prefix, ""), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

export async function listJobs(filters?: { status?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;

  return prisma.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      sku: { select: { code: true, name: true, category: true } },
      client: { select: { id: true, name: true, company: true } },
    },
  });
}

export async function getJobDetail(id: string) {
  return prisma.job.findUnique({
    where: { id },
    include: {
      sku: { select: { code: true, name: true, category: true, finish: true } },
      client: { select: { id: true, name: true, company: true, email: true, phone: true } },
    },
  });
}

export async function createJob(values: JobCreateValues, actor: ActionActor) {
  const parsed = jobCreateSchema.parse(values);
  const sku = await prisma.sku.findUnique({ where: { code: parsed.skuCode } });
  if (!sku) throw new Error(`SKU ${parsed.skuCode} not found.`);

  const jobNumber = await generateJobNumber();
  const job = await prisma.job.create({
    data: {
      jobNumber,
      skuId: sku.id,
      clientId: parsed.clientId || null,
      quantity: parsed.quantity,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      notes: parsed.notes || null,
      retailPriceTotal: parsed.retailPriceTotal || null,
      wholesalePriceTotal: parsed.wholesalePriceTotal || null,
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.JOB,
    entityId: job.id,
    action: AuditAction.CREATE,
    summary: `Created job ${jobNumber} — ${parsed.skuCode} x${parsed.quantity}`,
  });

  return job;
}

export async function updateJobStatus(id: string, nextStatus: JobStatus, actor: ActionActor) {
  const job = await prisma.job.update({
    where: { id },
    data: { status: nextStatus },
    include: { sku: { select: { code: true } } },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.JOB,
    entityId: job.id,
    action: AuditAction.UPDATE,
    summary: `Job ${job.jobNumber} status → ${nextStatus}`,
  });

  return job;
}

export async function getJobsByStatus() {
  const jobs = await prisma.job.findMany({
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      sku: { select: { code: true, name: true, category: true } },
      client: { select: { id: true, name: true, company: true } },
    },
  });

  const grouped: Record<string, typeof jobs> = {};
  for (const status of jobStatusValues) {
    grouped[status] = [];
  }
  for (const job of jobs) {
    grouped[job.status]!.push(job);
  }
  return grouped;
}

export async function getJobPipelineSummary() {
  const counts = await prisma.job.groupBy({ by: ["status"], _count: true });
  const pipeline: Record<string, number> = {};
  for (const status of jobStatusValues) {
    pipeline[status] = 0;
  }
  for (const row of counts) {
    pipeline[row.status] = row._count;
  }
  return pipeline;
}
