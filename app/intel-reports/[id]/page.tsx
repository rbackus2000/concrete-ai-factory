import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { getIntelReportById } from "@/lib/services/intel-report-service";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function IntelReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const report = await getIntelReportById(id);
  if (!report) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/intel-reports"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All reports
      </Link>

      <header className="border-b pb-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="size-4" />
          Market Intelligence Report
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Week of {fmtDate(report.weekOf)}
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Generated {fmtDate(report.generatedAt)} · {report.model ?? "Claude"}
          {report.estimatedCostUsd ? ` · $${Number(report.estimatedCostUsd).toFixed(2)} API cost` : ""}
          {report.inputTokens && report.outputTokens
            ? ` · ${report.inputTokens.toLocaleString()} in / ${report.outputTokens.toLocaleString()} out tokens`
            : ""}
        </p>
      </header>

      <article className="prose prose-stone max-w-none dark:prose-invert prose-headings:font-bold prose-h2:mt-10 prose-h2:border-b prose-h2:pb-2 prose-h3:mt-6 prose-table:text-sm prose-th:bg-muted prose-th:font-semibold prose-td:align-top prose-li:my-1">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.fullMarkdown}</ReactMarkdown>
      </article>
    </div>
  );
}
