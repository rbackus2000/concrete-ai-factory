import { Badge } from "@/components/ui/badge";
import type { LeadStageType } from "@/lib/schemas/contact";

const stageConfig: Record<LeadStageType, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  NEW: { label: "New", variant: "default" },
  CONTACTED: { label: "Contacted", variant: "secondary" },
  QUOTED: { label: "Quoted", variant: "warning" },
  NEGOTIATING: { label: "Negotiating", variant: "warning" },
  WON: { label: "Won", variant: "success" },
  LOST: { label: "Lost", variant: "destructive" },
};

export function ContactStageBadge({ stage }: { stage: LeadStageType }) {
  const config = stageConfig[stage] ?? stageConfig.NEW;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
