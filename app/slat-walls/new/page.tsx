import { PageHeader } from "@/components/app-shell/page-header";
import { SlatWallProjectForm } from "@/components/forms/slat-wall-project-form";

export default function NewSlatWallPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Slat Walls"
        title="New slat wall project"
        description="Configure a kinetic rotating slat wall installation."
      />
      <SlatWallProjectForm mode="create" />
    </div>
  );
}
