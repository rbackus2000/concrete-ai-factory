import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/services/service-helpers";

import { ProductCatalogTable } from "@/components/admin/product-catalog-table";

export const dynamic = "force-dynamic";

export default async function ProductCatalogPage() {
  const skus = await prisma.sku.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      type: true,
      finish: true,
      retailPrice: true,
      wholesalePrice: true,
      outerLength: true,
      outerWidth: true,
      outerHeight: true,
    },
    orderBy: [{ category: "asc" }, { code: "asc" }],
  });

  const data = skus.map((sku) => ({
    id: sku.id,
    code: sku.code,
    name: sku.name,
    category: sku.category,
    type: sku.type,
    finish: sku.finish,
    retailPrice: decimalToNumber(sku.retailPrice),
    wholesalePrice: decimalToNumber(sku.wholesalePrice),
    outerLength: decimalToNumber(sku.outerLength),
    outerWidth: decimalToNumber(sku.outerWidth),
    outerHeight: decimalToNumber(sku.outerHeight),
  }));

  const totalRetail = data.reduce((sum, s) => sum + (s.retailPrice ?? 0), 0);
  const pricedCount = data.filter((s) => s.retailPrice != null && s.retailPrice > 0).length;
  const categories = [...new Set(data.map((s) => s.category))];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Product catalog"
        description="Manage retail and wholesale pricing for all SKUs. Prices are used in the quote builder."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Total SKUs</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{data.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Priced</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pricedCount}/{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {categories.map((c) => (
                <Badge key={c} variant="secondary">{c.replace(/_/g, " ")}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Catalog Value</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${totalRetail.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">total retail (1 of each)</p>
          </CardContent>
        </Card>
      </section>

      <ProductCatalogTable skus={data} />
    </div>
  );
}
