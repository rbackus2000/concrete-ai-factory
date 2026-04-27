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
import { CARE_LABEL_SPECS } from "@/lib/services/care-label-pdf-service";

export const dynamic = "force-dynamic";

export default function CareLabelsAdminPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Care kit labels"
        description="Print-ready PDF labels for the care kit packaging line. Single mode = one label per US Letter page with crop marks (good for proofing). Sheet mode = full Avery 5163 sheet (10 labels at 2x4 in.) of one product (good for production runs)."
      />

      <Card>
        <CardHeader>
          <CardTitle>Print options</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click any link to open the PDF in a new tab. Print on cream label paper or sticker stock.
            Back labels include usage steps, ingredients, website, and a QR code that links back to the
            product page on the storefront.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Shape</TableHead>
                <TableHead>Front · Proof</TableHead>
                <TableHead>Front · Sheet</TableHead>
                <TableHead>Back · Proof</TableHead>
                <TableHead>Back · Sheet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CARE_LABEL_SPECS.map((label) => (
                <TableRow key={label.sku}>
                  <TableCell className="font-mono text-xs">{label.sku}</TableCell>
                  <TableCell>
                    <div className="font-medium">{label.name}</div>
                    <div className="text-xs italic text-muted-foreground">{label.tagline}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{label.size}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{label.shape}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      className="text-sm text-primary hover:underline"
                      href={`/admin/care-labels/print?sku=${label.sku}&mode=single&side=front`}
                      target="_blank"
                    >
                      Open →
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      className="text-sm text-primary hover:underline"
                      href={`/admin/care-labels/print?sku=${label.sku}&mode=sheet&side=front`}
                      target="_blank"
                    >
                      Open →
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      className="text-sm text-primary hover:underline"
                      href={`/admin/care-labels/print?sku=${label.sku}&mode=single&side=back`}
                      target="_blank"
                    >
                      Open →
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      className="text-sm text-primary hover:underline"
                      href={`/admin/care-labels/print?sku=${label.sku}&mode=sheet&side=back`}
                      target="_blank"
                    >
                      Open →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All labels (one PDF)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Combined PDFs with every label, useful as a master reference.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link
            className="block text-sm text-primary hover:underline"
            href="/admin/care-labels/print?mode=single&side=front"
            target="_blank"
          >
            All front labels (proof set) →
          </Link>
          <Link
            className="block text-sm text-primary hover:underline"
            href="/admin/care-labels/print?mode=single&side=back"
            target="_blank"
          >
            All back labels (proof set) →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Print specs</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-sm text-muted-foreground">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Paper:</strong> 24-lb cream stock or matte sticker paper, US Letter (8.5 × 11 in.).
            </li>
            <li>
              <strong>Single mode:</strong> 3 × 4 in. rectangular, or 2.5 in. diameter round, centered with crop
              marks. Cut by hand or Cricut.
            </li>
            <li>
              <strong>Sheet mode:</strong> 2 × 4 in. rectangle Avery 5163 layout (10/sheet). Round-shape labels
              in sheet mode use the same grid but render circles inside each cell — cut to round if desired.
            </li>
            <li>
              <strong>Print scale:</strong> 100% / Actual Size. Do not let your PDF reader scale-to-fit.
            </li>
            <li>
              <strong>Color:</strong> labels are designed for printing on cream paper. Background fill in the
              PDF is decorative — if your stock is already cream, you can disable background fill in your
              printer settings to save toner.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
