import Link from "next/link";
import { Boxes, Briefcase, Image, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StateCard } from "@/components/ui/state-card";
import { getDashboardSummary } from "@/lib/services/dashboard-service";

const icons = [Boxes, Image, Briefcase, Sparkles];
export const dynamic = "force-dynamic";

const jobStatusLabels: Record<string, string> = {
  QUOTED: "Quoted",
  IN_PRODUCTION: "In Production",
  QC: "QC",
  READY: "Ready",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
};

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Internal Tool"
        title="Concrete AI Factory dashboard"
        description="Operations control center for SKU management, production jobs, prompt generation, and concrete mix calculators."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.stats.length > 0 ? summary.stats.map((stat, index) => {
          const Icon = icons[index];

          return (
            <Card key={stat.label}>
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
          <Card>
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

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Job Pipeline</p>
              <CardTitle className="mt-2 text-2xl">Production Status</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(summary.jobPipeline).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summary.jobPipeline).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5">
                      <span className="text-xs text-muted-foreground">{jobStatusLabels[status] ?? status}</span>
                      <Badge variant={count > 0 ? "default" : "secondary"}>{count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No jobs created yet. <Link href="/jobs/new" className="text-primary hover:underline">Create your first job</Link>.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">System Modules</p>
              <CardTitle className="mt-2 text-2xl">Active Systems</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary.modules.map((module) => (
                <div key={module.name} className="rounded-2xl border border-border/70 bg-secondary/40 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium">{module.name}</p>
                    <Badge>{module.count}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{module.helper}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {summary.recentOutputs.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Recent Outputs</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {summary.recentOutputs.map((output) => (
              <Link key={output.id} href={`/outputs/${output.id}`}>
                <Card className="h-full transition hover:border-primary/40">
                  {output.imageUrl && (
                    <div className="aspect-video overflow-hidden rounded-t-xl bg-muted">
                      <img src={output.imageUrl} alt={output.title} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">{output.title}</p>
                    <p className="text-xs text-muted-foreground">{output.skuCode}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{output.outputType}</Badge>
                      <Badge variant={output.status === "APPROVED" ? "default" : "secondary"} className="text-[10px]">{output.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
