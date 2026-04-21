import { Badge } from "@/components/ui/badge";
import type { InvoiceStatusType } from "@/lib/schemas/invoice";

const statusConfig: Record<InvoiceStatusType, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SENT: { label: "Sent", variant: "default" },
  VIEWED: { label: "Viewed", variant: "warning" },
  PARTIAL: { label: "Partial", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
  REFUNDED: { label: "Refunded", variant: "outline" },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatusType }) {
  const config = statusConfig[status] ?? statusConfig.DRAFT;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
