import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listFinishes } from "@/lib/services/finish-service";

export const dynamic = "force-dynamic";

export default async function FinishesPage() {
  const finishes = await listFinishes();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader eyebrow="Admin" title="Finishes" description="Manage concrete finish presets — color families, textures, sealers, and pigment formulas." />
        <Link href="/admin/finishes/new"><Button>Create Finish</Button></Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Color Family</TableHead>
            <TableHead>Texture</TableHead>
            <TableHead>Sealer</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {finishes.map((f) => (
            <TableRow key={f.id}>
              <TableCell><Link className="font-medium text-primary hover:underline" href={`/admin/finishes/${f.id}`}>{f.code}</Link></TableCell>
              <TableCell>{f.name}</TableCell>
              <TableCell className="text-muted-foreground">{f.colorFamily || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{f.textureType || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{f.sealerType || "—"}</TableCell>
              <TableCell><Badge variant={f.status === "ACTIVE" ? "default" : "secondary"}>{f.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
