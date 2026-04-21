import Link from "next/link";
import { Mail, TrendingUp, Users, Zap } from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import {
  getMarketingDashboardStats,
  getRecentEmailActivity,
  listSequences,
} from "@/lib/services/marketing-service";

export const dynamic = "force-dynamic";

export default async function MarketingDashboardPage() {
  await requireSession();

  const [stats, recentActivity, sequences] = await Promise.all([
    getMarketingDashboardStats(),
    getRecentEmailActivity(15),
    listSequences(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="marketing"
          eyebrow="Marketing"
          title="Marketing & Automation"
          description="Email sequences, campaigns, and follow-up automation."
          stats={`${stats.totalEnrolled} enrolled | ${stats.avgOpenRate}% avg open rate | ${stats.campaignsSent} campaigns sent`}
        />
        <div className="flex gap-2">
          <Link href="/marketing/sequences/new">
            <Button variant="outline">New Sequence</Button>
          </Link>
          <Link href="/marketing/campaigns/new">
            <Button>New Campaign</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Active Sequences</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{stats.activeSequences}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Enrolled Contacts</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{stats.totalEnrolled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sent This Month</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{stats.sentThisMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Avg Open Rate</p>
            </div>
            <p className={`mt-1 text-2xl font-bold ${stats.avgOpenRate >= 25 ? "text-amber-500" : ""}`}>
              {stats.avgOpenRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Sequences */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Sequences</CardTitle>
            <Link href="/marketing/sequences">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {sequences.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No sequences yet. Create one to start automating follow-ups.
              </p>
            ) : (
              <div className="space-y-3">
                {sequences.slice(0, 8).map((seq) => (
                  <Link
                    key={seq.id}
                    href={`/marketing/sequences/${seq.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{seq.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {seq.trigger.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {seq.steps.length} steps
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground">Enrolled</p>
                        <p className="text-sm font-medium">{seq._count.enrollments}</p>
                      </div>
                      <Badge variant={seq.isActive ? "default" : "secondary"}>
                        {seq.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Email Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No email activity yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((log) => {
                  const source = log.enrollment?.sequence?.name ?? log.campaign?.name ?? "Email";
                  const action = log.openedAt
                    ? "opened"
                    : log.clickedAt
                      ? "clicked"
                      : "received";
                  const timeAgo = getTimeAgo(log.createdAt);

                  return (
                    <div key={log.id} className="flex items-start gap-2 rounded p-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p>
                          <Link
                            href={`/contacts/${log.contact.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {log.contact.name}
                          </Link>{" "}
                          {action} &ldquo;{log.subject}&rdquo;
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {source} &middot; {timeAgo}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
