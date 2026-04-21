import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { LabelGeneratorClient } from "@/components/inventory/label-generator-client";

export default async function BarcodeLabelPage() {
  await requireSession();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="inventory-labels"
          eyebrow="Operations"
          title="Barcode Labels"
          description="Generate and print barcode labels for inventory items. Sized for Avery 5160 sheets (30 labels per page)."
        />
        <Link href="/inventory">
          <Button variant="outline">Back to Inventory</Button>
        </Link>
      </div>
      <LabelGeneratorClient />
    </div>
  );
}
