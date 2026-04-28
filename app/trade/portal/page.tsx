import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTradeMember } from "@/lib/auth/trade-session";
import { getLatestPublishedCatalog } from "@/lib/services/catalog-service";
import { countPendingTradeApplications } from "@/lib/services/trade-application-service";

export const dynamic = "force-dynamic";

export default async function TradePortalDashboard() {
  const member = await requireTradeMember();
  const catalog = await getLatestPublishedCatalog();

  // Catalog count is just informational on the dashboard; we use the
  // pending-applications query as a proxy for "system is alive".
  // (Replaced later by per-member quote/order counts.)
  void countPendingTradeApplications;

  const tiles = [
    {
      title: "Catalog",
      href: "/trade/portal/catalog",
      description: catalog
        ? `Download the latest catalog (v${catalog.version}, ${catalog.publishedAt ? catalog.publishedAt.toLocaleDateString() : "—"})`
        : "Catalog not yet published.",
    },
    {
      title: "Design Packets",
      href: "/trade/portal/packets",
      description: "Per-SKU build packets — dimensions, drains, mount type, finish notes — formatted for project drawings.",
    },
    {
      title: "Trade Pricing",
      href: "/trade/portal/pricing",
      description: `Your standing ${member.tradeDiscountPct}% discount applied to every catalog piece.`,
    },
    {
      title: "Samples",
      href: "/trade/portal/samples",
      description: "Request a finish sample box — every Classic & Woodform color and our four sealer finishes. Free.",
    },
    {
      title: "Request a Quote",
      href: "/trade/portal/quotes/new",
      description: "Send us a project brief — we respond with a fixed quote at trade pricing within one business day.",
    },
    {
      title: "Account",
      href: "/trade/portal/account",
      description: "Your profile, account manager contact, and sign-out.",
    },
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Welcome back
        </p>
        <h1 className="mt-2 font-serif text-3xl">{member.contactName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {member.firmName}
          {member.profession ? ` · ${member.profession}` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="h-full transition hover:border-primary/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{t.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border bg-white p-6 text-sm">
        <p className="font-medium">Need anything?</p>
        <p className="mt-1 text-muted-foreground">
          Email your trade desk at{" "}
          <a
            href="mailto:trade@backusdesignco.com"
            className="text-primary underline-offset-4 hover:underline"
          >
            trade@backusdesignco.com
          </a>
          . We respond within one business day.
        </p>
      </div>
    </div>
  );
}
