import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { getQuote } from "@/lib/services/quote-service";
import { QuoteBuilder } from "@/components/quotes/quote-builder";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const quote = await getQuote(id);

  if (!quote) notFound();

  const initial = {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    publicToken: quote.publicToken,
    pricingTier: (quote.pricingTier ?? "RETAIL") as "RETAIL" | "WHOLESALE",
    contactId: quote.contactId ?? undefined,
    contactName: quote.contactName,
    contactEmail: quote.contactEmail,
    contactPhone: quote.contactPhone ?? "",
    companyName: quote.companyName ?? "",
    customerMessage: quote.customerMessage ?? "",
    notes: quote.notes ?? "",
    terms: quote.terms ?? "",
    validUntil: quote.validUntil
      ? quote.validUntil.toISOString().split("T")[0]
      : "",
    lineItems: quote.lineItems.map((item) => ({
      id: item.id,
      skuId: item.skuId,
      skuCode: item.skuCode,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      category: item.category,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      discount: item.discount,
      lineTotal: item.lineTotal,
      customerCanEditQty: item.customerCanEditQty,
      customerCanRemove: item.customerCanRemove,
      isOptional: item.isOptional,
      isSelected: item.isSelected,
      sortOrder: item.sortOrder,
    })),
    discountAmount: quote.discountAmount,
    taxRate: quote.taxRate,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="quotes-edit"
          eyebrow="Quotes"
          title={`Edit ${quote.quoteNumber}`}
          description={`Modify quote for ${quote.contactName}. Save changes when done.`}
        />
        <Link href={`/quotes/${quote.id}`}>
          <Button variant="outline">Back to Quote</Button>
        </Link>
      </div>
      <QuoteBuilder initial={initial} />
    </div>
  );
}
