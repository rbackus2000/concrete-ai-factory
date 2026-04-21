import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { InventoryItemForm } from "@/components/inventory/inventory-item-form";

export default async function NewInventoryItemPage() {
  await requireSession();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="inventory-new"
          eyebrow="Inventory"
          title="Add Item"
          description="Add a new finished product or raw material to inventory."
        />
        <Link href="/inventory">
          <Button variant="outline">Back to Inventory</Button>
        </Link>
      </div>
      <InventoryItemForm />
    </div>
  );
}
