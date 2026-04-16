import { PageHeader } from "@/components/app-shell/page-header";
import { getMoldGeneratorSkus } from "@/lib/services/mold-generator-service";
import { MoldGeneratorClient } from "./mold-generator-client";

export const dynamic = "force-dynamic";

export default async function MoldGeneratorPage() {
  const { sinks, tiles } = await getMoldGeneratorSkus();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Mold Generator"
        title="3D Print Mold Generator"
        description="Select a product SKU, preview the mold geometry in 3D, configure print settings, and export STL files for your Ender-5 Max. Generate an AI product preview to visualize the finished GFRC piece."
      />
      <MoldGeneratorClient sinks={sinks} tiles={tiles} />
    </div>
  );
}
