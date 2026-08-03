"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Sparkles, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  generateIntelReportAction,
  type GenerateIntelReportActionResult,
} from "@/app/intel-reports/actions";

export function GenerateReportButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<GenerateIntelReportActionResult | null>(null);

  function handleGenerate() {
    setResult(null);
    startTransition(async () => {
      const res = await generateIntelReportAction();
      setResult(res);
      // revalidatePath runs server-side; refresh pulls the new row into this view.
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button className="gap-2" disabled={isPending} onClick={handleGenerate} size="sm">
        <Sparkles className={isPending ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
        {isPending ? "Researching the market…" : "Generate report"}
      </Button>

      {/* The run scans retailer and trade sites before writing, so it routinely
          takes minutes. Say so, or a quiet button reads as a hang. */}
      {isPending && (
        <p className="text-xs text-muted-foreground">
          Scanning retailers and trade press — this takes several minutes. You can leave this page;
          the report saves on its own and will appear in the list.
        </p>
      )}

      {result && !isPending && <ResultMessage result={result} />}
    </div>
  );
}

function ResultMessage({ result }: { result: GenerateIntelReportActionResult }) {
  if (result.ok) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-emerald-700">
        <Check className="h-3.5 w-3.5 shrink-0" />
        {result.truncated
          ? `Report generated but truncated — $${result.costUsd.toFixed(2)}, ${result.webSearches} searches.`
          : `Report generated — $${result.costUsd.toFixed(2)}, ${result.webSearches} searches.`}
      </p>
    );
  }

  // Budget is a deliberate stop, not a failure — the cron reports it the same
  // way, and it is the most common reason a run produces nothing.
  if (result.reason === "budget") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-amber-700">
        <Wallet className="h-3.5 w-3.5 shrink-0" />
        Skipped: ${result.spentUsd.toFixed(2)} of the ${result.budgetUsd.toFixed(2)} monthly budget
        is already spent. Raise INTEL_REPORT_MONTHLY_BUDGET_USD to continue.
      </p>
    );
  }

  return (
    <p className="flex items-center gap-1.5 text-xs text-red-700">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      {result.message}
    </p>
  );
}
