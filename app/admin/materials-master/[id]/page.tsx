import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { MaterialsMasterForm } from "@/components/forms/materials-master-form";
import { getMaterialsMasterEditor } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

type MaterialsMasterDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MaterialsMasterDetailPage({
  params,
}: MaterialsMasterDetailPageProps) {
  const { id } = await params;
  const editor = await getMaterialsMasterEditor(id);

  if (!editor.record) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        helpKey="admin-materials-master-form"
        eyebrow="Admin"
        title={editor.record.name}
        description="Edit quantity, cost, scope, and status directly against Prisma."
      />
      <MaterialsMasterForm
        defaultValues={editor.record}
        mode="edit"
        recordId={id}
        skuOptions={editor.skuOptions}
        supplierOptions={editor.supplierOptions}
      />
    </div>
  );
}
