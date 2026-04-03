import { PageHeader } from "@/components/app-shell/page-header";
import { BuildPacketTemplateForm } from "@/components/forms/build-packet-template-form";
import { getBuildPacketTemplateEditor } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

export default async function NewBuildPacketTemplatePage() {
  const editor = await getBuildPacketTemplateEditor();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="New build packet section"
        description="Create an internal packet section record ready for runtime assembly and later export."
      />
      <BuildPacketTemplateForm
        defaultValues={{
          packetKey: "",
          sectionKey: "",
          name: "",
          sectionOrder: 1,
          categoryScope: "GLOBAL",
          skuCategory: "",
          skuOverrideId: "",
          outputType: "BUILD_PACKET",
          status: "DRAFT",
          content: "",
          variablesText: "[]",
        }}
        mode="create"
        skuOptions={editor.skuOptions}
      />
    </div>
  );
}
