import { Activity, Boxes, FileStack, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StateCard } from "@/components/ui/state-card";
import { getDashboardSummary } from "@/lib/services/dashboard-service";

const icons = [Boxes, Sparkles, FileStack, Activity];
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Internal Tool"
        title="Concrete AI Factory dashboard"
        description="Starter control center for SKU management, prompt generation, packet assembly, and concrete mix calculators."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.stats.length > 0 ? summary.stats.map((stat, index) => {
          const Icon = icons[index];

          return (
            <Card key={stat.label} className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <CardTitle className="mt-2 text-3xl">{stat.value}</CardTitle>
                </div>
                <div className="rounded-full bg-secondary p-3 text-primary">
                  <Icon className="size-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{stat.helper}</p>
              </CardContent>
            </Card>
          );
        }) : (
          <div className="md:col-span-2 xl:col-span-4">
            <StateCard
              title="No dashboard metrics yet"
              description="Bootstrap the database and seed the starter records before using the internal workflows."
            />
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        {summary.featuredSku ? (
          <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Featured SKU</p>
                  <CardTitle className="mt-2 text-2xl">{summary.featuredSku.name}</CardTitle>
                </div>
                <Badge variant="secondary">{summary.featuredSku.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">SKU Code</p>
                <p className="mt-1 font-medium">{summary.featuredSku.code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="mt-1 font-medium">{summary.featuredSku.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Finish</p>
                <p className="mt-1 font-medium">{summary.featuredSku.finish}</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-sm text-muted-foreground">Why it matters</p>
                <p className="mt-1 leading-7 text-foreground/85">{summary.featuredSku.summary}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardHeader>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Seeded modules</p>
            <CardTitle className="mt-2 text-2xl">What this scaffold already knows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.modules.map((module) => (
              <div
                key={module.name}
                className="rounded-2xl border border-border/70 bg-secondary/40 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium">{module.name}</p>
                  <Badge>{module.count}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{module.helper}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
