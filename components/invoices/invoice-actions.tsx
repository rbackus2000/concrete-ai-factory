"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Send, Bell, DollarSign, Link2, XCircle, Copy, Check, Printer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_METHODS, type PaymentMethodType } from "@/lib/schemas/invoice";

type InvoiceForActions = {
  id: string;
  invoiceNumber: string;
  status: string;
  amountDue: number;
  contactEmail: string;
  contactName: string;
  stripePaymentLinkUrl: string | null;
  publicToken: string;
  notes: string | null;
  customerNote: string | null;
  contactId: string | null;
  quote: { id: string; quoteNumber: string } | null;
  order: { id: string; orderNumber: string; status: string } | null;
};

const methodLabels: Record<string, string> = {
  STRIPE_CARD: "Stripe (Card)",
  STRIPE_ACH: "Stripe (ACH)",
  CASH: "Cash",
  CHECK: "Check",
  WIRE: "Wire Transfer",
  OTHER: "Other",
};

export function InvoiceActions({ invoice }: { invoice: InvoiceForActions }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(invoice.amountDue);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("CHECK");
  const [paymentNote, setPaymentNote] = useState("");
  const [copied, setCopied] = useState(false);

  async function doAction(action: string, url: string, method = "POST") {
    setLoading(action);
    try {
      const res = await fetch(url, { method });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || `Failed: ${action}`);
        return null;
      }
      router.refresh();
      return await res.json();
    } finally {
      setLoading(null);
    }
  }

  async function handleSend() {
    await doAction("send", `/api/invoices/${invoice.id}/send`);
  }

  async function handleReminder() {
    await doAction("reminder", `/api/invoices/${invoice.id}/reminder`);
  }

  async function handleGenerateLink() {
    const result = await doAction("link", `/api/invoices/${invoice.id}/payment-link`);
    if (result?.data?.url) {
      router.refresh();
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this invoice? This cannot be undone.")) return;
    await doAction("cancel", `/api/invoices/${invoice.id}/cancel`);
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setLoading("payment");
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          method: paymentMethod,
          note: paymentNote,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to record payment");
        return;
      }
      setShowPaymentForm(false);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  function copyLink() {
    if (invoice.stripePaymentLinkUrl) {
      navigator.clipboard.writeText(invoice.stripePaymentLinkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const canSend = ["DRAFT"].includes(invoice.status);
  const canRemind = ["SENT", "VIEWED", "PARTIAL", "OVERDUE"].includes(invoice.status);
  const canPay = !["PAID", "CANCELLED", "REFUNDED"].includes(invoice.status);
  const canCancel = !["PAID", "CANCELLED", "REFUNDED"].includes(invoice.status);
  const canGenerateLink = canPay && invoice.amountDue > 0;

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <Card>
        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {canSend && (
            <Button className="w-full justify-start" onClick={handleSend} disabled={loading === "send"}>
              <Send className="mr-2 size-4" />
              {loading === "send" ? "Sending..." : "Send Invoice"}
            </Button>
          )}
          {canRemind && (
            <Button variant="outline" className="w-full justify-start" onClick={handleReminder} disabled={loading === "reminder"}>
              <Bell className="mr-2 size-4" />
              {loading === "reminder" ? "Sending..." : "Send Reminder"}
            </Button>
          )}
          {canPay && (
            <Button variant="outline" className="w-full justify-start" onClick={() => setShowPaymentForm(!showPaymentForm)}>
              <DollarSign className="mr-2 size-4" />
              Record Payment
            </Button>
          )}
          {canGenerateLink && (
            <Button variant="outline" className="w-full justify-start" onClick={handleGenerateLink} disabled={loading === "link"}>
              <Link2 className="mr-2 size-4" />
              {loading === "link" ? "Generating..." : "Generate Payment Link"}
            </Button>
          )}
          <a href={`/inv/${invoice.publicToken}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full justify-start">
              <Link2 className="mr-2 size-4" />
              Preview Invoice
            </Button>
          </a>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              const w = window.open(`/inv/${invoice.publicToken}`, "_blank");
              if (w) {
                w.addEventListener("load", () => {
                  setTimeout(() => w.print(), 500);
                });
              }
            }}
          >
            <Printer className="mr-2 size-4" />
            Print Invoice
          </Button>
          {canCancel && (
            <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={handleCancel} disabled={loading === "cancel"}>
              <XCircle className="mr-2 size-4" />
              Cancel Invoice
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Payment Form */}
      {showPaymentForm && (
        <Card>
          <CardHeader><CardTitle>Record Payment</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Amount</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0.01"
                  max={invoice.amountDue}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {PAYMENT_METHODS.filter((m) => m !== "STRIPE_CARD" && m !== "STRIPE_ACH").map((m) => (
                    <option key={m} value={m}>{methodLabels[m]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Note</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Optional note..."
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading === "payment"}>
                  {loading === "payment" ? "Recording..." : "Record"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Stripe Link */}
      {invoice.stripePaymentLinkUrl && (
        <Card>
          <CardHeader><CardTitle>Payment Link</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={invoice.stripePaymentLinkUrl}
                className="flex-1 rounded-lg border bg-secondary px-3 py-2 text-xs"
              />
              <Button size="sm" variant="outline" onClick={copyLink}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact link */}
      {invoice.contactId && (
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="text-muted-foreground">Linked Contact</p>
            <a href={`/contacts/${invoice.contactId}`} className="text-primary hover:underline underline-offset-4">
              {invoice.contactName}
            </a>
          </CardContent>
        </Card>
      )}

      {/* Linked Order */}
      {invoice.order && (
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="text-muted-foreground">Linked Order</p>
            <div className="flex items-center gap-2">
              <a href={`/orders/${invoice.order.id}`} className="text-primary hover:underline underline-offset-4">
                {invoice.order.orderNumber}
              </a>
              <Badge variant={
                invoice.order.status === "DELIVERED" ? "success"
                : invoice.order.status === "EXCEPTION" ? "destructive"
                : "secondary"
              }>
                {invoice.order.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Source quote */}
      {invoice.quote && (
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="text-muted-foreground">Source Quote</p>
            <a href={`/quotes/${invoice.quote.id}`} className="text-primary hover:underline underline-offset-4">
              {invoice.quote.quoteNumber}
            </a>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader><CardTitle>Internal Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
