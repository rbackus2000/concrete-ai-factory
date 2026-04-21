import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { getReorderSheet } from "@/lib/services/inventory-service";
import { ReorderReportClient } from "@/components/inventory/reorder-report-client";

export const dynamic = "force-dynamic";

export default async function ReorderPage() {
  await requireSession();
  const vendorGroups = await getReorderSheet();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="inventory-reorder"
          eyebrow="Operations"
          title="Reorder Report"
          description="Raw materials at or below reorder point, grouped by vendor."
        />
        <Link href="/inventory">
          <Button variant="outline">Back to Inventory</Button>
        </Link>
      </div>
      <ReorderReportClient vendorGroups={vendorGroups} />
    </div>
  );
}
