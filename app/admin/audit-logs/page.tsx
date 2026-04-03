import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
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
import { getAuditLogWorkspace } from "@/lib/services/audit-log-service";

export const dynamic = "force-dynamic";

type AuditLogsPageProps = {
  searchParams: Promise<{
    actorId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
  }>;
};

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  const filters = await searchParams;
  const workspace = await getAuditLogWorkspace(filters);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Audit history"
        description="Read-only internal history for record changes and output export activity."
      />

      <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
        <CardHeader>
          <CardTitle>Filter Audit Events</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" method="get">
            <label className="space-y-2">
              <span className="text-sm text-muted-foreground">Actor</span>
              <select
                className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm"
                defaultValue={workspace.filters.actorId}
                name="actorId"
              >
                <option value="">All actors</option>
                {workspace.actors.map((actor) => (
                  <option key={actor.id} value={actor.id}>
                    {actor.name} ({actor.id})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-muted-foreground">Entity Type</span>
              <select
                className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm"
                defaultValue={workspace.filters.entityType}
                name="entityType"
              >
                <option value="">All entity types</option>
                {workspace.entityTypes.map((entityType) => (
                  <option key={entityType} value={entityType}>
                    {entityType}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-muted-foreground">Action</span>
              <select
                className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm"
                defaultValue={workspace.filters.action}
                name="action"
              >
                <option value="">All actions</option>
                {workspace.actions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-muted-foreground">Entity ID</span>
              <input
                className="flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm"
                defaultValue={workspace.filters.entityId}
                name="entityId"
                placeholder="cm..."
                type="text"
              />
            </label>

            <div className="md:col-span-2 xl:col-span-4 flex gap-3">
              <button
                className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
                type="submit"
              >
                Apply filters
              </button>
              <a
                className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-transparent px-5 py-2.5 text-sm font-medium"
                href="/admin/audit-logs"
              >
                Clear
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      {workspace.logs.length > 0 ? (
        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardHeader>
            <CardTitle>Audit Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspace.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{log.actorName}</p>
                        <p className="text-xs text-muted-foreground">{log.actorId}</p>
                        <Badge variant="secondary">{log.actorRole}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{log.entityType}</p>
                        <p className="text-xs text-muted-foreground break-all">{log.entityId}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm leading-6">{log.summary}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="space-y-3">
              {workspace.logs.map((log) => (
                <details key={`${log.id}-fields`} className="rounded-2xl border border-border/70 p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Changed fields / metadata for {log.action} on {log.entityId}
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-border/70 bg-secondary/20 p-4 text-xs leading-6">
                    {log.changedFieldsJson}
                  </pre>
                </details>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <StateCard
          title="No audit events found"
          description="Try broadening the filters, or perform a write or export action to generate new audit history."
        />
      )}
    </div>
  );
}
