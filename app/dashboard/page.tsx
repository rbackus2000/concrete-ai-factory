import { Suspense } from "react";

import { KPICards } from "@/components/dashboard/kpi-cards";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ARAgingCard } from "@/components/dashboard/ar-aging";
import { SalesTrendChart } from "@/components/dashboard/sales-trend";
import { TopCustomersCard } from "@/components/dashboard/top-customers";
import { AIBriefingCard } from "@/components/dashboard/ai-briefing";
import { ProductionQueueCard } from "@/components/dashboard/production-queue";
import { InventoryHealthCard } from "@/components/dashboard/inventory-health";

export const dynamic = "force-dynamic";

function SectionSkeleton({ height = "h-64" }: { height?: string }) {
  return <div className={`${height} w-full animate-pulse rounded-xl bg-muted`} />;
}

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Good morning, Robert.</h1>
        <p className="mt-1 text-sm text-muted-foreground">{today} &middot; RB Studio OS</p>
      </header>

      {/* ROW 1 — KPI Cards */}
      <Suspense fallback={<SectionSkeleton height="h-24" />}>
        <KPICards />
      </Suspense>

      {/* ROW 2 — P&L + AR Aging */}
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Suspense fallback={<SectionSkeleton />}>
          <RevenueChart />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <ARAgingCard />
        </Suspense>
      </div>

      {/* ROW 3 — Sales Trend + Top Customers */}
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Suspense fallback={<SectionSkeleton />}>
          <SalesTrendChart />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <TopCustomersCard />
        </Suspense>
      </div>

      {/* ROW 4 — AI Briefing */}
      <Suspense fallback={<SectionSkeleton />}>
        <AIBriefingCard />
      </Suspense>

      {/* ROW 5 — Production Queue + Inventory Health */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Suspense fallback={<SectionSkeleton />}>
          <ProductionQueueCard />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <InventoryHealthCard />
        </Suspense>
      </div>
    </div>
  );
}
