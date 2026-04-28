import { Card, CardContent } from "@/components/ui/card";
import { requireTradeMember } from "@/lib/auth/trade-session";
import { listTradeCatalog } from "@/lib/services/trade-portal-catalog-service";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  VESSEL_SINK: "Sinks",
  COUNTERTOP: "Countertops",
  FURNITURE: "Furniture",
  PANEL: "Slat Wall",
  TILE: "Tile",
  HARD_GOOD: "Hard Goods",
  CARE_KIT: "Care Kits",
};

function fmt(n: number | null): string {
  return n === null
    ? "—"
    : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function TradePricingPage() {
  const member = await requireTradeMember();
  const catalog = await listTradeCatalog(member.tradeDiscountPct);

  const categoryOrder = ["VESSEL_SINK", "FURNITURE", "PANEL", "TILE", "HARD_GOOD", "COUNTERTOP", "CARE_KIT"];
  const grouped = catalog.reduce<Record<string, typeof catalog>>((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});
  const categories = Object.keys(grouped).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Trade portal
        </p>
        <h1 className="mt-2 font-serif text-3xl">Trade pricing</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          Your standing <strong>{member.tradeDiscountPct}%</strong> discount applied
          to every catalog piece. Custom commissions are quoted at the same trade
          rate from the first conversation.
        </p>
      </div>

      {categories.map((cat) => (
        <section key={cat} className="space-y-3">
          <h2 className="font-serif text-xl">{CATEGORY_LABEL[cat] ?? cat}</h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">SKU</th>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Finish</th>
                    <th className="px-4 py-3 text-right font-medium">Retail</th>
                    <th className="px-4 py-3 text-right font-medium">Trade</th>
                    <th className="px-4 py-3 text-right font-medium">You save</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[cat].map((item) => {
                    const savings =
                      item.retailPrice !== null && item.tradePrice !== null
                        ? item.retailPrice - item.tradePrice
                        : null;
                    return (
                      <tr key={item.skuId} className="border-b last:border-b-0">
                        <td className="px-4 py-3 font-mono text-xs">{item.code}</td>
                        <td className="px-4 py-3">{item.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.finish}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground line-through">
                          {fmt(item.retailPrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {fmt(item.tradePrice)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-700">
                          {fmt(savings)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  );
}
