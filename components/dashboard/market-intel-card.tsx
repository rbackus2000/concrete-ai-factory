import Link from "next/link";
import { TrendingUp, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLatestIntelReport } from "@/lib/services/intel-report-service";

function formatWeekOf(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Pulls bullet lines (- ... or • ...) out of the executive summary. */
function bullets(summary: string): string[] {
  return summary
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-") || l.startsWith("•") || l.startsWith("*"))
    .map((l) => l.replace(/^[-•*]\s*/, ""))
    .slice(0, 5);
}

export async function MarketIntelCard() {
  const report = await getLatestIntelReport();

  if (!report) {
    return (
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4" />
            Market Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No reports yet. Jacob runs every Monday at 8 AM Central — first report will land then.
          </p>
        </CardContent>
      </Card>
    );
  }

  const lines = bullets(report.executiveSummary);

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4" />
            Market Intelligence — Week of {formatWeekOf(report.weekOf)}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Generated {new Date(report.generatedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            {report.estimatedCostUsd
              ? ` · $${Number(report.estimatedCostUsd).toFixed(2)} cost`
              : ""}
          </p>
        </div>
        <Link
          href={`/intel-reports/${report.id}`}
          className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
        >
          View full report <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{report.executiveSummary}</p>
        ) : (
          <ul className="space-y-2 text-sm leading-relaxed">
            {lines.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <Link href="/intel-reports" className="hover:text-foreground hover:underline">
            All reports →
          </Link>
          <span>{report.model ?? ""}</span>
        </div>
      </CardContent>
    </Card>
  );
}
