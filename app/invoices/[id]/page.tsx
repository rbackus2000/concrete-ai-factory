import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clock, Send, Eye, DollarSign, CheckCircle2, XCircle, Bell, AlertTriangle,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getInvoice } from "@/lib/services/invoice-service";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoiceActions } from "@/components/invoices/invoice-actions";
import type { InvoiceStatusType } from "@/lib/schemas/invoice";

export const dynamic = "force-dynamic";

const EVENT_ICONS: Record<string, typeof Clock> = {
  CREATED: Clock,
  SENT: Send,
  VIEWED: Eye,
  PAYMENT_RECEIVED: DollarSign,
  PAYMENT_FAILED: XCircle,
  REMINDER_SENT: Bell,
  OVERDUE: AlertTriangle,
  CANCELLED: XCircle,
};

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(d: Date) {
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86400000));
  const isOverdue = daysOverdue > 0 && !["PAID", "CANCELLED", "DRAFT"].includes(invoice.status);

  const methodLabels: Record<string, string> = {
    STRIPE_CARD: "Card", STRIPE_ACH: "ACH", CASH: "Cash",
    CHECK: "Check", WIRE: "Wire", OTHER: "Other",
  };

  // Status timeline steps
  const steps = [
    { key: "DRAFT", label: "Created", date: invoice.createdAt, done: true },
    { key: "SENT", label: "Sent", date: invoice.sentAt, done: !!invoice.sentAt },
    { key: "VIEWED", label: "Viewed", date: invoice.viewedAt, done: !!invoice.viewedAt },
    { key: "PAID", label: invoice.amountPaid > 0 && invoice.amountDue > 0 ? "Partial" : "Paid", date: invoice.paidAt, done: invoice.status === "PAID" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Invoicing"
          title={invoice.invoiceNumber}
          description={`${invoice.contactName}${invoice.companyName ? ` — ${invoice.companyName}` : ""}`}
        />
        <div className="flex items-center gap-3">
          <InvoiceStatusBadge status={invoice.status as InvoiceStatusType} />
          <Link href="/invoices">
            <Button variant="outline">Back to Invoices</Button>
          </Link>
        </div>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-0">
            {steps.map((step, i) => (
              <div key={step.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${step.done ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground"}`}>
                    {step.done ? <CheckCircle2 className="size-4" /> : i + 1}
                  </div>
                  <p className="mt-1 text-[11px] font-medium">{step.label}</p>
                  {step.date && (
                    <p className="text-[10px] text-muted-foreground">{fmtDate(new Date(step.date))}</p>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className={`mx-1 h-0.5 flex-1 ${step.done ? "bg-emerald-300" : "bg-secondary"}`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{fmt(invoice.total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-xl font-bold text-emerald-600">{fmt(invoice.amountPaid)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Amount Due</p>
                <p className={`text-xl font-bold ${isOverdue ? "text-red-600" : ""}`}>{fmt(invoice.amountDue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className={`text-xl font-bold ${isOverdue ? "text-red-600" : ""}`}>
                  {fmtDate(dueDate)}
                </p>
                {isOverdue && <p className="text-xs text-red-600">{daysOverdue} days overdue</p>}
              </CardContent>
            </Card>
          </div>

          {/* Line Items */}
          <Card>
            <CardHeader><CardTitle>Line Items ({invoice.lineItems.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="font-medium">{item.name}</span>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{fmt(item.unitPrice)}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(item.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 space-y-1 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{fmt(invoice.subtotal)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Discount</span>
                    <span>-{fmt(invoice.discountAmount)}</span>
                  </div>
                )}
                {invoice.taxRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({invoice.taxRate}%)</span>
                    <span>{fmt(invoice.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>Total</span>
                  <span>{fmt(invoice.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          {invoice.payments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Card</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground">
                          {fmtDateTime(p.paidAt ?? p.createdAt)}
                        </TableCell>
                        <TableCell>{methodLabels[p.method] ?? p.method}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-600">
                          {fmt(p.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.status === "SUCCEEDED" ? "success" : p.status === "FAILED" ? "destructive" : "secondary"}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.last4 ? `${p.brand ?? "card"} ···${p.last4}` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Event Log */}
          <Card>
            <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {invoice.events.map((event) => {
                const Icon = EVENT_ICONS[event.event] ?? Clock;
                return (
                  <div key={event.id} className="flex gap-3 text-sm">
                    <div className="mt-0.5 rounded-full bg-secondary p-1.5">
                      <Icon className="size-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{event.event}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDateTime(event.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — Actions Panel */}
        <InvoiceActions
          invoice={{
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            amountDue: invoice.amountDue,
            contactEmail: invoice.contactEmail,
            contactName: invoice.contactName,
            stripePaymentLinkUrl: invoice.stripePaymentLinkUrl,
            publicToken: invoice.publicToken,
            notes: invoice.notes,
            customerNote: invoice.customerNote,
            contactId: invoice.contactId,
            quote: invoice.quote,
            order: invoice.order ?? null,
          }}
        />
      </div>
    </div>
  );
}
