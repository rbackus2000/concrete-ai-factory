import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { listOrders, getOrderStatusCounts, getOrderCounts } from "@/lib/services/order-service";
import { OrdersDashboardClient } from "@/components/orders/orders-dashboard-client";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  await requireSession();

  const [orders, statusCounts, counts] = await Promise.all([
    listOrders(),
    getOrderStatusCounts(),
    getOrderCounts(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Operations"
          title="Orders"
          description="Manage orders from production through delivery"
          stats={`${counts.total} active | ${counts.readyToShip} ready to ship | ${counts.inTransit + counts.shipped} in transit`}
        />
        <Link href="/orders/new">
          <Button>
            <Plus className="mr-1 size-4" /> New Order
          </Button>
        </Link>
      </div>

      <OrdersDashboardClient
        orders={orders as never}
        statusCounts={statusCounts}
        stats={{
          active: counts.total,
          readyToShip: counts.readyToShip,
          inTransit: counts.inTransit + counts.shipped,
          exception: counts.exception,
        }}
      />
    </div>
  );
}
