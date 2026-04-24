import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.promptTemplate.findMany({
    where: { outputType: "IMAGE_RENDER" },
    orderBy: [{ skuCategory: "asc" }, { key: "asc" }],
    select: { key: true, skuCategory: true, status: true },
  });

  console.log(`${rows.length} IMAGE_RENDER templates on this DB:`);
  for (const r of rows) console.log(`  [${r.skuCategory ?? "—"}] ${r.key} (${r.status})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
