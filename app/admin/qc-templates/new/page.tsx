import { PageHeader } from "@/components/app-shell/page-header";
import { QcTemplateForm } from "@/components/forms/qc-template-form";
import { getQcTemplateEditor } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

export default async function NewQcTemplatePage() {
  const editor = await getQcTemplateEditor();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="New QC template"
        description="Create a QC record with scoped activation and structured checklist content."
      />
      <QcTemplateForm
        defaultValues={{
          templateKey: "",
          name: "",
          category: "SETUP",
          categoryScope: "GLOBAL",
          skuCategory: "",
          skuOverrideId: "",
          status: "DRAFT",
          checklistText: "[]",
          acceptanceCriteriaText: "[]",
          rejectionCriteriaText: "[]",
          notes: "",
        }}
        mode="create"
        skuOptions={editor.skuOptions}
      />
    </div>
  );
}
