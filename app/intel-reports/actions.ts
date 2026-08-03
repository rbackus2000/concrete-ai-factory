"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/auth/session";
import {
  generateIntelReport,
  intelReportSpendThisMonth,
} from "@/lib/services/intel-report-service";

const MONTHLY_BUDGET_USD = Number(process.env.INTEL_REPORT_MONTHLY_BUDGET_USD ?? "25");

export type GenerateIntelReportActionResult =
  | { ok: true; reportId: string; costUsd: number; webSearches: number; truncated: boolean }
  | { ok: false; reason: "budget"; spentUsd: number; budgetUsd: number }
  | { ok: false; reason: "error"; message: string };

/**
 * Manual counterpart to the Monday cron (/api/cron/jacob-market-intel).
 *
 * Admin-only: each run costs real money (tokens plus $0.01 per web search, up
 * to 30), so this is not a button every staff role should be able to press.
 *
 * Mirrors the cron's budget guard rather than delegating to the endpoint —
 * calling our own HTTP route from a server action would mean re-authenticating
 * with CRON_SECRET for no benefit.
 */
export async function generateIntelReportAction(): Promise<GenerateIntelReportActionResult> {
  await requireAdminSession();

  try {
    const spent = await intelReportSpendThisMonth();
    if (spent >= MONTHLY_BUDGET_USD) {
      return {
        ok: false,
        reason: "budget",
        spentUsd: Number(spent.toFixed(2)),
        budgetUsd: MONTHLY_BUDGET_USD,
      };
    }

    const result = await generateIntelReport();

    // The report list and the dashboard card both read this data.
    revalidatePath("/intel-reports");
    revalidatePath("/dashboard");

    return {
      ok: true,
      reportId: result.reportId,
      costUsd: Number(result.estimatedCostUsd.toFixed(2)),
      webSearches: result.webSearches,
      truncated: result.truncated,
    };
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : "Report generation failed.",
    };
  }
}
