import { PageHeader } from "@/components/app-shell/page-header";
import { PromptTemplateForm } from "@/components/forms/prompt-template-form";
import { getPromptTemplateEditor } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

export default async function NewPromptTemplatePage() {
  const editor = await getPromptTemplateEditor();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="New prompt template"
        description="Create a scoped prompt template record with status control and versioning."
      />
      <PromptTemplateForm
        defaultValues={{
          key: "",
          name: "",
          category: "IMAGE_PROMPT",
          categoryScope: "GLOBAL",
          skuCategory: "",
          skuOverrideId: "",
          outputType: "IMAGE_PROMPT",
          status: "DRAFT",
          version: 1,
          systemPrompt: "",
          templateBody: "",
          variablesText: "[]",
          notes: "",
        }}
        mode="create"
        skuOptions={editor.skuOptions}
      />
    </div>
  );
}
