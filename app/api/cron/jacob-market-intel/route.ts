import { NextRequest, NextResponse } from "next/server";
import { generateIntelReport, intelReportSpendThisMonth } from "@/lib/services/intel-report-service";

const MONTHLY_BUDGET_USD = Number(process.env.INTEL_REPORT_MONTHLY_BUDGET_USD ?? "25");

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const spent = await intelReportSpendThisMonth();
    if (spent >= MONTHLY_BUDGET_USD) {
      return NextResponse.json(
        {
          data: {
            skipped: true,
            reason: "monthly_budget_reached",
            spentUsd: spent,
            budgetUsd: MONTHLY_BUDGET_USD,
          },
        },
        { status: 200 },
      );
    }

    const result = await generateIntelReport();
    return NextResponse.json({
      data: {
        success: true,
        reportId: result.reportId,
        weekOf: result.weekOf.toISOString().slice(0, 10),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        webSearches: result.webSearches,
        costUsd: Number(result.estimatedCostUsd.toFixed(4)),
        monthSpentUsd: Number((spent + result.estimatedCostUsd).toFixed(4)),
        monthBudgetUsd: MONTHLY_BUDGET_USD,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate intel report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
