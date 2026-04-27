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
import { listCareKitBuildSheets, listCareKitComponents } from "@/lib/services/care-kit-service";
import { AssemblyChecklist } from "./assembly-checklist";

export const dynamic = "force-dynamic";

export default async function CareKitsAdminPage() {
  const [buildSheets, components] = await Promise.all([
    listCareKitBuildSheets(),
    listCareKitComponents(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Care kits"
        description="Build sheets, COGS, and assembly notes for the care kits sold on the customer storefront. SKU codes match BDC exactly so customer orders flow into fulfillment."
      />

      {/* Components catalog (reorder dashboard) */}
      <Card>
        <CardHeader>
          <CardTitle>Components catalog</CardTitle>
          <p className="text-sm text-muted-foreground">
            Master list of consumables and packaging used to assemble all kits. Made-to-order items are mixed
            per customer order and not held in stock.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Reorder Qty</TableHead>
                <TableHead className="text-right">Lead</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.supplierUrl ? (
                      <a className="hover:underline" href={c.supplierUrl} target="_blank" rel="noreferrer">
                        {c.supplierName ?? c.supplierUrl}
                      </a>
                    ) : (
                      (c.supplierName ?? "—")
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.unitCost != null ? `$${c.unitCost.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.size ?? "—"}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {c.reorderQty ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {c.leadTimeDays != null ? `${c.leadTimeDays}d` : "—"}
                  </TableCell>
                  <TableCell className="space-x-1">
                    {c.madeToOrder && <Badge variant="outline">Made to order</Badge>}
                    {c.labelRequired && <Badge variant="outline">Label</Badge>}
                    {c.mixRatio && <Badge variant="outline">Mix</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Build sheet per kit */}
      {buildSheets.map((sheet) => (
        <Card key={sheet.id}>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="font-mono text-sm tracking-wider">{sheet.skuCode}</CardTitle>
                <p className="text-lg font-semibold">{sheet.skuName}</p>
                {sheet.colorRequired && (
                  <Badge className="mt-1" variant="destructive">
                    Color required per order
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Retail</p>
                <p className="text-xl font-semibold">
                  {sheet.retailPrice != null ? `$${sheet.retailPrice.toFixed(2)}` : "—"}
                </p>
                <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">COGS</p>
                <p className="text-base">${sheet.totalCogs.toFixed(2)}</p>
                <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Margin</p>
                <p className={`text-base ${sheet.marginPct != null && sheet.marginPct < 35 ? "text-amber-600" : ""}`}>
                  {sheet.marginPct != null ? `${sheet.marginPct.toFixed(1)}%` : "—"}
                </p>
                {sheet.assemblyTimeMinutes != null && (
                  <>
                    <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Assembly</p>
                    <p className="text-base">{sheet.assemblyTimeMinutes} min</p>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Components table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Line</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheet.items.map((item) => (
                  <TableRow key={item.componentId}>
                    <TableCell>
                      <div className="font-medium">{item.componentName}</div>
                      {item.madeToOrder && (
                        <div className="mt-1">
                          <Badge variant="outline">Made to order</Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.qty}</TableCell>
                    <TableCell className="text-right">
                      {item.unitCost != null ? `$${item.unitCost.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">${item.lineCost.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Assembly checklist */}
            {sheet.assemblyNotes.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Assembly steps
                </h4>
                <AssemblyChecklist sheetId={sheet.id} steps={sheet.assemblyNotes} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
