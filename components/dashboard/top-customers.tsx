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

type CustomerRow = {
  rank: number;
  id: string;
  name: string;
  company: string | null;
  totalPaid: number;
  openQuotes: number;
  stage: string;
};

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function TableSkeleton() {
  return <div className="h-64 w-full animate-pulse rounded bg-muted" />;
}

export function TopCustomersCard() {
  const [data, setData] = useState<CustomerRow[] | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/top-customers")
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .catch(() => {});
  }, []);

  const maxPaid = data ? Math.max(...data.map((c) => c.totalPaid), 1) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Customers by Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        {!data ? (
          <TableSkeleton />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No customer data yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 text-xs">#</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs text-right">Total Paid</TableHead>
                <TableHead className="text-xs text-right">Quotes</TableHead>
                <TableHead className="text-xs">Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs text-muted-foreground">{c.rank}</TableCell>
                  <TableCell>
                    <Link href={`/contacts/${c.id}`} className="text-sm font-medium text-primary hover:underline">
                      {c.name}
                    </Link>
                    {c.company && <span className="ml-1 text-xs text-muted-foreground">{c.company}</span>}
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${(c.totalPaid / maxPaid) * 100}%`, backgroundColor: "#c8a96e" }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">{fmt(c.totalPaid)}</TableCell>
                  <TableCell className="text-right text-sm">{c.openQuotes}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">{c.stage}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
