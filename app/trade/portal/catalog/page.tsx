import { Card, CardContent } from "@/components/ui/card";
import { requireTradeMember } from "@/lib/auth/trade-session";
import { getLatestPublishedCatalog } from "@/lib/services/catalog-service";

export const dynamic = "force-dynamic";

export default async function TradeCatalogPage() {
  await requireTradeMember();
  const catalog = await getLatestPublishedCatalog();

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Trade portal
        </p>
        <h1 className="mt-2 font-serif text-3xl">Catalog</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          The full Backus Design Co. catalog — every sink, panel, tile, hard
          good, and care kit. Spec it from the PDF; come back here for trade
          pricing and per-SKU design packets.
        </p>
      </div>

      {!catalog ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No catalog has been published yet. Check back shortly.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 py-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Latest version
              </p>
              <p className="mt-1 font-serif text-2xl">{catalog.title}</p>
              {catalog.subtitle && (
                <p className="text-sm text-muted-foreground">{catalog.subtitle}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Version {catalog.version}
                {catalog.publishedAt
                  ? ` · published ${catalog.publishedAt.toLocaleDateString()}`
                  : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              {catalog.pdfUrl ? (
                <a
                  href={catalog.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
                  download
                >
                  Download catalog PDF →
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  PDF not available for this version.
                </p>
              )}
              {catalog.jsonUrl && (
                <a
                  href={catalog.jsonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Download catalog data (JSON)
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
