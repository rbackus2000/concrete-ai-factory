"use client";

import { useState } from "react";

import type { MoldGeneratorSku } from "@/lib/services/mold-generator-service";
import { calculateSectionPlan, generateSlicingSpec } from "@/lib/engines/mold-print-engine";
import { ProductSelector } from "@/components/mold-generator/product-selector";
import { DimensionPanel } from "@/components/mold-generator/dimension-panel";
import { ThreePreview } from "@/components/mold-generator/three-preview";
import { SectionPlanPanel } from "@/components/mold-generator/section-plan-panel";
import { SlicingSpecPanel } from "@/components/mold-generator/slicing-spec-panel";
import { PreviewPanel } from "@/components/mold-generator/preview-panel";

type Props = {
  sinks: MoldGeneratorSku[];
  tiles: MoldGeneratorSku[];
};

export function MoldGeneratorClient({ sinks, tiles }: Props) {
  const [productType, setProductType] = useState<"sinks" | "tiles">("sinks");
  const [selectedSku, setSelectedSku] = useState<MoldGeneratorSku | null>(null);

  const skuList = productType === "sinks" ? sinks : tiles;

  function handleSkuChange(code: string) {
    const sku = skuList.find((s) => s.code === code) ?? null;
    setSelectedSku(sku);
  }

  function handleTypeChange(type: "sinks" | "tiles") {
    setProductType(type);
    setSelectedSku(null);
  }

  const sectionPlan = selectedSku
    ? calculateSectionPlan({
        outerLength: selectedSku.outerLength,
        outerWidth: selectedSku.outerWidth,
        outerHeight: selectedSku.outerHeight,
        category: selectedSku.category as "VESSEL_SINK" | "WALL_TILE",
      })
    : null;

  const slicingSpec = selectedSku && sectionPlan
    ? generateSlicingSpec(
        {
          outerLength: selectedSku.outerLength,
          outerWidth: selectedSku.outerWidth,
          outerHeight: selectedSku.outerHeight,
          category: selectedSku.category as "VESSEL_SINK" | "WALL_TILE",
        },
        sectionPlan,
      )
    : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      {/* Left Panel — Controls */}
      <div className="space-y-6">
        <ProductSelector
          productType={productType}
          onTypeChange={handleTypeChange}
          skuList={skuList}
          selectedCode={selectedSku?.code ?? ""}
          onSkuChange={handleSkuChange}
        />

        {selectedSku && <DimensionPanel sku={selectedSku} />}

        {sectionPlan && <SectionPlanPanel plan={sectionPlan} />}

        {slicingSpec && <SlicingSpecPanel spec={slicingSpec} />}

        {selectedSku && (
          <PreviewPanel
            skuId={selectedSku.id}
            skuCode={selectedSku.code}
            productName={selectedSku.name}
          />
        )}
      </div>

      {/* Right Panel — 3D Preview */}
      <div className="sticky top-8">
        <ThreePreview sku={selectedSku} sectionPlan={sectionPlan} />
      </div>
    </div>
  );
}
