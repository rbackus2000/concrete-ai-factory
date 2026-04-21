import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { CycleCountStarter } from "@/components/inventory/cycle-count-starter";

export default async function CycleCountPage() {
  await requireSession();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="inventory-count"
          eyebrow="Operations"
          title="Cycle Count"
          description="Count physical stock and reconcile with system quantities."
        />
        <Link href="/inventory">
          <Button variant="outline">Back to Inventory</Button>
        </Link>
      </div>
      <CycleCountStarter />
    </div>
  );
}
