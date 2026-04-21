import { NextRequest, NextResponse } from "next/server";

import { getQuoteByToken, trackQuoteView } from "@/lib/services/quote-service";

export const dynamic = "force-dynamic";

// Public endpoint — no auth required
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const quote = await getQuoteByToken(token);

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  // Track the view
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");
  await trackQuoteView(token, ip, userAgent);

  // Return safe public data (strip internal fields)
  return NextResponse.json({
    data: {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      contactName: quote.contactName,
      companyName: quote.companyName,
      customerMessage: quote.customerMessage,
      terms: quote.terms,
      validUntil: quote.validUntil,
      subtotal: quote.subtotal,
      discountAmount: quote.discountAmount,
      taxRate: quote.taxRate,
      taxAmount: quote.taxAmount,
      total: quote.total,
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
    },
  });
}
