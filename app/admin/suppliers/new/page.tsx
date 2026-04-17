import { PageHeader } from "@/components/app-shell/page-header";
import SupplierForm from "@/components/forms/supplier-form";

export const dynamic = "force-dynamic";

export default function NewSupplierPage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="New supplier" description="Add a material supplier with contact info and website." />
      <SupplierForm
        mode="create"
        defaultValues={{
          code: "",
          name: "",
          website: "",
          contactEmail: "",
          contactPhone: "",
          notes: "",
          status: "ACTIVE",
        }}
      />
    </div>
  );
}
