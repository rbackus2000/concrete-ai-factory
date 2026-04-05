import { prisma } from "@/lib/db";
import { EquipmentTracker } from "./equipment-tracker";

export const dynamic = "force-dynamic";

export default async function EquipmentPage() {
  const categories = await prisma.equipmentCategory.findMany({
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  const budgets = await prisma.equipmentBudget.findMany();

  // Serialize Date fields to strings for client component
  const serializedCategories = categories.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    items: c.items.map((i) => ({
      ...i,
      purchaseDate: i.purchaseDate?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })),
  }));

  const serializedBudgets = budgets.map((b) => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));

  return <EquipmentTracker categories={serializedCategories} budgets={serializedBudgets} />;
}
