"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ARData = {
  buckets: {
    current: { total: number; count: number };
    days1to30: { total: number; count: number };
    days31to60: { total: number; count: number };
    days60plus: { total: number; count: number };
  };
  topOverdue: Array<{
    id: string;
    invoiceNumber: string;
    contactName: string;
    amountDue: number;
    daysOverdue: number;
    publicToken: string;
  }>;
};

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function BucketSkeleton() {
  return <div className="h-48 w-full animate-pulse rounded bg-muted" />;
}

export function ARAgingCard() {
  const [data, setData] = useState<ARData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/ar-aging")
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accounts Receivable Aging</CardTitle>
        </CardHeader>
        <CardContent><BucketSkeleton /></CardContent>
      </Card>
    );
  }

  const buckets = [
    { label: "Current", ...data.buckets.current, color: "text-muted-foreground" },
    { label: "1-30 days", ...data.buckets.days1to30, color: "text-amber-600" },
    { label: "31-60 days", ...data.buckets.days31to60, color: "text-orange-600" },
    { label: "60+ days", ...data.buckets.days60plus, color: "text-red-600" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Accounts Receivable Aging</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {buckets.map((b) => (
            <div key={b.label} className="overflow-hidden rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">{b.label}</p>
              <p className={`mt-1 truncate text-base font-bold ${b.color}`} title={fmt(b.total)}>{fmt(b.total)}</p>
              <p className="text-xs text-muted-foreground">{b.count} invoice{b.count !== 1 ? "s" : ""}</p>
            </div>
          ))}
        </div>

        {data.topOverdue.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Top Overdue Invoices</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Invoice</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs text-right">Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topOverdue.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm">{inv.contactName}</TableCell>
                    <TableCell>
                      <Link href={`/invoices/${inv.id}`} className="text-sm text-primary hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{fmt(inv.amountDue)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive" className="text-[10px]">{inv.daysOverdue}d</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
