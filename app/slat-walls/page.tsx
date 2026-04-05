import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
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
import { listSlatWallProjects } from "@/lib/services/slat-wall-service";

export const dynamic = "force-dynamic";

export default async function SlatWallsPage() {
  const projects = await listSlatWallProjects();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Slat Walls"
          title="Kinetic slat wall projects"
          description="Rotating vertical GFRC slat walls with dual-image UV print artwork."
        />
        <div className="flex gap-3">
          <Link href="/slat-walls/calculator">
            <Button variant="outline">Cost Calculator</Button>
          </Link>
          <Link href="/slat-walls/proposals">
            <Button variant="outline">Proposals</Button>
          </Link>
          <Link href="/slat-walls/new">
            <Button>New Project</Button>
          </Link>
        </div>
      </div>

      {projects.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Slats</TableHead>
                  <TableHead>Wall Width</TableHead>
                  <TableHead>Height</TableHead>
                  <TableHead>Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => {
                  const wallWidth = project.totalSlatCount * (project.slatWidth + 0.25);
                  const heightFt = (project.slatHeight / 12).toFixed(1);

                  return (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.code}</TableCell>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{project.status}</Badge>
                      </TableCell>
                      <TableCell>{project.totalSlatCount}</TableCell>
                      <TableCell>{wallWidth.toFixed(1)}&quot;</TableCell>
                      <TableCell>{heightFt} ft</TableCell>
                      <TableCell>
                        <Link
                          className="text-primary underline-offset-4 hover:underline font-medium"
                          href={`/slat-walls/${project.id}`}
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <StateCard
          title="No slat wall projects yet"
          description="Create a new project to start configuring a rotating slat wall installation."
        />
      )}
    </div>
  );
}
