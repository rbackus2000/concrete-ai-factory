import { prisma } from "../db";

export async function getGalleryImages() {
  const assets = await prisma.generatedImageAsset.findMany({
    where: { status: "GENERATED" },
    orderBy: { createdAt: "desc" },
    include: {
      generatedOutput: {
        select: {
          id: true,
          outputType: true,
          title: true,
          sku: { select: { code: true, name: true, category: true } },
        },
      },
    },
    take: 100,
  });

  const grouped: Record<string, {
    category: string;
    images: {
      id: string;
      imageUrl: string;
      skuCode: string;
      skuName: string;
      outputType: string;
      title: string;
      outputId: string;
      createdAt: string;
    }[];
  }> = {};

  for (const asset of assets) {
    if (!asset.imageUrl) continue;
    const category = asset.generatedOutput.sku.category;
    if (!grouped[category]) {
      grouped[category] = { category, images: [] };
    }
    grouped[category].images.push({
      id: asset.id,
      imageUrl: asset.imageUrl,
      skuCode: asset.generatedOutput.sku.code,
      skuName: asset.generatedOutput.sku.name,
      outputType: asset.generatedOutput.outputType,
      title: asset.generatedOutput.title,
      outputId: asset.generatedOutput.id,
      createdAt: asset.createdAt.toISOString(),
    });
  }

  return Object.values(grouped);
}
