import Link from "next/link";
import type { LeadStage } from "@prisma/client";

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
import { requireSession } from "@/lib/auth/session";
import { listContacts } from "@/lib/services/contact-service";
import { ContactStageBadge } from "@/components/contacts/contact-stage-badge";
import { ContactFilters } from "@/components/contacts/contact-filters";
import type { LeadStageType } from "@/lib/schemas/contact";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; search?: string; tag?: string; sort?: string }>;
}) {
  await requireSession();
  const params = await searchParams;

  const contacts = await listContacts({
    stage: params.stage as LeadStage | undefined,
    search: params.search || undefined,
    tag: params.tag || undefined,
    sort: params.sort || undefined,
  });

  const totalPipelineValue = contacts.reduce((sum, c) => sum + c.totalQuoted, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="CRM"
          title="Contacts"
          description="Manage your customer relationships, track leads through the pipeline, and log activities."
          stats={`${contacts.length} contacts | ${formatCurrency(totalPipelineValue)} pipeline`}
        />
        <Link href="/contacts/new">
          <Button>New Contact</Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Contacts</p>
            <p className="text-2xl font-bold">{contacts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pipeline Value</p>
            <p className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">New Leads</p>
            <p className="text-2xl font-bold">
              {contacts.filter((c) => c.stage === "NEW").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <ContactFilters currentStage={params.stage} currentSearch={params.search} />

      {contacts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {params.stage
                ? `${params.stage.charAt(0) + params.stage.slice(1).toLowerCase()} Contacts`
                : "All Contacts"}{" "}
              ({contacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Total Quoted</TableHead>
                  <TableHead className="text-right">Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <Link
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        href={`/contacts/${contact.id}`}
                      >
                        {contact.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{contact.email}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.company || "—"}
                    </TableCell>
                    <TableCell>
                      <ContactStageBadge stage={contact.stage as LeadStageType} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                        {contact.tags.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{contact.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {contact.totalQuoted > 0 ? formatCurrency(contact.totalQuoted) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(contact.lastActivity)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/contacts/${contact.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                        <Link href={`/quotes/new?contactId=${contact.id}`}>
                          <Button variant="outline" size="sm">New Quote</Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <StateCard
          title="No contacts yet"
          description="Add your first contact to start building your CRM pipeline."
          action={
            <Link href="/contacts/new">
              <Button>Add First Contact</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
