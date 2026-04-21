import { PageHeader } from "@/components/app-shell/page-header";
import { CalculatorForm } from "@/components/forms/calculator-form";
import { StateCard } from "@/components/ui/state-card";
import { getCalculatorWorkspace } from "@/lib/services/calculator-service";

export const dynamic = "force-dynamic";

type CalculatorPageProps = {
  searchParams: Promise<{ sku?: string }>;
};

export default async function CalculatorPage({ searchParams }: CalculatorPageProps) {
  const { sku: skuCode } = await searchParams;
  const calculator = await getCalculatorWorkspace(skuCode);

  if (!calculator) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Calculator"
          title="Mix, pigment, sealer, and costing workspace"
          description="Run the calculator engine from real SKU defaults and live material baselines, then override the working assumptions as needed."
          helpKey="calculator"
        />
        <StateCard
          title="Calculator workspace unavailable"
          description="Seed at least one active SKU with calculator defaults and material records before running the calculator."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Calculator"
        title="Mix, pigment, sealer, and costing workspace"
        description="Run the calculator engine from real SKU defaults and live material baselines, then override the working assumptions as needed."
        helpKey="calculator"
      />
      <CalculatorForm initialResult={calculator.initialResult} skus={calculator.skus} />
    </div>
  );
}
