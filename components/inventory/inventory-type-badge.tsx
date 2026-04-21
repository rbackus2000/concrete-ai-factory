import { Badge } from "@/components/ui/badge";
import type { InventoryTypeValue } from "@/lib/schemas/inventory";

const typeConfig: Record<InventoryTypeValue, { label: string; variant: "default" | "secondary" }> = {
  FINISHED_PRODUCT: { label: "Finished Product", variant: "default" },
  RAW_MATERIAL: { label: "Raw Material", variant: "secondary" },
};

export function InventoryTypeBadge({ type }: { type: InventoryTypeValue }) {
  const config = typeConfig[type] ?? typeConfig.FINISHED_PRODUCT;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
