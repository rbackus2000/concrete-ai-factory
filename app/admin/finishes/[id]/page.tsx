import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import FinishForm from "@/components/forms/finish-form";
import { getFinishById } from "@/lib/services/finish-service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditFinishPage({ params }: Props) {
  const { id } = await params;
  const finish = await getFinishById(id);
  if (!finish) notFound();

  return (
    <div className="space-y-8">
      <PageHeader helpKey="admin-finishes-form" eyebrow="Admin / Finishes" title={`Edit ${finish.code}`} description={finish.name} />
      <FinishForm
        mode="edit"
        finishId={finish.id}
        defaultValues={{
          code: finish.code,
          name: finish.name,
          colorFamily: finish.colorFamily ?? "",
          textureType: finish.textureType ?? "",
          sealerType: finish.sealerType ?? "",
          pigmentFormula: finish.pigmentFormula ?? "",
          referenceImageUrl: finish.referenceImageUrl ?? "",
          notes: finish.notes ?? "",
          status: finish.status,
        }}
      />
    </div>
  );
}
