import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { StateCard } from "@/components/ui/state-card";
import { getGalleryImages } from "@/lib/services/gallery-service";

export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = {
  VESSEL_SINK: "Vessel Sinks",
  FURNITURE: "Furniture",
  PANEL: "Panels & Tiles",
};

export default async function GalleryPage() {
  const groups = await getGalleryImages();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Gallery"
        title="Generated Image Portfolio"
        description="All AI-rendered product images grouped by category."
        helpKey="gallery"
      />

      {groups.length === 0 && (
        <StateCard
          title="No images yet"
          description="Generate images from the Generator page to populate the gallery."
        />
      )}

      {groups.map((group) => (
        <section key={group.category} className="space-y-4">
          <h2 className="text-xl font-semibold">{categoryLabels[group.category] ?? group.category}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.images.map((img) => (
              <Link key={img.id} href={`/outputs/${img.outputId}`} className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/30">
                <div className="aspect-video overflow-hidden bg-muted">
                  <img src={img.imageUrl} alt={img.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium">{img.skuCode}</p>
                  <p className="text-xs text-muted-foreground">{img.skuName}</p>
                  <Badge variant="secondary" className="mt-1.5 text-[10px]">{img.outputType}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
