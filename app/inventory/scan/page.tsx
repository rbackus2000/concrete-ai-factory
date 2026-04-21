import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { BarcodeScanner } from "@/components/inventory/barcode-scanner";

export default async function ScanPage() {
  await requireSession();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="inventory-scan"
          eyebrow="Operations"
          title="Barcode Scanner"
          description="Scan items to view stock levels and adjust quantities."
        />
        <Link href="/inventory">
          <Button variant="outline">Back to Inventory</Button>
        </Link>
      </div>
      <BarcodeScanner />
    </div>
  );
}
