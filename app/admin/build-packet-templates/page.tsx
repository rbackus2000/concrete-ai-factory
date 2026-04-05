import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listBuildPacketTemplates } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

export default async function BuildPacketTemplatesPage() {
  const records = await listBuildPacketTemplates();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Build packet templates"
        description="Manage packet sections and their scoped runtime assembly records."
      />

      <div className="flex justify-end">
        <Link className={buttonVariants()} href="/admin/build-packet-templates/new">
          Create section
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Packet Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Packet Key</TableHead>
                <TableHead>Section Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.packetKey}</TableCell>
                  <TableCell>{record.sectionKey}</TableCell>
                  <TableCell className="font-medium">{record.name}</TableCell>
                  <TableCell>{record.sectionOrder}</TableCell>
                  <TableCell>{record.status}</TableCell>
                  <TableCell>{record.scopeLabel}</TableCell>
                  <TableCell>
                    <Link className="text-primary underline-offset-4 hover:underline" href={`/admin/build-packet-templates/${record.id}`}>
                      Edit
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
