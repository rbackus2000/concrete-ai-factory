import { PageHeader } from "@/components/app-shell/page-header";
import { RulesMasterForm } from "@/components/forms/rules-master-form";
import { getRulesMasterEditor } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

export default async function NewRulesMasterPage() {
  const editor = await getRulesMasterEditor();

  return (
    <div className="space-y-8">
      <PageHeader
        helpKey="admin-rules-master-form"
        eyebrow="Admin"
        title="New rule record"
        description="Create a scoped rule record with priority and activation status."
      />
      <RulesMasterForm
        defaultValues={{
          code: "",
          title: "",
          category: "DIMENSIONAL",
          categoryScope: "GLOBAL",
          skuCategory: "",
          skuOverrideId: "",
          outputType: "",
          status: "DRAFT",
          priority: 1,
          description: "",
          ruleText: "",
          source: "",
          metadataJson: "{}",
        }}
        mode="create"
        skuOptions={editor.skuOptions}
      />
    </div>
  );
}
