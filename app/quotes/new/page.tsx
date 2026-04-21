import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { QuoteBuilder } from "@/components/quotes/quote-builder";
import { getContact } from "@/lib/services/contact-service";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string }>;
}) {
  await requireSession();
  const params = await searchParams;

  let initial = undefined;
  if (params.contactId) {
    const contact = await getContact(params.contactId);
    if (contact) {
      initial = {
        contactId: contact.id,
        contactName: contact.name,
        contactEmail: contact.email,
        contactPhone: contact.phone ?? "",
        companyName: contact.company ?? "",
        customerMessage: "",
        notes: "",
        terms: "Payment is due within 30 days of invoice. All prices are in USD. Custom products are non-refundable once production has started.",
        validUntil: "",
        lineItems: [],
        discountAmount: 0,
        taxRate: 0,
      };
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          helpKey="quotes-new"
          eyebrow="Quotes"
          title="New Quote"
          description="Build a quote for your customer with line items, pricing, and terms."
        />
        <Link href="/quotes">
          <Button variant="outline">Back to Quotes</Button>
        </Link>
      </div>
      <QuoteBuilder initial={initial} />
    </div>
  );
}
