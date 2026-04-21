import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/app-shell/page-header";
import { NewOrderForm } from "@/components/orders/new-order-form";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  await requireSession();

  // Fetch contacts and inventory items for selection
  const [contacts, inventoryItems] = await Promise.all([
    prisma.contact.findMany({
      select: {
        id: true,
        name: true,
        company: true,
        email: true,
        address: true,
        city: true,
        state: true,
        zip: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryItem.findMany({
      where: { isActive: true, type: "FINISHED_PRODUCT" },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        imageUrl: true,
        costPerUnit: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Orders"
        title="New Order"
        description="Create a new order manually"
      />
      <NewOrderForm contacts={contacts} inventoryItems={inventoryItems} />
    </div>
  );
}
