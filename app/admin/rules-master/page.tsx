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
import { listRulesMaster } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

export default async function RulesMasterPage() {
  const records = await listRulesMaster();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Rules master"
        description="Manage scoped rule records that feed validation, generation, and build packet assembly."
      />

      <div className="flex justify-end">
        <Link className={buttonVariants()} href="/admin/rules-master/new">
          Create rule
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rules Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Output</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.code}</TableCell>
                  <TableCell className="font-medium">{record.title}</TableCell>
                  <TableCell>{record.category}</TableCell>
                  <TableCell>{record.outputType}</TableCell>
                  <TableCell>P{record.priority}</TableCell>
                  <TableCell>{record.status}</TableCell>
                  <TableCell>{record.scopeLabel}</TableCell>
                  <TableCell>
                    <Link className="text-primary underline-offset-4 hover:underline" href={`/admin/rules-master/${record.id}`}>
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
