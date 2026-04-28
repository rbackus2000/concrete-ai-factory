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

function categoryLabel(c: string): string {
  return CATEGORY_LABEL[c] ?? c;
}

export default async function TradePacketsPage() {
  const member = await requireTradeMember();
  const catalog = await listTradeCatalog(member.tradeDiscountPct);

  // Group by category
  const grouped = catalog.reduce<Record<string, typeof catalog>>((acc, item) => {
    const key = item.category;
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
  const categoryOrder = ["VESSEL_SINK", "FURNITURE", "PANEL", "TILE", "HARD_GOOD", "COUNTERTOP", "CARE_KIT"];
  const categories = Object.keys(grouped).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
  );

  const totalPackets = catalog.filter((c) => c.buildPacketOutputId).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Trade portal
        </p>
        <h1 className="mt-2 font-serif text-3xl">Design packets</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          Per-SKU build packets — dimensions, drains, mount type, finish notes,
          weight, and shop-floor specs — formatted for project drawings. Drop
          them into your spec set or share with your contractor.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          {totalPackets} of {catalog.length} SKUs have a packet ready. Items
          without a packet are still being prepared.
        </p>
      </div>

      {catalog.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No active SKUs in the catalog yet.
          </CardContent>
        </Card>
      ) : (
        categories.map((cat) => (
          <section key={cat} className="space-y-3">
            <h2 className="font-serif text-xl">{categoryLabel(cat)}</h2>
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">SKU</th>
                      <th className="px-4 py-3 text-left font-medium">Name</th>
                      <th className="px-4 py-3 text-left font-medium">Finish</th>
                      <th className="px-4 py-3 text-right font-medium">Trade price</th>
                      <th className="px-4 py-3 text-right font-medium">Packet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[cat].map((item) => (
                      <tr key={item.skuId} className="border-b last:border-b-0">
                        <td className="px-4 py-3 font-mono text-xs">{item.code}</td>
                        <td className="px-4 py-3">{item.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.finish}</td>
                        <td className="px-4 py-3 text-right">
                          {item.tradePrice !== null
                            ? `$${item.tradePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.buildPacketOutputId ? (
                            <a
                              href={`/api/trade/portal/packets/${item.code}/pdf`}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              Download PDF →
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>
        ))
      )}
    </div>
  );
}
