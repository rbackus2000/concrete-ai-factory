"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { HelpButton } from "@/components/app-shell/help-button";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ReportData = {
  title: string;
  rows: Array<Record<string, string | number | boolean | null>>;
  count: number;
};

const PERIOD_OPTIONS = [
  { label: "This Month", from: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]; }, to: () => new Date().toISOString().split("T")[0] },
  { label: "Last Month", from: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split("T")[0]; }, to: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split("T")[0]; } },
  { label: "Last Quarter", from: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() - 3, 1).toISOString().split("T")[0]; }, to: () => new Date().toISOString().split("T")[0] },
  { label: "YTD", from: () => new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0], to: () => new Date().toISOString().split("T")[0] },
  { label: "All Time", from: () => "", to: () => "" },
];

const REPORT_NAMES: Record<string, string> = {
  "revenue-summary": "Revenue Summary",
  "ar-aging": "Accounts Receivable Aging",
  "invoice-history": "Invoice Payment History",
  "top-customers": "Top Customers by Revenue",
  "quote-activity": "Quote Activity",
  "quote-conversion": "Quote Conversion Rate",
  "pipeline-by-stage": "Pipeline Value by Stage",
  "inventory-valuation": "Inventory Valuation Summary",
  "stock-status": "Stock Status Report",
  "low-stock": "Low Stock Alert Report",
  "material-usage": "Material Usage Report",
  "purchase-orders": "Purchase Order History",
  "order-fulfillment": "Order Fulfillment Summary",
  "shipping-cost": "Shipping Cost Summary",
  "production-queue": "Production Queue Status",
  "email-campaigns": "Email Campaign Performance",
  "sequence-performance": "Sequence Performance",
  "contact-growth": "Contact Growth Over Time",
};

export default function ReportViewerPage() {
  const params = useParams<{ type: string }>();
  const reportType = params.type;

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activePeriod, setActivePeriod] = useState("All Time");

  const fetchReport = useCallback(async (fromDate: string, toDate: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const qs = params.toString();
      const res = await fetch(`/api/reports/${reportType}${qs ? `?${qs}` : ""}`);
      const json = await res.json();
      setData(json.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [reportType]);

  useEffect(() => {
    fetchReport(from, to);
  }, [fetchReport, from, to]);

  function applyPeriod(period: typeof PERIOD_OPTIONS[number]) {
    setActivePeriod(period.label);
    const f = period.from();
    const t = period.to();
    setFrom(f);
    setTo(t);
  }

  const columns = data?.rows?.[0] ? Object.keys(data.rows[0]) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reports">
          <Button variant="ghost" size="sm" className="h-8">
            <ArrowLeft className="mr-1 size-3" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">{REPORT_NAMES[reportType] ?? reportType}</h1>
          <p className="text-xs text-muted-foreground">{data?.count ?? 0} rows</p>
        </div>
        <HelpButton helpKey="reports-viewer" />
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
          <div className="flex flex-wrap gap-1">
            {PERIOD_OPTIONS.map((p) => (
              <Button
                key={p.label}
                variant={activePeriod === p.label ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => applyPeriod(p)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setActivePeriod("Custom"); }}
              className="h-7 w-36 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setActivePeriod("Custom"); }}
              className="h-7 w-36 text-xs"
            />
            <a href={`/api/reports/${reportType}?format=csv${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`} download>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Download className="mr-1 size-3" /> Export CSV
              </Button>
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !data || data.rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No data for the selected period.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row, i) => (
                    <TableRow key={i}>
                      {columns.map((col) => (
                        <TableCell key={col} className="text-sm whitespace-nowrap">
                          {row[col] === null || row[col] === undefined ? "" : String(row[col])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
