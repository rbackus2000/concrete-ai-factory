import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { RulesMasterForm } from "@/components/forms/rules-master-form";
import { getRulesMasterEditor } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

type RulesMasterDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RulesMasterDetailPage({ params }: RulesMasterDetailPageProps) {
  const { id } = await params;
  const editor = await getRulesMasterEditor(id);

  if (!editor.record) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title={editor.record.title}
        description="Edit rule content, priority, status, and scope directly against Prisma."
      />
      <RulesMasterForm
        defaultValues={editor.record}
        mode="edit"
        recordId={id}
        skuOptions={editor.skuOptions}
      />
    </div>
  );
}
