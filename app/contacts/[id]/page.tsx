import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { getContact } from "@/lib/services/contact-service";
import { getReservedItemsForContact } from "@/lib/services/inventory-service";
import { getOrdersForContact } from "@/lib/services/order-service";
import { getEnrollmentsForContact, getEmailLogsForContact } from "@/lib/services/marketing-service";
import { ContactDetailClient } from "@/components/contacts/contact-detail-client";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const [contact, reservedItems, orders, enrollments, emailLogs] = await Promise.all([
    getContact(id),
    getReservedItemsForContact(id).catch(() => []),
    getOrdersForContact(id).catch(() => []),
    getEnrollmentsForContact(id).catch(() => []),
    getEmailLogsForContact(id).catch(() => []),
  ]);

  if (!contact) notFound();

  // Serialize dates for client component
  const serialized = {
    ...contact,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
    lastActivity: contact.lastActivity?.toISOString() ?? null,
    quotes: contact.quotes.map((q) => ({
      ...q,
      createdAt: q.createdAt.toISOString(),
      sentAt: q.sentAt?.toISOString() ?? null,
      viewedAt: q.viewedAt?.toISOString() ?? null,
      signedAt: q.signedAt?.toISOString() ?? null,
      convertedToOrderAt: q.convertedToOrderAt?.toISOString() ?? null,
    })),
    invoices: (contact.invoices ?? []).map((inv) => ({
      ...inv,
      dueDate: inv.dueDate.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    })),
    activities: contact.activities.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    reservedItems,
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      shippedAt: o.shippedAt?.toISOString() ?? null,
      _count: o._count,
    })),
    isUnsubscribed: (contact as Record<string, unknown>).isUnsubscribed as boolean ?? false,
    enrollments: enrollments.map((e) => ({
      id: e.id,
      sequenceName: e.sequence.name,
      sequenceId: e.sequence.id,
      trigger: e.sequence.trigger,
      status: e.status,
      currentStep: e.currentStep,
      nextSendAt: e.nextSendAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
    emailLogs: emailLogs.map((l) => ({
      id: l.id,
      subject: l.subject,
      sentAt: l.sentAt.toISOString(),
      openedAt: l.openedAt?.toISOString() ?? null,
      clickedAt: l.clickedAt?.toISOString() ?? null,
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="CRM"
          title={contact.name}
          description={[contact.company, contact.email].filter(Boolean).join(" — ")}
        />
        <Link href="/contacts">
          <Button variant="outline">Back to Contacts</Button>
        </Link>
      </div>
      <ContactDetailClient contact={serialized} />
    </div>
  );
}
