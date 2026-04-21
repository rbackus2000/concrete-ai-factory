import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { getInventoryItem } from "@/lib/services/inventory-service";
import { InventoryDetailClient } from "@/components/inventory/inventory-detail-client";

export const dynamic = "force-dynamic";

export default async function InventoryItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const item = await getInventoryItem(id);

  if (!item) notFound();

  const serialized = {
    ...item,
    movements: item.movements.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
    purchaseOrderItems: item.purchaseOrderItems.map((poi) => ({
      ...poi,
      po: { ...poi.po },
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Inventory"
          title={item.name}
          description={[item.sku, item.vendor, item.category].filter(Boolean).join(" — ")}
        />
        <Link href="/inventory">
          <Button variant="outline">Back to Inventory</Button>
        </Link>
      </div>
      <InventoryDetailClient item={serialized} />
    </div>
  );
}
