"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Clock, CreditCard } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type LineItem = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
};

type Payment = {
  id: string;
  amount: number;
  method: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
};

type InvoiceData = {
  id: string;
  invoiceNumber: string;
  status: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string | null;
  clientNumber: string | null;
  billingAddress: string | null;
  customerNote: string | null;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  depositPercent: number | null;
  issuedAt: string;
  dueDate: string;
  paidAt: string | null;
  publicToken: string;
  stripePaymentLinkUrl: string | null;
  lineItems: LineItem[];
  payments: Payment[];
};

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function PublicInvoiceView({ invoice, justPaid }: { invoice: InvoiceData; justPaid?: boolean }) {
  const [showPaidBanner, setShowPaidBanner] = useState(justPaid ?? false);

  useEffect(() => {
    // Track view
    fetch(`/api/invoices/${invoice.id}/view`, { method: "POST" }).catch(() => {});
  }, [invoice.id]);

  const dueDate = new Date(invoice.dueDate);
  const now = new Date();
  const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86400000));
  const isOverdue = daysOverdue > 0 && !["PAID", "CANCELLED"].includes(invoice.status);
  const isPaid = invoice.status === "PAID" || invoice.amountDue <= 0;
  const isPartial = invoice.amountPaid > 0 && invoice.amountDue > 0;

  function handlePay() {
    if (invoice.stripePaymentLinkUrl) {
      window.location.href = invoice.stripePaymentLinkUrl;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header Card */}
        <div className="mb-6 flex items-center justify-between rounded-xl border bg-card p-5 shadow-panel">
          <img src="/rb-studio-logo.png" alt="RB Architecture Concrete Studio" className="h-16" />
          <Badge variant="secondary">{invoice.invoiceNumber}</Badge>
        </div>

        {/* Status Banner */}
        {(isPaid || showPaidBanner) && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800">This invoice has been paid. Thank you!</p>
              {invoice.paidAt && <p className="text-sm text-emerald-700">Paid on {fmtDate(invoice.paidAt)}</p>}
            </div>
          </div>
        )}
        {isPartial && !isPaid && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Clock className="size-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">
                Partial payment received. {fmt(invoice.amountDue)} remaining.
              </p>
            </div>
          </div>
        )}
        {isOverdue && !isPaid && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="size-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">This invoice is {daysOverdue} days overdue.</p>
              <p className="text-sm text-red-700">Please submit payment as soon as possible.</p>
            </div>
          </div>
        )}
        {!isPaid && !isPartial && !isOverdue && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <Clock className="size-5 text-blue-600" />
            <p className="font-semibold text-blue-800">Payment due by {fmtDate(invoice.dueDate)}</p>
          </div>
        )}

        {/* Invoice Info */}
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Bill To</p>
            <p className="font-semibold text-foreground">{invoice.contactName}</p>
            {invoice.companyName && <p className="text-sm text-muted-foreground">{invoice.companyName}</p>}
            {invoice.clientNumber && (
              <p className="font-mono text-xs" style={{ color: "#c8a96e" }}>Client: RB-{invoice.clientNumber}</p>
            )}
            {invoice.contactEmail && <p className="text-sm text-muted-foreground">{invoice.contactEmail}</p>}
            {invoice.billingAddress && <p className="mt-1 text-sm text-muted-foreground">{invoice.billingAddress}</p>}
          </div>
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Invoice Details</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice #</span>
                <span className="font-medium text-foreground">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issued</span>
                <span className="text-foreground">{fmtDate(invoice.issuedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className={isOverdue ? "text-red-600" : "text-muted-foreground"}>Due</span>
                <span className={isOverdue ? "font-semibold text-red-600" : "text-foreground"}>{fmtDate(invoice.dueDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Note */}
        {invoice.customerNote && (
          <div className="mb-4 rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{invoice.customerNote}</p>
          </div>
        )}

        {/* Line Items */}
        <div className="mb-4 overflow-hidden rounded-xl border border-border bg-white">
          <div className="border-b bg-muted/50 px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">Items</h2>
          </div>
          <div className="divide-y">
            {invoice.lineItems.map((item) => (
              <div key={item.id} className="flex gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  {item.description && <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-foreground">{fmt(item.lineTotal)}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(item.unitPrice)} x {item.quantity}
                    {item.discount > 0 && ` (-${item.discount}%)`}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t bg-muted/50 px-5 py-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{fmt(invoice.subtotal)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
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
            {invoice.amountPaid > 0 && (
              <>
                <div className="flex justify-between text-emerald-600">
                  <span>Paid</span>
                  <span>-{fmt(invoice.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Amount Due</span>
                  <span className={isOverdue ? "text-red-600" : ""}>{fmt(invoice.amountDue)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pay Now */}
        {!isPaid && invoice.amountDue > 0 && (
          <div className="rounded-xl border border-border bg-white p-6 text-center">
            <p className="mb-1 text-lg font-bold text-foreground">{fmt(invoice.amountDue)}</p>
            <p className="mb-4 text-sm text-muted-foreground">
              {isOverdue ? "Payment is overdue" : `Due ${fmtDate(invoice.dueDate)}`}
            </p>
            {invoice.stripePaymentLinkUrl ? (
              <button
                onClick={handlePay}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <CreditCard className="size-5" />
                Pay Now
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Contact us at{" "}
                <a href="mailto:info@rbstudio.com" className="text-primary underline-offset-4 hover:underline">
                  info@rbstudio.com
                </a>{" "}
                to arrange payment.
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>RB Architecture Concrete Studio</p>
        </div>
      </div>
    </div>
  );
}
