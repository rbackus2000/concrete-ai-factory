import Link from "next/link";
import type { InvoiceStatus } from "@prisma/client";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StateCard } from "@/components/ui/state-card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { listInvoices, getInvoiceStats } from "@/lib/services/invoice-service";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import type { InvoiceStatusType } from "@/lib/schemas/invoice";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysOverdue(dueDate: Date | string): number {
  const due = new Date(dueDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - due.getTime()) / 86400000);
  return Math.max(0, diff);
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  await requireSession();
  const params = await searchParams;

  const [invoices, stats] = await Promise.all([
    listInvoices({
      status: params.status as InvoiceStatus | undefined,
      search: params.search || undefined,
    }),
    getInvoiceStats(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="invoices"
          eyebrow="Invoicing"
          title="Invoices"
          description="Send invoices, track payments, and manage your accounts receivable."
          stats={`${fmt(stats.outstanding)} outstanding | ${fmt(stats.overdue)} overdue | ${fmt(stats.paidThisMonth)} paid this month`}
        />
        <Link href="/invoices">
          <Button disabled>New Invoice</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold">{fmt(stats.outstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{fmt(stats.overdue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Paid This Month</p>
            <p className="text-2xl font-bold text-emerald-600">{fmt(stats.paidThisMonth)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Drafts</p>
            <p className="text-2xl font-bold">{stats.draftCount}</p>
          </CardContent>
        </Card>
      </div>

      <InvoiceFilters currentStatus={params.status} currentSearch={params.search} />

      {invoices.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {params.status
                ? `${params.status.charAt(0) + params.status.slice(1).toLowerCase()} Invoices`
                : "All Invoices"}{" "}
              ({invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="text-xs">Client</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const overdue = daysOverdue(inv.dueDate);
                  const isOverdue = overdue > 0 && !["PAID", "CANCELLED", "DRAFT"].includes(inv.status);
                  const dueSoon = !isOverdue && overdue <= 0 && daysOverdue(new Date(new Date(inv.dueDate).getTime() - 7 * 86400000)) > 0 && !["PAID", "CANCELLED", "DRAFT"].includes(inv.status);

                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link className="text-primary underline-offset-4 hover:underline" href={`/invoices/${inv.id}`}>
                          {inv.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs" style={{ color: "#c8a96e" }}>
                          {inv.contact?.clientNumber ? `RB-${inv.contact.clientNumber}` : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{inv.contactName}</div>
                        {inv.companyName && (
                          <div className="text-xs text-muted-foreground">{inv.companyName}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={inv.status as InvoiceStatusType} />
                        {isOverdue && overdue > 0 && (
                          <span className="ml-1 text-[10px] font-medium text-red-600">{overdue}d</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{fmtDate(inv.issuedAt)}</TableCell>
                      <TableCell>
                        <span className={isOverdue ? "font-medium text-red-600" : dueSoon ? "text-amber-600" : "text-muted-foreground"}>
                          {fmtDate(inv.dueDate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{fmt(inv.total)}</TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {inv.amountPaid > 0 ? fmt(inv.amountPaid) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {inv.amountDue > 0 ? (
                          <span className={isOverdue ? "text-red-600" : ""}>{fmt(inv.amountDue)}</span>
                        ) : (
                          <span className="text-emerald-600">Paid</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <StateCard
          title="No invoices yet"
          description="Invoices are created automatically when you convert a signed quote. You can also create them manually."
        />
      )}
    </div>
  );
}
