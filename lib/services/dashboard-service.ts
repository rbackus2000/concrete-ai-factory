import { prisma } from "../db";
import { mapSkuRecord } from "./service-helpers";

export async function getDashboardSummary() {
  const [
    skuCount,
    promptTemplateCount,
    packetSectionCount,
    outputCount,
    imageCount,
    slatWallProjectCount,
    jobCounts,
    featuredSku,
    recentOutputs,
  ] = await Promise.all([
    prisma.sku.count(),
    prisma.promptTemplate.count({ where: { status: "ACTIVE" } }),
    prisma.buildPacketTemplate.count({ where: { status: "ACTIVE" } }),
    prisma.generatedOutput.count(),
    prisma.generatedImageAsset.count({ where: { status: "GENERATED" } }),
    prisma.slatWallProject.count(),
    prisma.job.groupBy({ by: ["status"], _count: true }),
    prisma.sku.findFirst({ where: { status: "ACTIVE" }, orderBy: { code: "asc" } }),
    prisma.generatedOutput.findMany({
      include: {
        sku: { select: { code: true, name: true } },
        imageAssets: { take: 1, orderBy: { createdAt: "desc" }, select: { imageUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const mappedFeaturedSku = featuredSku ? mapSkuRecord(featuredSku) : null;

  const activeJobCount = jobCounts
    .filter((j) => ["QUOTED", "IN_PRODUCTION", "QC", "READY"].includes(j.status))
    .reduce((sum, j) => sum + j._count, 0);

  const jobPipeline: Record<string, number> = {};
  for (const row of jobCounts) {
    jobPipeline[row.status] = row._count;
  }

  return {
    stats: [
      {
        label: "Active SKUs",
        value: String(skuCount).padStart(2, "0"),
        helper: "Product records across vessel sinks, furniture, and panels.",
      },
      {
        label: "Generated Images",
        value: String(imageCount).padStart(2, "0"),
        helper: "AI-rendered product images stored in the gallery.",
      },
      {
        label: "Active Jobs",
        value: String(activeJobCount).padStart(2, "0"),
        helper: "Jobs currently in the pipeline (quoted through ready).",
      },
      {
        label: "Generated Outputs",
        value: String(outputCount).padStart(2, "0"),
        helper: "Total outputs generated across all engines and SKUs.",
      },
    ],
    featuredSku: mappedFeaturedSku,
    modules: [
      {
        name: "SKU master",
        count: `${skuCount} active`,
        helper: "Product data is served from Prisma-backed SKU rows with normalized geometry fields.",
      },
      {
        name: "Prompt templates",
        count: `${promptTemplateCount} templates`,
        helper: "Prompt templates are filtered through scope-aware Prisma queries.",
      },
      {
        name: "Build packet",
        count: `${packetSectionCount} sections`,
        helper: "Packet templates assembled from real database rows.",
      },
      {
        name: "Slat wall projects",
        count: `${slatWallProjectCount} projects`,
        helper: "Kinetic rotating slat wall installations.",
      },
    ],
    jobPipeline,
    recentOutputs: recentOutputs.map((o) => ({
      id: o.id,
      title: o.title,
      skuCode: o.sku.code,
      skuName: o.sku.name,
      outputType: o.outputType,
      status: o.status,
      imageUrl: o.imageAssets[0]?.imageUrl ?? null,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}
