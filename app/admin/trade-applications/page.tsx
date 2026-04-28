import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPendingTradeApplications } from "@/lib/services/trade-application-service";

import ActionsBar from "./actions-bar";

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function TradeApplicationsPage() {
  const pending = await listPendingTradeApplications();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title={`Trade applications — ${pending.length} pending`}
        description="Review trade-program applications submitted from backusdesignco.com/trade/apply. Approve to provision portal access and email a one-click sign-in link. Decline to send a polite rejection."
      />

      {pending.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No applications waiting for review.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((c) => {
            const profession = c.tags.find(
              (t) =>
                t !== "Trade Lead" &&
                t !== "Trade — Pending Review" &&
                t !== "Trade — Approved" &&
                t !== "Trade — Declined",
            );
            const latestNote = c.activities[0];
            return (
              <Card key={c.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{c.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {c.company ?? "—"}
                        {profession ? ` · ${profession}` : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <a
                          href={`mailto:${c.email}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {c.email}
                        </a>
                        {c.phone ? ` · ${c.phone}` : ""}
                      </p>
                      {(c.city || c.state) && (
                        <p className="text-sm text-muted-foreground">
                          {[c.city, c.state, c.zip].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{c.clientNumber ?? "—"}</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Applied {formatDate(c.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {latestNote ? (
                    <details className="rounded-md border bg-muted/30 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Application detail
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">
                        {latestNote.content}
                      </pre>
                    </details>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No application body recorded.
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Open in CRM →
                    </Link>
                    <ActionsBar contactId={c.id} contactName={c.name} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
