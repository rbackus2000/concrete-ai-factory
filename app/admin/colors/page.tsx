import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listColorCollections } from "@/lib/services/color-service";

export const dynamic = "force-dynamic";

export default async function ColorsPage() {
  const collections = await listColorCollections();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="admin-colors"
          eyebrow="Admin"
          title="Color System"
          description="RB Studio pigment color collections — manage formulas, hex codes, and organization."
        />
        <Link href="/admin/colors/new">
          <Button>Add Color</Button>
        </Link>
      </div>

      {collections.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No color collections yet. Seed the database or add collections manually.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {collections.map((collection) => (
            <Card key={collection.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{collection.name}</CardTitle>
                  <Badge variant="outline">{collection.colors.length} colors</Badge>
                </div>
                {collection.description && (
                  <p className="text-sm text-muted-foreground">{collection.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
                  {collection.colors.map((color) => (
                    <Link
                      key={color.id}
                      href={`/admin/colors/${color.id}`}
                      className="group flex flex-col items-center gap-1.5 rounded-lg border border-border p-2 transition hover:border-primary/40 hover:bg-muted/50"
                    >
                      <div
                        className="h-10 w-10 rounded-full border border-border shadow-sm"
                        style={{ backgroundColor: color.hexApprox }}
                      />
                      <span className="text-center text-[10px] font-medium leading-tight group-hover:text-primary">
                        {color.name.replace(collection.name + " ", "")}
                      </span>
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {color.hexApprox}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
