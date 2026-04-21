import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { OrderStatusType } from "@/lib/schemas/order";

type TimelineStep = {
  key: OrderStatusType;
  label: string;
  date?: Date | string | null;
  done: boolean;
};

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STANDARD_STEPS: Array<{ key: OrderStatusType; label: string }> = [
  { key: "PENDING", label: "Pending" },
  { key: "IN_PRODUCTION", label: "Production" },
  { key: "QUALITY_CHECK", label: "QC" },
  { key: "READY_TO_SHIP", label: "Ready" },
  { key: "LABEL_PURCHASED", label: "Label" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
];

const STATUS_ORDER: Record<string, number> = {};
STANDARD_STEPS.forEach((s, i) => { STATUS_ORDER[s.key] = i; });
// Also treat IN_TRANSIT and OUT_FOR_DELIVERY as post-SHIPPED
STATUS_ORDER["IN_TRANSIT"] = 5.5;
STATUS_ORDER["OUT_FOR_DELIVERY"] = 5.7;

export function OrderStatusTimeline({
  status,
  events,
}: {
  status: OrderStatusType;
  events: Array<{ event: string; metadata?: string | null; createdAt: Date | string }>;
}) {
  const currentIdx = STATUS_ORDER[status] ?? -1;

  // Build timeline dates from events
  const dateMap: Record<string, Date | string> = {};
  for (const ev of events) {
    if (ev.event === "STATUS_CHANGED" && ev.metadata) {
      try {
        const meta = JSON.parse(ev.metadata);
        if (meta.to) dateMap[meta.to] = ev.createdAt;
      } catch { /* ignore */ }
    }
    if (ev.event === "CREATED") dateMap["PENDING"] = ev.createdAt;
  }

  const steps: TimelineStep[] = STANDARD_STEPS.map((s, i) => ({
    key: s.key,
    label: s.label,
    date: dateMap[s.key] || null,
    done: currentIdx >= i,
  }));

  const isException = status === "EXCEPTION";
  const isCancelled = status === "CANCELLED";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-0">
          {steps.map((step, i) => (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    step.done
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {step.done ? <CheckCircle2 className="size-4" /> : i + 1}
                </div>
                <p className="mt-1 text-[11px] font-medium">{step.label}</p>
                {step.date && (
                  <p className="text-[10px] text-muted-foreground">{fmtDate(step.date)}</p>
                )}
              </div>
              {i < steps.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 ${step.done ? "bg-emerald-300" : "bg-secondary"}`} />
              )}
            </div>
          ))}
        </div>
        {isException && (
          <div className="mt-3 rounded-md bg-red-100 px-3 py-2 text-xs font-medium text-red-700">
            Shipping Exception — needs attention
          </div>
        )}
        {isCancelled && (
          <div className="mt-3 rounded-md bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground">
            Order Cancelled
          </div>
        )}
      </CardContent>
    </Card>
  );
}
