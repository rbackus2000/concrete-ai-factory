import { Badge } from "@/components/ui/badge";
import type { POStatusType } from "@/lib/schemas/inventory";

const statusConfig: Record<POStatusType, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SENT: { label: "Sent", variant: "default" },
  PARTIALLY_RECEIVED: { label: "Partial", variant: "warning" },
  RECEIVED: { label: "Received", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export function POStatusBadge({ status }: { status: POStatusType }) {
  const config = statusConfig[status] ?? statusConfig.DRAFT;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
