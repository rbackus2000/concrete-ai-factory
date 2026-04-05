import { PageHeader } from "@/components/app-shell/page-header";
import { GeneratorForm } from "@/components/forms/generator-form";
import { StateCard } from "@/components/ui/state-card";
import { getGeneratorConfig } from "@/lib/services/generator-service";

export const dynamic = "force-dynamic";

export default async function GeneratorPage() {
  const config = await getGeneratorConfig();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Generator"
        title="Prompt generation workspace"
        description="Generate and persist prompt, packet, and calculation outputs from live Prisma-backed SKU and template data."
      />
      {config.skus.length > 0 ? (
        <GeneratorForm
          outputTypes={config.outputTypes}
          recentOutputs={config.recentOutputs}
          referenceImages={config.referenceImages}
          skus={config.skus}
        />
      ) : (
        <StateCard
          title="No active SKUs available"
          description="Activate or seed at least one SKU before generating prompt, packet, or calculation outputs."
        />
      )}
    </div>
  );
}
