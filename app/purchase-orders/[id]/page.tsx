import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { getPurchaseOrder } from "@/lib/services/purchase-order-service";
import { POStatusBadge } from "@/components/inventory/po-status-badge";
import { PODetailClient } from "@/components/inventory/po-detail-client";
import type { POStatusType } from "@/lib/schemas/inventory";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const po = await getPurchaseOrder(id);

  if (!po) notFound();

  const serialized = {
    ...po,
    expectedDelivery: po.expectedDelivery?.toISOString() ?? null,
    receivedAt: po.receivedAt?.toISOString() ?? null,
    createdAt: po.createdAt.toISOString(),
    updatedAt: po.updatedAt.toISOString(),
    items: po.items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    events: po.events.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="purchase-orders-detail"
          eyebrow="Operations"
          title={po.poNumber}
          description={`Vendor: ${po.vendor}`}
        />
        <div className="flex items-center gap-3">
          <POStatusBadge status={po.status as POStatusType} />
          <Link href="/purchase-orders">
            <Button variant="outline">Back to POs</Button>
          </Link>
        </div>
      </div>
      <PODetailClient po={serialized} />
    </div>
  );
}
