import { notFound } from "next/navigation";

import { getInvoiceByToken } from "@/lib/services/invoice-service";
import { PublicInvoiceView } from "@/components/invoices/public-invoice-view";

export const dynamic = "force-dynamic";

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ publicToken: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { publicToken } = await params;
  const sp = await searchParams;
  const invoice = await getInvoiceByToken(publicToken);

  if (!invoice) notFound();

  const serialized = {
    ...invoice,
    clientNumber: invoice.contact?.clientNumber ?? null,
    issuedAt: invoice.issuedAt.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    paidAt: invoice.paidAt?.toISOString() ?? null,
    sentAt: invoice.sentAt?.toISOString() ?? null,
    viewedAt: invoice.viewedAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    lastReminderAt: invoice.lastReminderAt?.toISOString() ?? null,
    lineItems: invoice.lineItems.map((li) => ({
      ...li,
      createdAt: li.createdAt.toISOString(),
    })),
    payments: invoice.payments.map((p) => ({
      ...p,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
  };

  return <PublicInvoiceView invoice={serialized} justPaid={sp.paid === "true"} />;
}
