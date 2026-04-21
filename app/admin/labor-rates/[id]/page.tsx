import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import LaborRateForm from "@/components/forms/labor-rate-form";
import { getLaborRateEditor } from "@/lib/services/labor-rate-service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditLaborRatePage({ params }: Props) {
  const { id } = await params;
  const editor = await getLaborRateEditor(id);
  if (!editor.record) notFound();

  return (
    <div className="space-y-8">
      <PageHeader helpKey="admin-labor-rates-form" eyebrow="Admin" title={editor.record.name} description="Edit labor rate details and hourly cost." />
      <LaborRateForm mode="edit" recordId={id} defaultValues={editor.record} />
    </div>
  );
}
