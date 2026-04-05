import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPacketPreview } from "@/lib/services/packet-service";

export const dynamic = "force-dynamic";

type PacketPageProps = {
  params: Promise<{
    skuCode: string;
  }>;
};

export default async function PacketPage({ params }: PacketPageProps) {
  const { skuCode } = await params;
  const preview = await getPacketPreview(skuCode);

  if (!preview) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Packets"
        title={`${preview.sku.code} build packet`}
        description="Packet sections are assembled from Prisma templates plus derived QC and manufacturing rule content."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Core Geometry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Outer</span>
              <span className="font-medium">
                {preview.sku.outerLength} x {preview.sku.outerWidth} x {preview.sku.outerHeight}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Inner</span>
              <span className="font-medium">
                {preview.sku.innerLength} x {preview.sku.innerWidth} x {preview.sku.innerDepth}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Wall / Bottom</span>
              <span className="font-medium">
                {preview.sku.wallThickness} / {preview.sku.bottomThickness}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Critical Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {preview.criticalRules.map((rule) => (
              <div key={rule.code} className="rounded-2xl border border-border/70 p-4 text-sm">
                <p className="font-medium">{rule.title}</p>
                <p className="mt-1 text-muted-foreground">{rule.ruleText}</p>
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
              {preview.rejectionCriteria.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-4">
        {preview.sections.map((section) => (
          <Card key={section.sectionKey}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  Section {section.sectionOrder.toString().padStart(2, "0")}
                </p>
                <CardTitle className="mt-2 text-2xl">{section.name}</CardTitle>
              </div>
              <Badge>{section.status}</Badge>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line leading-7 text-foreground/85">{section.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
