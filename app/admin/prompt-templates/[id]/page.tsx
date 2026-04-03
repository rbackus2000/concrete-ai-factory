import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { PromptTemplateForm } from "@/components/forms/prompt-template-form";
import { getPromptTemplateEditor } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

type PromptTemplateDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PromptTemplateDetailPage({ params }: PromptTemplateDetailPageProps) {
  const { id } = await params;
  const editor = await getPromptTemplateEditor(id);

  if (!editor.record) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title={editor.record.name}
        description="Edit template scope, status, version, and body content directly against Prisma."
      />
      <PromptTemplateForm
        defaultValues={editor.record}
        mode="edit"
        recordId={id}
        skuOptions={editor.skuOptions}
      />
    </div>
  );
}
