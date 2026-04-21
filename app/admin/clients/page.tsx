import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listClients } from "@/lib/services/client-service";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader helpKey="admin-clients" eyebrow="Admin" title="Clients" description="Manage client contacts and project associations." />
        <Link href="/admin/clients/new"><Button>Add Client</Button></Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Jobs</TableHead>
            <TableHead>Projects</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((c) => (
            <TableRow key={c.id}>
              <TableCell><Link className="font-medium text-primary hover:underline" href={`/admin/clients/${c.id}`}>{c.name}</Link></TableCell>
              <TableCell className="text-muted-foreground">{c.company || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
              <TableCell>{c._count.jobs}</TableCell>
              <TableCell>{c._count.slatWallProjects}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
