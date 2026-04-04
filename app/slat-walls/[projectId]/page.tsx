import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { SlatWallGeneratorForm } from "@/components/forms/slat-wall-generator-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StateCard } from "@/components/ui/state-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSlatWallDetail } from "@/lib/services/slat-wall-service";

export const dynamic = "force-dynamic";

type SlatWallDetailPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function SlatWallDetailPage({ params }: SlatWallDetailPageProps) {
  const { projectId } = await params;
  const detail = await getSlatWallDetail(projectId);

  if (!detail) {
    notFound();
  }

  const { project, config, artworks, slats } = detail;
  const wallWidth = config
    ? config.totalSlatCount * (config.slatWidth + config.slatSpacing)
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Slat Walls"
          title={`${project.code} — ${project.name}`}
          description={project.description || "Kinetic rotating slat wall installation."}
        />
        <div className="flex gap-3">
          <Link href={`/slat-walls/${projectId}/simulator`}>
            <Button>Simulator</Button>
          </Link>
          <Link href={`/slat-walls/${projectId}/edit`}>
            <Button variant="outline">Edit Project</Button>
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardHeader><CardTitle>Status</CardTitle></CardHeader>
          <CardContent>
            <Badge variant="secondary">{project.status}</Badge>
          </CardContent>
        </Card>
        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardHeader><CardTitle>Client</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{project.clientName || "—"}</p>
            <p className="text-sm text-muted-foreground">{project.location || "No location"}</p>
          </CardContent>
        </Card>
        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardHeader><CardTitle>Position A</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{project.positionAName || "Image A"}</p>
          </CardContent>
        </Card>
        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardHeader><CardTitle>Position B</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{project.positionBName || "Image B"}</p>
          </CardContent>
        </Card>
      </section>

      {config ? (
        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardHeader><CardTitle>Wall Configuration</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Slats</p>
                <p className="font-medium">{config.totalSlatCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Slat Dimensions</p>
                <p className="font-medium">{config.slatWidth}&quot; W x {config.slatHeight}&quot; H x {config.slatThickness}&quot; T</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Wall Width</p>
                <p className="font-medium">{wallWidth.toFixed(1)}&quot; ({(wallWidth / 12).toFixed(1)} ft)</p>
              </div>
              <div>
                <p className="text-muted-foreground">Spacing</p>
                <p className="font-medium">{config.slatSpacing}&quot;</p>
              </div>
              <div>
                <p className="text-muted-foreground">Support Frame</p>
                <p className="font-medium">{config.supportFrameType || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pivot Type</p>
                <p className="font-medium">{config.pivotType || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Position A Angle</p>
                <p className="font-medium">{config.rotationAngleA}°</p>
              </div>
              <div>
                <p className="text-muted-foreground">Position B Angle</p>
                <p className="font-medium">{config.rotationAngleB}°</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <SlatWallGeneratorForm projectId={projectId} projectCode={project.code} />

      {artworks.length > 0 ? (
        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardHeader><CardTitle>Artwork Inputs</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {artworks.map((artwork) => (
              <div key={artwork.id} className="rounded-2xl border border-border/70 p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Badge>Position {artwork.position}</Badge>
                  <Badge variant="secondary">{artwork.status}</Badge>
                </div>
                {artwork.imageUrl ? (
                  <img
                    alt={`Position ${artwork.position} artwork`}
                    className="w-full rounded-xl object-cover"
                    src={artwork.imageUrl}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No image uploaded yet</p>
                )}
                {artwork.description ? (
                  <p className="text-sm text-muted-foreground">{artwork.description}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <StateCard
          title="No artwork uploaded"
          description="Image upload and slicing will be available in Phase 2."
        />
      )}

      {slats.length > 0 ? (
        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardHeader>
            <CardTitle>Slat Schedule ({slats.length} slats)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slat ID</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Face A Slice</TableHead>
                  <TableHead>Face B Slice</TableHead>
                  <TableHead>Dimensions</TableHead>
                  <TableHead>Orientation</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slats.map((slat) => (
                  <TableRow key={slat.id}>
                    <TableCell className="font-medium">{slat.slatId}</TableCell>
                    <TableCell>{slat.wallPosition}</TableCell>
                    <TableCell>{slat.faceASliceId ?? "—"}</TableCell>
                    <TableCell>{slat.faceBSliceId ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {slat.width}&quot; x {slat.height}&quot; x {slat.thickness}&quot;
                    </TableCell>
                    <TableCell>{slat.orientation}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{slat.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
