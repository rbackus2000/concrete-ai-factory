import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCatalogs, previewCatalogSpec } from "@/lib/services/catalog-service";
import { PublishCatalogButton } from "./publish-button";

export const dynamic = "force-dynamic";

export default async function CatalogAdminPage() {
  const [history, preview] = await Promise.all([
    listCatalogs(),
    previewCatalogSpec(),
  ]);

  const productCount = preview.sections.reduce((a, s) => a + s.products.length, 0);
  const sectionRows = preview.sections.map((s) => ({
    title: s.title,
    count: s.products.length,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Catalog"
        description="Publish a new version of the catalog. Editorial content (designer letter, market intel, color guide, glossary, etc.) is edited in lib/catalog/catalog-content.ts. Product data is pulled live from the SKU table at publish time, so prices and inventory always reflect the current state."
      />

      <Card>
        <CardHeader>
          <CardTitle>Next version preview</CardTitle>
          <p className="text-sm text-muted-foreground">
            What the catalog looks like right now if you publish. Open the preview PDF to inspect every page, then click Publish.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Next version</p>
              <p className="text-2xl font-semibold">v{preview.meta.version}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Sections</p>
              <p className="text-2xl font-semibold">{preview.sections.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Products</p>
              <p className="text-2xl font-semibold">{productCount}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Care kits</p>
              <p className="text-2xl font-semibold">{preview.care.kits.length}</p>
            </div>
          </div>

          <div className="rounded border border-border/40 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Section product counts
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
              {sectionRows.map((s) => (
                <div key={s.title} className="flex justify-between">
                  <span>{s.title}</span>
                  <span className="font-mono text-muted-foreground">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/catalog/preview"
              target="_blank"
              className="text-sm text-primary hover:underline"
            >
              Open preview PDF →
            </Link>
            <PublishCatalogButton />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Published versions</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No catalogs published yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead>JSON</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">v{c.version}</TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "ACTIVE" ? "default" : "outline"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.publishedAt ? new Date(c.publishedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      {c.pdfUrl ? (
                        <a className="text-sm text-primary hover:underline" href={c.pdfUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {c.jsonUrl ? (
                        <a className="text-sm text-primary hover:underline" href={c.jsonUrl} target="_blank" rel="noreferrer">
                          JSON
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to update the catalog</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-sm text-muted-foreground">
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <strong>Editorial copy</strong> (designer letter, market section, color guide, finishes,
              section intros, glossary, contact info) lives in{" "}
              <code className="text-xs">lib/catalog/catalog-content.ts</code>. Edit, commit, deploy.
            </li>
            <li>
              <strong>Products</strong> come from the SKU table — change a price or archive a SKU and
              the next published catalog reflects it automatically. No catalog edits needed.
            </li>
            <li>
              <strong>Hit Publish</strong>. The next version composes the spec, renders the PDF with
              clickable product images, and uploads both PDF + JSON to MinIO at{" "}
              <code className="text-xs">cdn.opsrbstudio.com/catalogs/v{`{n}`}.{`{pdf|json}`}</code>{" "}
              and{" "}
              <code className="text-xs">latest.{`{pdf|json}`}</code>.
            </li>
            <li>
              The storefront catalog flipbook reads from <code className="text-xs">latest.json</code>{" "}
              and links downloads to <code className="text-xs">latest.pdf</code> — both update
              automatically once you publish.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
