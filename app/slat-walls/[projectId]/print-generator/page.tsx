import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { PrintGeneratorClient } from "@/components/slat-wall/print-generator-client";
import { getSlatWallDetail, getSlatWallSimulatorImages } from "@/lib/services/slat-wall-service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ projectId: string }> };

export default async function PrintGeneratorPage({ params }: Props) {
  const { projectId } = await params;
  const [detail, savedImages] = await Promise.all([
    getSlatWallDetail(projectId),
    getSlatWallSimulatorImages(projectId),
  ]);
  if (!detail || !detail.config) notFound();

  // Flatten scenario-grouped images: pick most recent per state across all scenarios
  const aiImages: Record<string, string> = {};
  for (const states of Object.values(savedImages)) {
    for (const [state, data] of Object.entries(states)) {
      if (!aiImages[state]) aiImages[state] = data.imageUrl;
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Slat Walls"
        title={`${detail.project.code} — Print Generator`}
        description="Generate print-ready SVG, PDF, and DXF files for UV flatbed printing or stencil cutting."
      />
      <PrintGeneratorClient
        projectCode={detail.project.code}
        defaultSlatCount={detail.config.totalSlatCount}
        defaultSlatWidthIn={detail.config.slatWidth}
        defaultSlatHeightIn={detail.config.slatHeight}
        aiImages={aiImages}
      />
    </div>
  );
}
