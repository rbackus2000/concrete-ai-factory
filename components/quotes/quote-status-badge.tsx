import { Badge } from "@/components/ui/badge";
import type { QuoteStatusType } from "@/lib/schemas/quote";

const statusVariant: Record<QuoteStatusType, "default" | "secondary" | "outline" | "success" | "warning"> = {
  DRAFT: "secondary",
  SENT: "default",
  VIEWED: "warning",
  SIGNED: "success",
  CONVERTED: "default",
  EXPIRED: "outline",
  DECLINED: "outline",
};

const statusLabel: Record<QuoteStatusType, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  SIGNED: "Signed",
  CONVERTED: "Converted",
  EXPIRED: "Expired",
  DECLINED: "Declined",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatusType }) {
  return <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>;
}
