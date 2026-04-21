import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { ContactForm } from "@/components/contacts/contact-form";

export default async function NewContactPage() {
  await requireSession();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="CRM"
          title="New contact"
          description="Add a new contact to your CRM pipeline."
        />
        <Link href="/contacts">
          <Button variant="outline">Back to Contacts</Button>
        </Link>
      </div>
      <ContactForm />
    </div>
  );
}
