import { notFound } from "next/navigation";
import { getQuoteByToken, trackQuoteView } from "@/lib/services/quote-service";
import { PublicQuoteView } from "@/components/quotes/public-quote-view";

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const { publicToken } = await params;
  const quote = await getQuoteByToken(publicToken);

  if (!quote) notFound();

  // Track view server-side
  await trackQuoteView(publicToken, null, null);

  const quoteData = {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    status: quote.status,
    contactName: quote.contactName,
    companyName: quote.companyName,
    customerMessage: quote.customerMessage,
    terms: quote.terms,
    validUntil: quote.validUntil?.toISOString() ?? null,
    subtotal: quote.subtotal,
    discountAmount: quote.discountAmount,
    taxRate: quote.taxRate,
    taxAmount: quote.taxAmount,
    total: quote.total,
    signedAt: quote.signedAt?.toISOString() ?? null,
    signerName: quote.signerName,
    lineItems: quote.lineItems.map((item) => ({
      id: item.id,
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
    })),
  };

  return <PublicQuoteView quote={quoteData} />;
}
