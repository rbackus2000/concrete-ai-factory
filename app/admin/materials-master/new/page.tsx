import { PageHeader } from "@/components/app-shell/page-header";
import { MaterialsMasterForm } from "@/components/forms/materials-master-form";
import { getMaterialsMasterEditor } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

export default async function NewMaterialsMasterPage() {
  const editor = await getMaterialsMasterEditor();

  return (
    <div className="space-y-8">
      <PageHeader
        helpKey="admin-materials-master-form"
        eyebrow="Admin"
        title="New material record"
        description="Create a reusable material baseline with scope and status control."
      />
      <MaterialsMasterForm
        defaultValues={{
          code: "",
          name: "",
          category: "GFRC",
          categoryScope: "GLOBAL",
          skuCategory: "",
          skuOverrideId: "",
          status: "DRAFT",
          unit: "",
          quantity: 0,
          unitCost: 0,
          specification: "",
          notes: "",
          metadataJson: "{}",
          supplierId: "",
          supplierProductUrl: "",
          supplierSku: "",
        }}
        mode="create"
        skuOptions={editor.skuOptions}
        supplierOptions={editor.supplierOptions}
      />
    </div>
  );
}
