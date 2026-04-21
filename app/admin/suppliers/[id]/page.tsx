import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import SupplierForm from "@/components/forms/supplier-form";
import { getSupplierEditor } from "@/lib/services/supplier-service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditSupplierPage({ params }: Props) {
  const { id } = await params;
  const editor = await getSupplierEditor(id);
  if (!editor.record) notFound();

  return (
    <div className="space-y-8">
      <PageHeader helpKey="admin-suppliers-form" eyebrow="Admin" title={editor.record.name} description="Edit supplier details and status." />
      <SupplierForm mode="edit" recordId={id} defaultValues={editor.record} />
    </div>
  );
}
