import Link from "next/link";
import { Eye, Clock } from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StateCard } from "@/components/ui/state-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { listQuotes } from "@/lib/services/quote-service";

import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { QuoteFilters } from "@/components/quotes/quote-filters";

export const dynamic = "force-dynamic";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  await requireSession();
  const params = await searchParams;

  const quotes = await listQuotes({
    status: params.status as "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "CONVERTED" | "EXPIRED" | "DECLINED" | undefined,
    search: params.search || undefined,
  });

  const openQuotes = quotes.filter((q) => ["SENT", "VIEWED"].includes(q.status));
  const openTotal = openQuotes.reduce((sum, q) => sum + q.total, 0);
  const signed = quotes.filter((q) => q.signedAt).length;
  const convRate = quotes.length > 0 ? Math.round((signed / quotes.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="quotes"
          eyebrow="Quotes"
          title="Quote management"
          description="Build, send, and track quotes. Monitor customer views and collect e-signatures."
          stats={`${openQuotes.length} open | $${openTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending | ${convRate}% conversion rate`}
        />
        <Link href="/quotes/new">
          <Button>New Quote</Button>
        </Link>
      </div>

      <QuoteFilters currentStatus={params.status} currentSearch={params.search} />

      {quotes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {params.status
                ? `${params.status.charAt(0) + params.status.slice(1).toLowerCase()} Quotes`
                : "All Quotes"}{" "}
              ({quotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead className="text-xs">Client</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">
                      <Link
                        className="text-primary underline-offset-4 hover:underline"
                        href={`/quotes/${quote.id}`}
                      >
                        {quote.quoteNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs" style={{ color: "#c8a96e" }}>
                        {quote.contact?.clientNumber ? `RB-${quote.contact.clientNumber}` : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{quote.contactName}</div>
                      {quote.companyName && (
                        <div className="text-xs text-muted-foreground">
                          {quote.companyName}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <QuoteStatusBadge status={quote.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${quote.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {quote._count.lineItems}
                    </TableCell>
                    <TableCell className="text-right">
                      {quote.viewCount > 0 ? (
                        <Badge variant="warning">
                          <Eye className="mr-1 size-3" />
                          {quote.viewCount}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {quote.invoice ? (
                        <Link href={`/invoices/${quote.invoice.id}`} className="text-primary hover:underline underline-offset-4">
                          <Badge variant={quote.invoice.status === "PAID" ? "success" : quote.invoice.status === "OVERDUE" ? "destructive" : "secondary"}>
                            {quote.invoice.status}
                          </Badge>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(quote.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <StateCard
          title="No quotes yet"
          description="Create your first quote to start sending professional proposals to customers."
          action={
            <Link href="/quotes/new">
              <Button>Create First Quote</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
