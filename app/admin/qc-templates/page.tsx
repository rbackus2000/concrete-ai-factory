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
import { listQcTemplates } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

export default async function QcTemplatesPage() {
  const records = await listQcTemplates();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="QC templates"
        description="Manage structured QC checklists and gate criteria that feed packets and future exports."
      />

      <div className="flex justify-end">
        <Link className={buttonVariants()} href="/admin/qc-templates/new">
          Create QC template
        </Link>
      </div>

      <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
        <CardHeader>
          <CardTitle>QC Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.templateKey}</TableCell>
                  <TableCell className="font-medium">{record.name}</TableCell>
                  <TableCell>{record.category}</TableCell>
                  <TableCell>{record.status}</TableCell>
                  <TableCell>{record.scopeLabel}</TableCell>
                  <TableCell>
                    <Link className="text-primary underline-offset-4 hover:underline" href={`/admin/qc-templates/${record.id}`}>
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
