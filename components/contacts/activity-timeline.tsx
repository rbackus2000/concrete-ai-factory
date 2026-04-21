"use client";

import {
  FileText,
  Phone,
  Mail,
  MessageSquare,
  Eye,
  PenLine,
  ArrowRightLeft,
  ShoppingCart,
  StickyNote,
  Receipt,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

type Activity = {
  id: string;
  type: string;
  content: string;
  metadata: string | null;
  createdAt: string;
  createdBy: string | null;
};

const activityIcons: Record<string, typeof FileText> = {
  NOTE: StickyNote,
  CALL: Phone,
  EMAIL: Mail,
  QUOTE_CREATED: FileText,
  QUOTE_SENT: Mail,
  QUOTE_VIEWED: Eye,
  QUOTE_SIGNED: PenLine,
  QUOTE_CONVERTED: ShoppingCart,
  STAGE_CHANGED: ArrowRightLeft,
  INVOICE_CREATED: Receipt,
  INVOICE_SENT: Receipt,
  INVOICE_PAID: DollarSign,
  INVOICE_OVERDUE: AlertTriangle,
  PAYMENT_RECEIVED: DollarSign,
};

const activityColors: Record<string, string> = {
  NOTE: "bg-blue-500/10 text-blue-500",
  CALL: "bg-green-500/10 text-green-500",
  EMAIL: "bg-purple-500/10 text-purple-500",
  QUOTE_CREATED: "bg-amber-500/10 text-amber-500",
  QUOTE_SENT: "bg-indigo-500/10 text-indigo-500",
  QUOTE_VIEWED: "bg-cyan-500/10 text-cyan-500",
  QUOTE_SIGNED: "bg-emerald-500/10 text-emerald-500",
  QUOTE_CONVERTED: "bg-emerald-500/10 text-emerald-500",
  STAGE_CHANGED: "bg-orange-500/10 text-orange-500",
  INVOICE_CREATED: "bg-violet-500/10 text-violet-500",
  INVOICE_SENT: "bg-indigo-500/10 text-indigo-500",
  INVOICE_PAID: "bg-emerald-500/10 text-emerald-500",
  INVOICE_OVERDUE: "bg-red-500/10 text-red-500",
  PAYMENT_RECEIVED: "bg-emerald-500/10 text-emerald-500",
};

function formatTimestamp(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className="py-8 text-center">
        <MessageSquare className="mx-auto mb-2 size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Log a note or call to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.type] ?? MessageSquare;
        const colorClass = activityColors[activity.type] ?? "bg-zinc-500/10 text-zinc-500";
        let meta: Record<string, string> | null = null;
        try {
          if (activity.metadata) meta = JSON.parse(activity.metadata);
        } catch { /* ignore */ }

        return (
          <div key={activity.id} className="flex gap-3 rounded-lg border bg-card p-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{activity.content}</p>
              {meta?.quoteId && meta?.quoteNumber && (
                <a
                  href={`/quotes/${meta.quoteId}`}
                  className="mt-0.5 inline-block text-xs text-primary underline-offset-4 hover:underline"
                >
                  View {meta.quoteNumber}
                </a>
              )}
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{formatTimestamp(activity.createdAt)}</span>
                {activity.createdBy && activity.createdBy !== "system" && (
                  <>
                    <span>·</span>
                    <span>by {activity.createdBy}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
