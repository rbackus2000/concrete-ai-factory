import { prisma } from "../db";
import { mapSkuRecord } from "./service-helpers";

export async function getDashboardSummary() {
  const [skuCount, promptTemplateCount, packetSectionCount, featuredSku] =
    await Promise.all([
      prisma.sku.count(),
      prisma.promptTemplate.count({
        where: {
          status: "ACTIVE",
        },
      }),
      prisma.buildPacketTemplate.count({
        where: {
          status: "ACTIVE",
        },
      }),
      prisma.sku.findFirst({
        where: {
          status: "ACTIVE",
        },
        orderBy: {
          code: "asc",
        },
      }),
    ]);

  const mappedFeaturedSku = featuredSku ? mapSkuRecord(featuredSku) : null;

  return {
    stats: [
      {
        label: "Seeded SKUs",
        value: String(skuCount).padStart(2, "0"),
        helper: "Product records now come from Prisma-backed SKU rows.",
      },
      {
        label: "Prompt Templates",
        value: String(promptTemplateCount).padStart(2, "0"),
        helper: "Prompt templates now resolve from Prisma instead of the seed catalog.",
      },
      {
        label: "Packet Sections",
        value: String(packetSectionCount).padStart(2, "0"),
        helper: "Packet sections are pulled from scoped build packet template records.",
      },
      {
        label: "Generators",
        value: "05",
        helper: "Validation, rules, prompt, calculator, and packet engines remain the business-logic layer.",
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
        helper: "Prompt templates are filtered through scope-aware Prisma queries before they reach the UI.",
      },
      {
        name: "Build packet",
        count: `${packetSectionCount} sections`,
        helper: "Packet templates are keyed by packet and section and assembled from real database rows.",
      },
    ],
  };
}
