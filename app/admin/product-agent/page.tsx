import { PageHeader } from "@/components/app-shell/page-header";
import { ProductAgentClient } from "./product-agent-client";

export const dynamic = "force-dynamic";

export default function ProductAgentPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin / Product Agent"
        title="Product creation agent"
        description="Describe a new product and the agent will generate a complete SKU with build packets, materials, QC checklists, and calculator defaults — all matching your existing product structure."
      />
      <ProductAgentClient />
    </div>
  );
}
