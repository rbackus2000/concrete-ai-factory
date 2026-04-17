import { PageHeader } from "@/components/app-shell/page-header";
import { SkuEditForm } from "@/components/forms/sku-edit-form";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewSkuPage() {
  const laborRateOptions = (await prisma.laborRate.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, hourlyRate: true },
    orderBy: { hourlyRate: "asc" },
  })).map((r) => ({ id: r.id, label: `${r.name} — $${r.hourlyRate}/hr` }));
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SKUs"
        title="Create new SKU"
        description="Manually define a new product SKU with full geometry, specifications, and calculator defaults."
      />
      <SkuEditForm
        mode="create"
        defaultValues={{
          name: "",
          slug: "",
          category: "VESSEL_SINK",
          status: "DRAFT",
          type: "",
          finish: "",
          summary: "",
          targetWeightMin: 0,
          targetWeightMax: 0,
          outerLength: 0,
          outerWidth: 0,
          outerHeight: 0,
          innerLength: 0,
          innerWidth: 0,
          innerDepth: 0,
          wallThickness: 0,
          bottomThickness: 0,
          topLipThickness: 0,
          hollowCoreDepth: 0,
          domeRiseMin: 0,
          domeRiseMax: 0,
          longRibCount: 0,
          crossRibCount: 0,
          ribWidth: 0,
          ribHeight: 0,
          drainDiameter: 0,
          drainType: "",
          basinSlopeDeg: 0,
          slopeDirection: "",
          mountType: "",
          hasOverflow: false,
          overflowHoleDiameter: 0,
          overflowPosition: "",
          reinforcementDiameter: 0,
          reinforcementThickness: 0,
          draftAngle: 0,
          cornerRadius: 0,
          fiberPercent: 0,
          retailPrice: 0,
          wholesalePrice: 0,
          laborRateId: "",
          laborHoursPerUnit: 0,
          datumSystemJson: "[]",
          calculatorDefaultsJson: JSON.stringify({
            batchSizeLbs: 50,
            mixType: "SCC",
            waterLbs: 12.5,
            plasticizerGrams: 150,
            fiberPercent: 0.03,
            colorIntensityPercent: 0.07,
            unitsToProduce: 1,
            weightPerUnitLbs: 30,
            wasteFactor: 1.1,
            autoBatchSizeLbs: 33,
            scaleFactor: 0.66,
            pigmentGrams: 500,
          }, null, 2),
        }}
        laborRateOptions={laborRateOptions}
      />
    </div>
  );
}
