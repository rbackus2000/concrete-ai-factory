import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import ProductColorForm from "@/components/forms/product-color-form";
import { getProductColorEditor } from "@/lib/services/color-service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditColorPage({ params }: Props) {
  const { id } = await params;
  const editor = await getProductColorEditor(id);
  if (!editor.record) notFound();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title={editor.record.name} description="Edit color details, hex code, and pigment formula." />
      <ProductColorForm mode="edit" recordId={id} collectionOptions={editor.collectionOptions} defaultValues={editor.record} />
    </div>
  );
}
