"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  StickyNote,
  Phone,
  Mail,
  FileText,
  Edit,
  Trash2,
  ExternalLink,
  X,
  Eye,
  PenTool,
  Send,
  Clock,
  CheckCircle2,
  ShoppingCart,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactStageBadge } from "@/components/contacts/contact-stage-badge";
import { ActivityTimeline } from "@/components/contacts/activity-timeline";
import { LogActivityModal } from "@/components/contacts/log-activity-modal";
import { LEAD_STAGES, type LeadStageType } from "@/lib/schemas/contact";

type Quote = {
  id: string;
  quoteNumber: string;
  status: string;
  total: number;
  pricingTier: string;
  createdAt: string;
  sentAt: string | null;
  viewedAt: string | null;
  viewCount: number;
  signedAt: string | null;
  signerName: string | null;
  convertedToOrderAt: string | null;
  contactEmail: string;
  publicToken: string;
  _count: { lineItems: number };
};

type ContactInvoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  amountDue: number;
  amountPaid: number;
  dueDate: string;
  createdAt: string;
};

type Activity = {
  id: string;
  type: string;
  content: string;
  metadata: string | null;
  createdAt: string;
  createdBy: string | null;
};

type ReservedItem = {
  itemName: string;
  quantity: number;
  quoteNumber: string;
  quoteId: string;
};

type ContactOrder = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  shippedAt: string | null;
  _count: { lineItems: number };
};

type ContactEnrollment = {
  id: string;
  sequenceName: string;
  sequenceId: string;
  trigger: string;
  status: string;
  currentStep: number;
  nextSendAt: string | null;
  createdAt: string;
};

type ContactEmailLog = {
  id: string;
  subject: string;
  sentAt: string;
  openedAt: string | null;
  clickedAt: string | null;
};

type ContactDetail = {
  id: string;
  clientNumber: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  title: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source: string | null;
  tags: string[];
  notes: string | null;
  stage: string;
  totalQuoted: number;
  totalWon: number;
  quoteCount: number;
  lastActivity: string | null;
  quotes: Quote[];
  invoices: ContactInvoice[];
  orders: ContactOrder[];
  activities: Activity[];
  reservedItems: ReservedItem[];
  isUnsubscribed?: boolean;
  enrollments?: ContactEnrollment[];
  emailLogs?: ContactEmailLog[];
  createdAt: string;
};

const stageLabels: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTED: "Quoted",
  NEGOTIATING: "Negotiating",
  WON: "Won",
  LOST: "Lost",
};

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const quoteStatusVariants: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SENT: "default",
  VIEWED: "warning",
  SIGNED: "success",
  CONVERTED: "success",
  EXPIRED: "destructive",
  DECLINED: "destructive",
};

function QuoteCard({ quote }: { quote: Quote }) {
  return (
    <div className="rounded-lg border bg-card">
      {/* Header row */}
      <a
        href={`/quotes/${quote.id}`}
        className="flex items-center justify-between border-b px-3 py-2.5 hover:bg-secondary/30"
      >
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{quote.quoteNumber}</span>
          <Badge variant={quoteStatusVariants[quote.status] ?? "outline"}>{quote.status}</Badge>
          <Badge variant="outline" className="text-[10px]">
            {quote.pricingTier === "WHOLESALE" ? "Wholesale" : "Retail"}
          </Badge>
        </div>
        <span className="text-sm font-bold">{formatCurrency(quote.total)}</span>
      </a>

      {/* Timeline rows */}
      <div className="space-y-0 px-3 py-2 text-xs">
        {/* Created */}
        <div className="flex items-center gap-2 py-1">
          <Clock className="size-3 text-muted-foreground" />
          <span className="text-muted-foreground">Created</span>
          <span className="ml-auto">{formatDate(quote.createdAt)}</span>
        </div>

        {/* Sent */}
        {quote.sentAt ? (
          <div className="flex items-center gap-2 py-1">
            <Send className="size-3 text-blue-500" />
            <span className="text-muted-foreground">Sent to {quote.contactEmail}</span>
            <span className="ml-auto">{formatDateTime(quote.sentAt)}</span>
          </div>
        ) : quote.status === "DRAFT" ? (
          <div className="flex items-center gap-2 py-1 text-muted-foreground/50">
            <Send className="size-3" />
            <span>Not sent yet</span>
          </div>
        ) : null}

        {/* Viewed */}
        {quote.viewedAt ? (
          <div className="flex items-center gap-2 py-1">
            <Eye className="size-3 text-amber-500" />
            <span className="text-muted-foreground">
              Viewed {quote.viewCount} time{quote.viewCount !== 1 ? "s" : ""}
            </span>
            <span className="ml-auto">First: {formatDateTime(quote.viewedAt)}</span>
          </div>
        ) : quote.sentAt ? (
          <div className="flex items-center gap-2 py-1 text-muted-foreground/50">
            <Eye className="size-3" />
            <span>Not yet viewed</span>
          </div>
        ) : null}

        {/* Signed */}
        {quote.signedAt ? (
          <div className="flex items-center gap-2 py-1">
            <PenTool className="size-3 text-emerald-500" />
            <span className="text-muted-foreground">
              Signed by {quote.signerName}
            </span>
            <span className="ml-auto">{formatDateTime(quote.signedAt)}</span>
          </div>
        ) : quote.viewedAt ? (
          <div className="flex items-center gap-2 py-1 text-muted-foreground/50">
            <PenTool className="size-3" />
            <span>Awaiting signature</span>
          </div>
        ) : null}

        {/* Converted */}
        {quote.convertedToOrderAt && (
          <div className="flex items-center gap-2 py-1">
            <ShoppingCart className="size-3 text-emerald-500" />
            <span className="text-muted-foreground">Converted to order</span>
            <span className="ml-auto">{formatDateTime(quote.convertedToOrderAt)}</span>
          </div>
        )}

        {/* Items + link */}
        <div className="flex items-center justify-between border-t pt-1.5 mt-1">
          <span className="text-muted-foreground">{quote._count.lineItems} line items</span>
          <a
            href={`/quotes/${quote.id}`}
            className="text-primary hover:underline underline-offset-4"
          >
            View full quote
          </a>
        </div>
      </div>
    </div>
  );
}

export function ContactDetailClient({ contact }: { contact: ContactDetail }) {
  const router = useRouter();
  const [activityModal, setActivityModal] = useState<"NOTE" | "CALL" | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleStageChange(newStage: string) {
    await fetch(`/api/contacts/${contact.id}/stage`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete ${contact.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/contacts");
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  const initials = contact.name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const addressParts = [contact.address, contact.city, contact.state, contact.zip]
    .filter(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* LEFT COLUMN — Activity Timeline */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{contact.name}</h1>
            {contact.clientNumber && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`RB-${contact.clientNumber}`);
                }}
                title="Click to copy"
                className="rounded border px-2 py-0.5 font-mono text-sm font-bold tracking-wide"
                style={{ color: "#c8a96e", borderColor: "#c8a96e40" }}
              >
                RB-{contact.clientNumber}
              </button>
            )}
            <ContactStageBadge stage={contact.stage as LeadStageType} />
            {contact.isUnsubscribed && (
              <Badge variant="destructive">Unsubscribed</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <a href={`/contacts/${contact.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="mr-1.5 size-3" />
                Edit
              </Button>
            </a>
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="mr-1.5 size-3" />
              Delete
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardContent className="flex flex-wrap gap-2 p-3">
            <Button size="sm" variant="outline" onClick={() => setActivityModal("NOTE")}>
              <StickyNote className="mr-1.5 size-3" />
              Log Note
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActivityModal("CALL")}>
              <Phone className="mr-1.5 size-3" />
              Log Call
            </Button>
            {contact.email && (
              <a href={`mailto:${contact.email}`}>
                <Button size="sm" variant="outline">
                  <Mail className="mr-1.5 size-3" />
                  Send Email
                </Button>
              </a>
            )}
            <a href={`/quotes/new?contactId=${contact.id}`}>
              <Button size="sm">
                <FileText className="mr-1.5 size-3" />
                New Quote
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Quotes — Full Detail */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Quotes ({contact.quotes.length})</CardTitle>
            <a href={`/quotes/new?contactId=${contact.id}`}>
              <Button size="sm" variant="outline">New Quote</Button>
            </a>
          </CardHeader>
          <CardContent>
            {contact.quotes.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No quotes yet</p>
            ) : (
              <div className="space-y-3">
                {contact.quotes.map((q) => (
                  <QuoteCard key={q.id} quote={q} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline activities={contact.activities} />
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN — Info Panel */}
      <div className="space-y-4">
        {/* Avatar + Info */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-lg font-semibold">
                {initials}
              </div>
              <div>
                <p className="font-semibold">{contact.name}</p>
                {contact.title && contact.company ? (
                  <p className="text-sm text-muted-foreground">{contact.title} at {contact.company}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">{contact.company || contact.title || ""}</p>
                )}
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <a href={`mailto:${contact.email}`} className="text-primary underline-offset-4 hover:underline">{contact.email}</a>
              </div>
              {contact.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <a href={`tel:${contact.phone}`} className="text-primary underline-offset-4 hover:underline">{contact.phone}</a>
                </div>
              )}
              {addressParts.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p>{addressParts.join(", ")}</p>
                </div>
              )}
              {contact.source && (
                <div>
                  <p className="text-xs text-muted-foreground">Lead Source</p>
                  <p>{contact.source}</p>
                </div>
              )}
            </div>

            {/* Tags */}
            {contact.tags.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs text-muted-foreground">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {contact.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Stage Selector */}
            <div className="mt-4">
              <p className="mb-1.5 text-xs text-muted-foreground">Stage</p>
              <select
                value={contact.stage}
                onChange={(e) => handleStageChange(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {LEAD_STAGES.map((s) => (
                  <option key={s} value={s}>{stageLabels[s]}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Quoted</span>
              <span className="font-medium">{formatCurrency(contact.totalQuoted)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Won</span>
              <span className="font-medium text-emerald-600">{formatCurrency(contact.totalWon)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quotes</span>
              <span className="font-medium">{contact.quoteCount}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Last Activity</span>
              <span className="font-medium">{contact.lastActivity ? formatDate(contact.lastActivity) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">{formatDate(contact.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        {contact.invoices.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Invoices ({contact.invoices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {contact.invoices.map((inv) => {
                  const isOverdue = inv.status === "OVERDUE";
                  const isPaid = inv.status === "PAID";
                  return (
                    <a
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="flex items-center justify-between rounded-lg border p-2.5 text-sm hover:bg-secondary/40"
                    >
                      <div>
                        <span className="font-medium">{inv.invoiceNumber}</span>
                        <Badge
                          variant={isPaid ? "success" : isOverdue ? "destructive" : "secondary"}
                          className="ml-2 text-[10px]"
                        >
                          {inv.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <span className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>
                          {formatCurrency(inv.amountDue)}
                        </span>
                        <p className="text-[10px] text-muted-foreground">of {formatCurrency(inv.total)}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between border-t pt-2 text-sm">
                <span className="text-muted-foreground">Total Outstanding</span>
                <span className="font-semibold">
                  {formatCurrency(contact.invoices.reduce((sum, i) => sum + i.amountDue, 0))}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders */}
        {contact.orders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {contact.orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between text-sm">
                    <a
                      href={`/orders/${order.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {order.orderNumber}
                    </a>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {order._count.lineItems} items
                      </span>
                      <Badge variant={
                        order.status === "DELIVERED" ? "success"
                        : order.status === "EXCEPTION" ? "destructive"
                        : order.status === "CANCELLED" ? "secondary"
                        : "default"
                      }>
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Marketing Sequences */}
        {(contact.enrollments ?? []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sequences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(contact.enrollments ?? []).map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <a
                      href={`/marketing/sequences/${e.sequenceId}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {e.sequenceName}
                    </a>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Step {e.currentStep + 1}
                      </span>
                      <Badge variant={
                        e.status === "ACTIVE" ? "default"
                        : e.status === "COMPLETED" ? "outline"
                        : e.status === "UNENROLLED" ? "destructive"
                        : "secondary"
                      }>
                        {e.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Emails */}
        {(contact.emailLogs ?? []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Email Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(contact.emailLogs ?? []).slice(0, 10).map((log) => (
                  <div key={log.id} className="text-sm">
                    <p className="font-medium">{log.subject}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>Sent {formatDate(log.sentAt)}</span>
                      {log.openedAt && <span className="text-amber-600">Opened {formatDateTime(log.openedAt)}</span>}
                      {log.clickedAt && <span className="text-blue-600">Clicked {formatDateTime(log.clickedAt)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Reserved */}
        {contact.reservedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory Reserved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {contact.reservedItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.itemName}</span>
                      <span className="text-muted-foreground"> x {item.quantity}</span>
                    </div>
                    <a
                      href={`/quotes/${item.quoteId}`}
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      {item.quoteNumber}
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {contact.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{contact.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      {activityModal && (
        <LogActivityModal
          contactId={contact.id}
          contactName={contact.name}
          type={activityModal}
          onClose={() => setActivityModal(null)}
          onSaved={() => {
            setActivityModal(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
