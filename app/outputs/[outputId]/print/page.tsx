import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { PrintButton } from "@/components/print/print-button";
import { buttonVariants } from "@/components/ui/button";
import { logGeneratedOutputEvent } from "@/lib/services/audit-service";
import { getPrintablePacketExport } from "@/lib/services/export-service";

export const dynamic = "force-dynamic";

type OutputPrintPageProps = {
  params: Promise<{
    outputId: string;
  }>;
};

function isRecordArray(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every((entry) => typeof entry === "object" && entry !== null);
}

export default async function OutputPrintPage({ params }: OutputPrintPageProps) {
  const actor = await requireSession();
  const { outputId } = await params;
  const printable = await getPrintablePacketExport(outputId);

  if (!printable) {
    notFound();
  }

  await logGeneratedOutputEvent({
    actor,
    outputId,
    action: "VIEW_PRINT",
  });

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-8 print:px-0 print:py-4">
        <div className="flex items-center justify-between gap-4 print:hidden">
          <Link className={buttonVariants({ variant: "outline" })} href={`/outputs/${outputId}`}>
            Back to output detail
          </Link>
          <PrintButton />
        </div>

        <header className="border-b border-stone-300 pb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Printable Packet</p>
          <h1 className="mt-3 text-4xl font-semibold">{printable.title}</h1>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <p>
              <span className="text-stone-500">SKU:</span> {printable.sku.code} · {printable.sku.name}
            </p>
            <p>
              <span className="text-stone-500">Status:</span> {printable.status}
            </p>
            <p>
              <span className="text-stone-500">Version:</span> v{printable.version}
            </p>
            <p>
              <span className="text-stone-500">Created:</span> {new Date(printable.createdAt).toLocaleString()}
            </p>
          </div>
        </header>

        <main className="space-y-8">
          {printable.sections.map((section) => {
            const record = section as Record<string, unknown>;
            return (
              <section
                key={String(record["id"] ?? record["sectionKey"] ?? record["sectionOrder"])}
                className="break-inside-avoid rounded-xl border border-stone-300 p-5"
              >
                <p className="text-sm uppercase tracking-[0.2em] text-stone-500">
                  Section {String(record["sectionOrder"] ?? "?").padStart(2, "0")}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{String(record["name"] ?? "Untitled")}</h2>
                <div className="mt-4 whitespace-pre-line text-[15px] leading-7">
                  {String(record["content"] ?? "")}
                </div>
              </section>
            );
          })}

          {isRecordArray(printable.rulesApplied) && printable.rulesApplied.length > 0 ? (
            <section className="break-inside-avoid rounded-xl border border-stone-300 p-5">
              <h2 className="text-2xl font-semibold">Rules Applied</h2>
              <div className="mt-4 space-y-3">
                {printable.rulesApplied.map((rule, index) => (
                  <div key={String(rule["code"] ?? index)}>
                    <p className="font-medium">
                      [P{String(rule["priority"] ?? "?")}] {String(rule["title"] ?? rule["code"] ?? "Rule")}
                    </p>
                    <p className="mt-1 text-[15px] leading-7">{String(rule["ruleText"] ?? rule["text"] ?? "")}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {isRecordArray(printable.qcTemplatesApplied) && printable.qcTemplatesApplied.length > 0 ? (
            <section className="break-inside-avoid rounded-xl border border-stone-300 p-5">
              <h2 className="text-2xl font-semibold">QC Templates Applied</h2>
              <div className="mt-4 space-y-4">
                {printable.qcTemplatesApplied.map((template, index) => (
                  <div key={String(template["templateKey"] ?? index)}>
                    <p className="font-medium">{String(template["name"] ?? "QC Template")}</p>
                    <p className="mt-1 text-sm text-stone-500">{String(template["category"] ?? "")}</p>
                    {Array.isArray(template["checklist"]) ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-7">
                        {(template["checklist"] as unknown[]).map((item, itemIndex) => (
                          <li key={`${index}-${itemIndex}`}>{String(item)}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="break-inside-avoid rounded-xl border border-stone-300 p-5">
            <h2 className="text-2xl font-semibold">Source References</h2>
            <div className="mt-4 space-y-3 text-[15px] leading-7">
              {printable.sourceReferences.primaryBuildPacketTemplate ? (
                <p>
                  Primary packet reference:{" "}
                  {printable.sourceReferences.primaryBuildPacketTemplate.packetKey}/
                  {printable.sourceReferences.primaryBuildPacketTemplate.sectionKey} ·{" "}
                  {printable.sourceReferences.primaryBuildPacketTemplate.name}
                </p>
              ) : null}
              {printable.sourceReferences.buildPacketSections.length > 0 ? (
                <div>
                  <p className="font-medium">Contributing sections</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {printable.sourceReferences.buildPacketSections.map((section) => (
                      <li key={section.id}>
                        {section.sectionOrder}. {section.sectionKey}
                        {section.templateName ? ` · ${section.templateName}` : ""}
                        {section.packetKey ? ` · ${section.packetKey}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
