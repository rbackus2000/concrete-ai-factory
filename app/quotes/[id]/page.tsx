import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, PenTool, Clock, Edit, Mail, CheckCircle2 } from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getQuote } from "@/lib/services/quote-service";

import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { QuoteActions } from "@/components/quotes/quote-actions";

const EVENT_ICONS: Record<string, typeof Clock> = {
  CREATED: Clock,
  UPDATED: Edit,
  SENT: Mail,
  VIEWED: Eye,
  SIGNED: PenTool,
  CONVERTED: CheckCircle2,
};

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const quote = await getQuote(id);

  if (!quote) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Quotes"
          title={quote.quoteNumber}
          description={`${quote.contactName}${quote.companyName ? ` — ${quote.companyName}` : ""}`}
        />
        <div className="flex items-center gap-3">
          <QuoteStatusBadge status={quote.status} />
          <Link href="/quotes">
            <Button variant="outline">Back to Quotes</Button>
          </Link>
        </div>
      </div>

      {/* Action buttons */}
      <QuoteActions quote={quote} />

      {/* Stats row */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Total</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${quote.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <Badge variant={quote.pricingTier === "WHOLESALE" ? "warning" : "secondary"} className="mt-1">
              {quote.pricingTier === "WHOLESALE" ? "Wholesale" : "Retail"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{quote.lineItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Views</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{quote.viewCount}</p>
            {quote.viewedAt && (
              <p className="text-xs text-muted-foreground">
                First viewed {quote.viewedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Valid Until</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">
              {quote.validUntil
                ? quote.validUntil.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                : "No expiry"}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* Main column */}
        <div className="space-y-4">
          {/* Customer info */}
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="mt-1 font-medium">{quote.contactName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="mt-1 font-medium">
                  <a href={`mailto:${quote.contactEmail}`} className="text-primary hover:underline">
                    {quote.contactEmail}
                  </a>
                </p>
              </div>
              {quote.contactPhone && (
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="mt-1 font-medium">{quote.contactPhone}</p>
                </div>
              )}
              {quote.companyName && (
                <div>
                  <p className="text-muted-foreground">Company</p>
                  <p className="mt-1 font-medium">{quote.companyName}</p>
                </div>
              )}
              {quote.customerMessage && (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground">Message to customer</p>
                  <p className="mt-1 text-foreground/85">{quote.customerMessage}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items ({quote.lineItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Disc</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quote.lineItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className={item.isOptional && !item.isSelected ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {item.isOptional && <Badge variant="warning">Optional</Badge>}
                          {item.skuCode && <Badge variant="secondary">{item.skuCode}</Badge>}
                        </div>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {item.discount > 0 ? `${item.discount}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${item.lineTotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="mt-4 space-y-1 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${quote.subtotal.toFixed(2)}</span>
                </div>
                {quote.discountAmount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Discount</span>
                    <span>-${quote.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {quote.taxRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({quote.taxRate}%)</span>
                    <span>${quote.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>Total</span>
                  <span>${quote.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signature */}
          {quote.signedAt && (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="size-4" />
                  Signature
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Signed by</p>
                  <p className="mt-1 font-medium">{quote.signerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Signed at</p>
                  <p className="mt-1 font-medium">
                    {quote.signedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                {quote.signerIp && (
                  <div>
                    <p className="text-muted-foreground">IP</p>
                    <p className="mt-1 font-mono text-xs">{quote.signerIp}</p>
                  </div>
                )}
                {quote.signatureData && (
                  <div className="sm:col-span-2 mt-2 rounded-lg border bg-white p-3">
                    <img src={quote.signatureData} alt="Signature" className="h-16" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Internal Notes */}
          {quote.notes && (
            <Card>
              <CardHeader><CardTitle>Internal Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quote.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar column */}
        <div className="space-y-4">
          {/* Details card */}
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{quote.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
              {quote.sentAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sent</span>
                  <span>{quote.sentAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Views</span>
                <Badge variant={quote.viewCount > 0 ? "warning" : "secondary"}>
                  {quote.viewCount}
                </Badge>
              </div>
              {quote.contactId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact</span>
                  <Link href={`/contacts/${quote.contactId}`} className="text-primary hover:underline">
                    View Contact
                  </Link>
                </div>
              )}
              <div className="border-t pt-2">
                <p className="mb-1 text-xs text-muted-foreground">Public Link</p>
                <a
                  href={`/q/${quote.publicToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline break-all"
                >
                  /q/{quote.publicToken}
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {quote.events.map((event) => {
                const EventIcon = EVENT_ICONS[event.event] ?? Clock;
                return (
                  <div key={event.id} className="flex gap-3 text-sm">
                    <div className="mt-0.5 rounded-full bg-secondary p-1.5">
                      <EventIcon className="size-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{event.event}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.createdAt.toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      {event.ip && (
                        <p className="text-xs text-muted-foreground font-mono">{event.ip}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
