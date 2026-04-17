import { PageHeader } from "@/components/app-shell/page-header";
import LaborRateForm from "@/components/forms/labor-rate-form";

export const dynamic = "force-dynamic";

export default function NewLaborRatePage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="New labor rate" description="Add a shop labor rate for product costing." />
      <LaborRateForm
        mode="create"
        defaultValues={{
          code: "",
          name: "",
          description: "",
          hourlyRate: 0,
          isDefault: false,
          status: "ACTIVE",
        }}
      />
    </div>
  );
}
