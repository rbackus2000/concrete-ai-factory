import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { getInventoryItem } from "@/lib/services/inventory-service";
import { InventoryItemForm } from "@/components/inventory/inventory-item-form";
import type { InventoryTypeValue } from "@/lib/schemas/inventory";

export default async function EditInventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const item = await getInventoryItem(id);

  if (!item) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Inventory"
          title={`Edit ${item.name}`}
          description="Update item details and stock settings."
        />
        <Link href={`/inventory/${item.id}`}>
          <Button variant="outline">Back to Item</Button>
        </Link>
      </div>
      <InventoryItemForm
        initial={{
          id: item.id,
          type: item.type as InventoryTypeValue,
          name: item.name,
          sku: item.sku ?? "",
          description: item.description ?? "",
          category: item.category ?? "",
          imageUrl: item.imageUrl ?? "",
          skuId: item.skuId ?? undefined,
          unit: item.unit ?? "",
          vendor: item.vendor ?? "",
          vendorSku: item.vendorSku ?? "",
          costPerUnit: item.costPerUnit,
          qtyOnHand: item.qtyOnHand,
          reorderPoint: item.reorderPoint,
          reorderQty: item.reorderQty,
        }}
      />
    </div>
  );
}
