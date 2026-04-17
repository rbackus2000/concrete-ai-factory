import { PageHeader } from "@/components/app-shell/page-header";
import ProductColorForm from "@/components/forms/product-color-form";
import { getProductColorEditor } from "@/lib/services/color-service";

export const dynamic = "force-dynamic";

export default async function NewColorPage() {
  const editor = await getProductColorEditor();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="New color" description="Add a color to an RB Studio collection." />
      <ProductColorForm
        mode="create"
        collectionOptions={editor.collectionOptions}
        defaultValues={{
          collectionId: "",
          code: "",
          name: "",
          hexApprox: "#888888",
          pigmentFormula: "",
          sortOrder: 0,
          status: "ACTIVE",
          notes: "",
        }}
      />
    </div>
  );
}
