import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import ClientForm from "@/components/forms/client-form";
import { getClientById } from "@/lib/services/client-service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditClientPage({ params }: Props) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin / Clients" title={`Edit ${client.name}`} description={client.company ?? ""} />
      <ClientForm
        mode="edit"
        clientId={client.id}
        defaultValues={{
          name: client.name,
          company: client.company ?? "",
          email: client.email ?? "",
          phone: client.phone ?? "",
          address: client.address ?? "",
          notes: client.notes ?? "",
        }}
      />
    </div>
  );
}
