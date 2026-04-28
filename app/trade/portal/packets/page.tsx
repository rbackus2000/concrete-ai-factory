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

  const buildPacketCount = catalog.filter((c) => c.buildPacketOutputId).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Trade portal
        </p>
        <h1 className="mt-2 font-serif text-3xl">Specs &amp; design packets</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          Two PDFs per SKU. The <strong>Trade Spec Sheet</strong> is a
          one-page architect tear sheet — dimensions, finishes, lead time,
          your trade pricing — generated fresh on every download. The{" "}
          <strong>Build Packet</strong> is the full studio packet: mix, mold,
          QC, install context — useful for contractors and detailed specs.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Spec sheets are available for every active SKU.{" "}
          {buildPacketCount} of {catalog.length} SKUs also have a full build
          packet — the rest are still being prepared.
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
                      <th className="px-4 py-3 text-right font-medium">Spec sheet</th>
                      <th className="px-4 py-3 text-right font-medium">Build packet</th>
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
                          <a
                            href={`/api/trade/portal/spec-sheets/${item.code}/pdf`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            Download PDF →
                          </a>
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
                            <span className="text-xs text-muted-foreground">In preparation</span>
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
