"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/services/service-helpers";

export async function getNextProposalNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RB-${year}-`;

  const latest = await prisma.slatWallProposal.findFirst({
    where: { proposalNumber: { startsWith: prefix } },
    orderBy: { proposalNumber: "desc" },
  });

  let nextNum = 1;
  if (latest) {
    const match = latest.proposalNumber.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

export async function saveProposalAction(data: {
  proposalNumber: string;
  clientName: string;
  projectName: string;
  clientEmail?: string;
  siteAddress?: string;
  scenarioId: string;
  wallSize: string;
  slatCount: number;
  slatWidthIn: number;
  slatHeightFt: number;
  printMethod: string;
  includeInstall: boolean;
  clientPrice: number;
  breakdown: Record<string, unknown>;
}) {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  await prisma.slatWallProposal.create({
    data: {
      proposalNumber: data.proposalNumber,
      clientName: data.clientName,
      projectName: data.projectName,
      clientEmail: data.clientEmail ?? null,
      siteAddress: data.siteAddress ?? null,
      scenarioId: data.scenarioId,
      wallSize: data.wallSize,
      slatCount: data.slatCount,
      slatWidthIn: data.slatWidthIn,
      slatHeightFt: data.slatHeightFt,
      printMethod: data.printMethod,
      includeInstall: data.includeInstall,
      clientPrice: data.clientPrice,
      breakdown: data.breakdown as Prisma.InputJsonValue,
      validUntil,
    },
  });
}

export async function updateProposalStatusAction(proposalId: string, nextStatus: string) {
  const now = new Date();
  const updateData: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === "SENT") updateData.sentAt = now;
  if (nextStatus === "VIEWED") updateData.viewedAt = now;

  await prisma.slatWallProposal.update({
    where: { id: proposalId },
    data: updateData,
  });

  return { success: true };
}

export async function getProposalDetail(id: string) {
  const p = await prisma.slatWallProposal.findUnique({ where: { id } });
  if (!p) return null;

  return {
    id: p.id,
    proposalNumber: p.proposalNumber,
    clientName: p.clientName,
    projectName: p.projectName,
    clientEmail: p.clientEmail,
    siteAddress: p.siteAddress,
    scenarioId: p.scenarioId,
    wallSize: p.wallSize,
    slatCount: p.slatCount,
    slatWidthIn: decimalToNumber(p.slatWidthIn),
    slatHeightFt: decimalToNumber(p.slatHeightFt),
    printMethod: p.printMethod,
    includeInstall: p.includeInstall,
    clientPrice: p.clientPrice,
    breakdown: p.breakdown as Record<string, unknown>,
    status: p.status,
    validUntil: p.validUntil?.toISOString() ?? null,
    sentAt: p.sentAt?.toISOString() ?? null,
    viewedAt: p.viewedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function listProposals() {
  const rows = await prisma.slatWallProposal.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return rows.map((p) => ({
    id: p.id,
    proposalNumber: p.proposalNumber,
    clientName: p.clientName,
    projectName: p.projectName,
    clientEmail: p.clientEmail,
    siteAddress: p.siteAddress,
    scenarioId: p.scenarioId,
    wallSize: p.wallSize,
    slatCount: p.slatCount,
    slatWidthIn: decimalToNumber(p.slatWidthIn),
    slatHeightFt: decimalToNumber(p.slatHeightFt),
    printMethod: p.printMethod,
    includeInstall: p.includeInstall,
    clientPrice: p.clientPrice,
    status: p.status,
    validUntil: p.validUntil?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }));
}
