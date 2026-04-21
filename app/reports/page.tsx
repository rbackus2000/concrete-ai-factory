import Link from "next/link";
import { BarChart3, DollarSign, Package, TrendingUp, Warehouse, Mail } from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type ReportDef = {
  slug: string;
  name: string;
  description: string;
};

type ReportSection = {
  title: string;
  icon: typeof DollarSign;
  reports: ReportDef[];
};

const sections: ReportSection[] = [
  {
    title: "Financial Reports",
    icon: DollarSign,
    reports: [
      { slug: "revenue-summary", name: "Revenue Summary", description: "Revenue by period, customer, and payment method" },
      { slug: "ar-aging", name: "Accounts Receivable Aging", description: "Outstanding invoices bucketed by days overdue" },
      { slug: "invoice-history", name: "Invoice Payment History", description: "All invoices with payment status and amounts" },
      { slug: "top-customers", name: "Top Customers by Revenue", description: "Ranked customers by total payments received" },
    ],
  },
  {
    title: "Sales Reports",
    icon: TrendingUp,
    reports: [
      { slug: "quote-activity", name: "Quote Activity", description: "Quotes sent, viewed, signed, and converted" },
      { slug: "quote-conversion", name: "Quote Conversion Rate", description: "Sign and conversion rates by period" },
      { slug: "pipeline-by-stage", name: "Pipeline Value by Stage", description: "Contact pipeline grouped by lead stage" },
    ],
  },
  {
    title: "Inventory Reports",
    icon: Warehouse,
    reports: [
      { slug: "inventory-valuation", name: "Inventory Valuation Summary", description: "All items with quantities and total value" },
      { slug: "stock-status", name: "Stock Status Report", description: "On hand, reserved, available, and reorder status" },
      { slug: "low-stock", name: "Low Stock Alert Report", description: "Items at or below reorder point" },
      { slug: "material-usage", name: "Material Usage Report", description: "Stock consumption by date range" },
      { slug: "purchase-orders", name: "Purchase Order History", description: "All POs with vendor and delivery status" },
    ],
  },
  {
    title: "Operations Reports",
    icon: Package,
    reports: [
      { slug: "order-fulfillment", name: "Order Fulfillment Summary", description: "Orders by status with days to ship metrics" },
      { slug: "shipping-cost", name: "Shipping Cost Summary", description: "Shipping costs by carrier and period" },
      { slug: "production-queue", name: "Production Queue Status", description: "Current active orders and their production state" },
    ],
  },
  {
    title: "Marketing Reports",
    icon: Mail,
    reports: [
      { slug: "email-campaigns", name: "Email Campaign Performance", description: "Campaign send, open, and click metrics" },
      { slug: "sequence-performance", name: "Sequence Enrollment & Open Rates", description: "Sequence effectiveness across all triggers" },
      { slug: "contact-growth", name: "Contact Growth Over Time", description: "New contacts added by month" },
    ],
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Reports"
        title="Reports Center"
        description="Pre-built reports across all business functions. Run, export, or schedule any report."
      />

      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <section key={section.title}>
            <div className="mb-3 flex items-center gap-2">
              <Icon className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.reports.map((report) => (
                <Card key={report.slug} className="transition hover:border-primary/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{report.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-xs text-muted-foreground">{report.description}</p>
                    <div className="flex gap-2">
                      <Link href={`/reports/${report.slug}`}>
                        <Button size="sm" className="h-7 text-xs">
                          <BarChart3 className="mr-1 size-3" />
                          Run Report
                        </Button>
                      </Link>
                      <a href={`/api/reports/${report.slug}?format=csv`} download>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          Export CSV
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
