/** Read-only VPS DB check: list P%- SKUs and their status. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const skus = await prisma.sku.findMany({
    where: { code: { startsWith: "P" } },
    orderBy: { code: "asc" },
    select: { code: true, name: true, status: true, retailPrice: true },
  });

  console.log(`Found ${skus.length} panel SKUs:`);
  for (const s of skus) {
    console.log(`  ${s.code} — ${s.name} (${s.status}) retail=${s.retailPrice}`);
  }
}

main()
  .catch((err) => {
    console.error("failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
