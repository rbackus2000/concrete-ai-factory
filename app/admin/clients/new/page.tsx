import { PageHeader } from "@/components/app-shell/page-header";
import ClientForm from "@/components/forms/client-form";

export default function NewClientPage() {
  return (
    <div className="space-y-8">
      <PageHeader helpKey="admin-clients-form" eyebrow="Admin / Clients" title="Add Client" description="Create a new client record." />
      <ClientForm mode="create" defaultValues={{ name: "", company: "", email: "", phone: "", address: "", notes: "" }} />
    </div>
  );
}
