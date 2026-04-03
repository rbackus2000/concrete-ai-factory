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
import { listPromptTemplates } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

export default async function PromptTemplatesPage() {
  const records = await listPromptTemplates();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Prompt templates"
        description="Manage template records used by prompt generation and later export workflows."
      />

      <div className="flex justify-end">
        <Link className={buttonVariants()} href="/admin/prompt-templates/new">
          Create template
        </Link>
      </div>

      <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
        <CardHeader>
          <CardTitle>Template Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.key}</TableCell>
                  <TableCell className="font-medium">{record.name}</TableCell>
                  <TableCell>{record.category}</TableCell>
                  <TableCell>{record.outputType}</TableCell>
                  <TableCell>{record.status}</TableCell>
                  <TableCell>v{record.version}</TableCell>
                  <TableCell>{record.scopeLabel}</TableCell>
                  <TableCell>
                    <Link className="text-primary underline-offset-4 hover:underline" href={`/admin/prompt-templates/${record.id}`}>
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
