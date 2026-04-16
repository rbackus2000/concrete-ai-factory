import { PageHeader } from "@/components/app-shell/page-header";
import FinishForm from "@/components/forms/finish-form";

export default function NewFinishPage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin / Finishes" title="Create Finish" description="Add a new concrete finish preset." />
      <FinishForm mode="create" defaultValues={{ code: "", name: "", colorFamily: "", textureType: "", sealerType: "", pigmentFormula: "", referenceImageUrl: "", notes: "", status: "DRAFT" }} />
    </div>
  );
}
