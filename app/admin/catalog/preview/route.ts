import { requireAdminSession } from "@/lib/auth/session";
import { previewCatalogSpec } from "@/lib/services/catalog-service";
import { renderCatalogPdf } from "@/lib/catalog/render-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  await requireAdminSession();
  const spec = await previewCatalogSpec();
  const pdf = await renderCatalogPdf(spec);
  return new Response(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="catalog-preview.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
