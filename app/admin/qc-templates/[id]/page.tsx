import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { QcTemplateForm } from "@/components/forms/qc-template-form";
import { getQcTemplateEditor } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

type QcTemplateDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function QcTemplateDetailPage({ params }: QcTemplateDetailPageProps) {
  const { id } = await params;
  const editor = await getQcTemplateEditor(id);

  if (!editor.record) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        helpKey="admin-qc-templates-form"
        eyebrow="Admin"
        title={editor.record.name}
        description="Edit QC checklist content, scope, and status directly against Prisma."
      />
      <QcTemplateForm
        defaultValues={editor.record}
        mode="edit"
        recordId={id}
        skuOptions={editor.skuOptions}
      />
    </div>
  );
}
