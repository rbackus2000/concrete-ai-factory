import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { BuildPacketTemplateForm } from "@/components/forms/build-packet-template-form";
import { getBuildPacketTemplateEditor } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

type BuildPacketTemplateDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BuildPacketTemplateDetailPage({
  params,
}: BuildPacketTemplateDetailPageProps) {
  const { id } = await params;
  const editor = await getBuildPacketTemplateEditor(id);

  if (!editor.record) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        helpKey="admin-build-packet-templates-form"
        eyebrow="Admin"
        title={editor.record.name}
        description="Edit packet section order, scope, status, and content directly against Prisma."
      />
      <BuildPacketTemplateForm
        defaultValues={editor.record}
        mode="edit"
        recordId={id}
        skuOptions={editor.skuOptions}
      />
    </div>
  );
}
