import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { SkuEditForm } from "@/components/forms/sku-edit-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSkuDetail } from "@/lib/services/sku-service";

export const dynamic = "force-dynamic";

type SkuDetailPageProps = {
  params: Promise<{
    skuCode: string;
  }>;
};

export default async function SkuDetailPage({ params }: SkuDetailPageProps) {
  const { skuCode } = await params;
  const detail = await getSkuDetail(skuCode);

  if (!detail) {
    notFound();
  }

  const { sku, materials, rules, qcTemplates, rejectionCriteria } = detail;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SKU Detail"
        title={`${sku.code} overview`}
        description="Edit the SKU definition directly against Prisma, then review the scoped materials, rules, and QC records supporting production."
      />

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <SkuEditForm
          defaultValues={{
            name: sku.name,
            slug: sku.slug,
            category: sku.category,
            status: sku.status,
            type: sku.type,
            finish: sku.finish,
            summary: sku.summary,
            targetWeightMin: sku.targetWeight.min,
            targetWeightMax: sku.targetWeight.max,
            outerLength: sku.outerLength,
            outerWidth: sku.outerWidth,
            outerHeight: sku.outerHeight,
            innerLength: sku.innerLength,
            innerWidth: sku.innerWidth,
            innerDepth: sku.innerDepth,
            wallThickness: sku.wallThickness,
            bottomThickness: sku.bottomThickness,
            topLipThickness: sku.topLipThickness,
            hollowCoreDepth: sku.hollowCoreDepth,
            domeRiseMin: sku.domeRiseMin,
            domeRiseMax: sku.domeRiseMax,
            longRibCount: sku.longRibCount,
            crossRibCount: sku.crossRibCount,
            ribWidth: sku.ribWidth,
            ribHeight: sku.ribHeight,
            drainDiameter: sku.drainDiameter,
            drainType: sku.drainType,
            basinSlopeDeg: sku.basinSlopeDeg,
            slopeDirection: sku.slopeDirection,
            mountType: sku.mountType,
            hasOverflow: sku.hasOverflow,
            overflowHoleDiameter: sku.overflowHoleDiameter,
            overflowPosition: sku.overflowPosition,
            reinforcementDiameter: sku.reinforcementDiameter,
            reinforcementThickness: sku.reinforcementThickness,
            draftAngle: sku.draftAngle,
            cornerRadius: sku.cornerRadius,
            fiberPercent: sku.fiberPercent,
            datumSystemJson: JSON.stringify(sku.datumSystem, null, 2),
            calculatorDefaultsJson: JSON.stringify(sku.calculatorDefaults, null, 2),
          }}
          skuCode={sku.code}
        />

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-2xl">{sku.name}</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">{sku.type}</p>
              </div>
              <Badge variant="secondary">{sku.status}</Badge>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Finish</p>
                <p className="mt-1 font-medium">{sku.finish}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Target Weight</p>
                <p className="mt-1 font-medium">
                  {sku.targetWeight.min}-{sku.targetWeight.max} lbs
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outer Dimensions</p>
                <p className="mt-1 font-medium">
                  {sku.outerLength}&quot; x {sku.outerWidth}&quot; x {sku.outerHeight}&quot;
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inner Basin</p>
                <p className="mt-1 font-medium">
                  {sku.innerLength}&quot; x {sku.innerWidth}&quot; x {sku.innerDepth}&quot;
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datum System</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sku.datumSystem.map((datum) => (
                <div key={datum.name} className="rounded-2xl border border-border/70 bg-secondary/40 p-4">
                  <p className="font-medium">{datum.name}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{datum.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Materials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {materials.map((material) => (
              <div key={material.code} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium">{material.name}</p>
                  <Badge>{material.category}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {material.quantity} {material.unit} at ${material.unitCost.toFixed(2)} / {material.unit}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rules Master</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.code} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium">{rule.title}</p>
                  <Badge variant="secondary">P{rule.priority}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{rule.ruleText}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QC Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {qcTemplates.map((template) => (
              <div key={template.name} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium">{template.name}</p>
                  <Badge>{template.category}</Badge>
                </div>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {template.checklist.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Generated Output History</CardTitle>
          <Link
            className="text-sm text-primary underline-offset-4 hover:underline"
            href={`/outputs?skuCode=${sku.code}`}
          >
            View all for {sku.code}
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.recentOutputs.map((output) => (
            <div key={output.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 p-4">
              <div>
                <p className="font-medium">{output.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {output.outputType} · {output.status} · v{output.version} · {new Date(output.createdAt).toLocaleString()}
                </p>
              </div>
              <Link className="text-sm text-primary underline-offset-4 hover:underline" href={`/outputs/${output.id}`}>
                Open
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reject If</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {rejectionCriteria.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
