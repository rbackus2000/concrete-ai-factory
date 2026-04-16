import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { OutputExportActions } from "@/components/outputs/output-export-actions";
import OutputReviewActions from "@/components/outputs/output-review-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { getGeneratedOutputDetail } from "@/lib/services/generated-output-service";

export const dynamic = "force-dynamic";

type OutputDetailPageProps = {
  params: Promise<{
    outputId: string;
  }>;
};

function isSectionRecordArray(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every((entry) => typeof entry === "object" && entry !== null);
}

function isCardArray(value: unknown): value is Array<{ title?: unknown; items?: unknown }> {
  return Array.isArray(value);
}

function isRecordArray(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every((entry) => typeof entry === "object" && entry !== null);
}

export default async function OutputDetailPage({ params }: OutputDetailPageProps) {
  const { outputId } = await params;
  const detail = await getGeneratedOutputDetail(outputId);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Output Detail"
        title={detail.title}
        description="Saved output payloads are rendered in an export-friendly layout so markdown or PDF export can be layered in later."
      />

      <div className="flex items-center gap-4">
        <OutputExportActions canPrint={detail.outputType === "BUILD_PACKET"} outputId={detail.id} />
        <OutputReviewActions outputId={detail.id} currentStatus={detail.status} />
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>SKU</CardTitle>
          </CardHeader>
          <CardContent>
            <Link className="font-medium text-primary underline-offset-4 hover:underline" href={`/skus/${detail.sku.code}`}>
              {detail.sku.code} · {detail.sku.name}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Output Type</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{detail.outputType}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{detail.status}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Version</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">v{detail.version}</p>
          </CardContent>
        </Card>
      </section>

      {detail.imageAssets.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Rendered Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {detail.imageAssets.map((asset) => (
              <div key={asset.id} className="space-y-4 rounded-3xl border border-border/70 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary">{asset.status}</Badge>
                  <span className="text-sm text-muted-foreground">{asset.modelName}</span>
                  {asset.width && asset.height ? (
                    <span className="text-sm text-muted-foreground">
                      {asset.width} x {asset.height}
                    </span>
                  ) : null}
                  {asset.imageUrl ? (
                    <a
                      className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-transparent px-4 text-sm font-medium hover:bg-secondary/40"
                      download={`${detail.sku.code}-${detail.outputType.toLowerCase()}.png`}
                      href={asset.imageUrl}
                    >
                      Download image
                    </a>
                  ) : null}
                </div>
                {asset.imageUrl ? (
                  <div className="overflow-hidden rounded-3xl border border-border/70 bg-secondary/20 p-3">
                    <img
                      alt={`${detail.sku.code} generated render`}
                      className="w-full rounded-2xl object-cover"
                      src={asset.imageUrl}
                    />
                  </div>
                ) : null}
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Image URL</p>
                    <p className="mt-1 break-all text-sm font-medium">{asset.imageUrl ?? "Not stored"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stored File</p>
                    <p className="mt-1 break-all text-sm font-medium">{asset.filePath ?? "Provider-hosted only"}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {detail.text ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>{detail.outputType === "IMAGE_RENDER" ? "Underlying Prompt Text" : "Rendered Text"}</CardTitle>
            <CopyButton text={detail.text} />
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-3xl border border-border/70 bg-secondary/20 p-5 font-mono text-sm leading-7">
              {detail.text}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      {isSectionRecordArray(detail.sections) && detail.sections.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Packet Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.sections.map((section, index) => (
              <div key={String(section["sectionKey"] ?? index)} className="rounded-2xl border border-border/70 p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  Section {String(section["sectionOrder"] ?? index + 1)}
                </p>
                <p className="mt-2 text-lg font-medium">{String(section["name"] ?? "Untitled")}</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-foreground/85">
                  {String(section["content"] ?? "")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {isRecordArray(detail.rulesApplied) && detail.rulesApplied.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Rules Applied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.rulesApplied.map((rule, index) => (
              <div key={String(rule["code"] ?? index)} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium">{String(rule["title"] ?? rule["code"] ?? "Rule")}</p>
                  <span className="text-sm text-muted-foreground">P{String(rule["priority"] ?? "?")}</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-foreground/85">
                  {String(rule["ruleText"] ?? rule["text"] ?? "")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {isRecordArray(detail.qcTemplatesApplied) && detail.qcTemplatesApplied.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>QC Templates Applied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.qcTemplatesApplied.map((template, index) => (
              <div key={String(template["templateKey"] ?? index)} className="rounded-2xl border border-border/70 p-4">
                <p className="font-medium">{String(template["name"] ?? "QC Template")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{String(template["category"] ?? "")}</p>
                {Array.isArray(template["checklist"]) ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground/85">
                    {(template["checklist"] as unknown[]).map((item, itemIndex) => (
                      <li key={`${index}-${itemIndex}`}>{String(item)}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {isCardArray(detail.cards) && detail.cards.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-3">
          {detail.cards.map((card, index) => {
            const items = Array.isArray(card.items) ? card.items : [];

            return (
              <Card key={`${String(card.title ?? "card")}-${index}`}>
                <CardHeader>
                  <CardTitle>{String(card.title ?? "Card")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((item, itemIndex) => {
                    const entry =
                      item && typeof item === "object" && !Array.isArray(item)
                        ? (item as Record<string, unknown>)
                        : {};

                    return (
                      <div key={`${index}-${itemIndex}`} className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">{String(entry["label"] ?? "Item")}</span>
                        <span className="font-medium">{String(entry["value"] ?? "")}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </section>
      ) : null}

      {detail.metrics ? (
        <Card>
          <CardHeader>
            <CardTitle>Calculation Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-3xl border border-border/70 bg-secondary/20 p-5 font-mono text-sm leading-7">
              {JSON.stringify(detail.metrics, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Source References</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {detail.sourceReferences.promptTemplate ? (
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="font-medium">Prompt Template</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {detail.sourceReferences.promptTemplate.key} · {detail.sourceReferences.promptTemplate.name}
              </p>
            </div>
          ) : null}

          {detail.sourceReferences.primaryBuildPacketTemplate ? (
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="font-medium">Primary Packet Template Reference</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {detail.sourceReferences.primaryBuildPacketTemplate.packetKey} / {detail.sourceReferences.primaryBuildPacketTemplate.sectionKey} · {detail.sourceReferences.primaryBuildPacketTemplate.name}
              </p>
            </div>
          ) : null}

          {detail.sourceReferences.buildPacketSections.length > 0 ? (
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="font-medium">Contributing Packet Sections</p>
              <div className="mt-3 space-y-2">
                {detail.sourceReferences.buildPacketSections.map((section) => (
                  <div key={section.id} className="flex items-center justify-between gap-4 text-sm">
                    <span>
                      {section.sectionOrder}. {section.sectionKey} {section.templateName ? `· ${section.templateName}` : "· Derived"}
                    </span>
                    <span className="text-muted-foreground">{section.packetKey ?? "runtime"}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Input Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-3xl border border-border/70 bg-secondary/20 p-5 font-mono text-sm leading-7">
              {detail.inputPayloadJson}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Output Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-3xl border border-border/70 bg-secondary/20 p-5 font-mono text-sm leading-7">
              {detail.outputPayloadJson}
            </pre>
          </CardContent>
        </Card>
      </section>

      {detail.imageAssets.length > 0 ? (
        <section className="grid gap-4">
          {detail.imageAssets.map((asset) => (
            <Card key={`${asset.id}-metadata`}>
              <CardHeader>
                <CardTitle>Image Provider Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap rounded-3xl border border-border/70 bg-secondary/20 p-5 font-mono text-sm leading-7">
                  {asset.metadataJson}
                </pre>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}
