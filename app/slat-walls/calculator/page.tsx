import { PageHeader } from "@/components/app-shell/page-header";
import { SlatWallCalculator } from "@/components/slat-wall/slat-wall-calculator";

export const dynamic = "force-dynamic";

export default function SlatWallCalculatorPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Slat Walls"
        title="Slat Wall Cost Calculator"
        description="Estimate materials, labor, print, and total client pricing for rotating slat wall installations."
        helpKey="slat-walls-calculator"
      />
      <SlatWallCalculator />
    </div>
  );
}
