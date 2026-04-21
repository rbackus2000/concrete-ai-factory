import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { listInventoryItems } from "@/lib/services/inventory-service";
import { POForm } from "@/components/inventory/po-form";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage() {
  await requireSession();

  // Load raw materials for the item picker
  const rawItems = await listInventoryItems({ type: "RAW_MATERIAL" });

  const serialized = rawItems.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
    costPerUnit: item.costPerUnit,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="purchase-orders-new"
          eyebrow="Operations"
          title="New Purchase Order"
          description="Create a purchase order for raw materials from a vendor."
        />
        <Link href="/purchase-orders">
          <Button variant="outline">Back to Purchase Orders</Button>
        </Link>
      </div>
      <POForm rawItems={serialized} />
    </div>
  );
}
