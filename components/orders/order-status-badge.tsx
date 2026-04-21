import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS, type OrderStatusType } from "@/lib/schemas/order";

const statusConfig: Record<OrderStatusType, { variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
  PENDING: { variant: "secondary" },
  IN_PRODUCTION: { variant: "default" },
  QUALITY_CHECK: { variant: "warning" },
  READY_TO_SHIP: { variant: "warning" },
  LABEL_PURCHASED: { variant: "default" },
  SHIPPED: { variant: "default" },
  IN_TRANSIT: { variant: "default" },
  OUT_FOR_DELIVERY: { variant: "default" },
  DELIVERED: { variant: "success" },
  EXCEPTION: { variant: "destructive" },
  CANCELLED: { variant: "secondary" },
  RETURNED: { variant: "outline" },
};

export function OrderStatusBadge({ status }: { status: OrderStatusType }) {
  const config = statusConfig[status] ?? { variant: "secondary" as const };
  return (
    <Badge variant={config.variant}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
