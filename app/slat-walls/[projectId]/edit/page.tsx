import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { SlatWallProjectForm } from "@/components/forms/slat-wall-project-form";
import { Button } from "@/components/ui/button";
import { getSlatWallForEdit } from "@/lib/services/slat-wall-service";

export const dynamic = "force-dynamic";

type EditSlatWallPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function EditSlatWallPage({ params }: EditSlatWallPageProps) {
  const { projectId } = await params;
  const data = await getSlatWallForEdit(projectId);

  if (!data) {
    notFound();
  }

  const { project, config } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Slat Walls"
          title={`Edit ${project.code}`}
          description="Update project configuration and wall dimensions."
          helpKey="slat-walls-edit"
        />
        <Link href={`/slat-walls/${projectId}`}>
          <Button variant="outline">Back to Project</Button>
        </Link>
      </div>
      <SlatWallProjectForm
        mode="edit"
        projectId={projectId}
        defaultValues={{
          name: project.name,
          code: project.code,
          slug: project.slug,
          status: project.status as "DRAFT" | "ACTIVE" | "ARCHIVED",
          clientName: project.clientName,
          location: project.location,
          designer: project.designer,
          engineer: project.engineer,
          revision: project.revision,
          description: project.description,
          positionAName: project.positionAName,
          positionBName: project.positionBName,
          positionADescription: project.positionADescription,
          positionBDescription: project.positionBDescription,
          totalSlatCount: config?.totalSlatCount ?? 32,
          slatWidth: config?.slatWidth ?? 7,
          slatThickness: config?.slatThickness ?? 0.45,
          slatHeight: config?.slatHeight ?? 180,
          slatSpacing: config?.slatSpacing ?? 0.25,
          supportFrameType: config?.supportFrameType ?? "",
          pivotType: config?.pivotType ?? "",
          rotationAngleA: config?.rotationAngleA ?? 0,
          rotationAngleB: config?.rotationAngleB ?? 180,
        }}
      />
    </div>
  );
}
