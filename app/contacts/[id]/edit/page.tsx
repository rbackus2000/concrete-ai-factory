import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { getContact } from "@/lib/services/contact-service";
import { ContactForm } from "@/components/contacts/contact-form";
import type { LeadStageType } from "@/lib/schemas/contact";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const contact = await getContact(id);

  if (!contact) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="CRM"
          title={`Edit ${contact.name}`}
          description="Update contact information."
        />
        <Link href={`/contacts/${contact.id}`}>
          <Button variant="outline">Back to Contact</Button>
        </Link>
      </div>
      <ContactForm
        initial={{
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone ?? "",
          company: contact.company ?? "",
          title: contact.title ?? "",
          address: contact.address ?? "",
          city: contact.city ?? "",
          state: contact.state ?? "",
          zip: contact.zip ?? "",
          source: contact.source ?? "",
          tags: contact.tags,
          notes: contact.notes ?? "",
          stage: contact.stage as LeadStageType,
        }}
      />
    </div>
  );
}
