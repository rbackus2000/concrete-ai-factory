import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAFF_ROLE_LABELS, staffRoleSchema } from "@/lib/schemas/domain";

export const dynamic = "force-dynamic";

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role: roleRaw } = await searchParams;
  const roleParse = roleRaw ? staffRoleSchema.safeParse(roleRaw) : null;
  const roleLabel =
    roleParse && roleParse.success ? STAFF_ROLE_LABELS[roleParse.data] : null;

  return (
    <div className="mx-auto max-w-2xl py-16">
      <Card>
        <CardHeader>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            403 — Access denied
          </p>
          <CardTitle className="text-2xl">You don&apos;t have access to this page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {roleLabel ? (
            <p>
              You&apos;re signed in as <span className="font-mono font-medium">{roleLabel}</span>,
              and this section is restricted to other roles.
            </p>
          ) : (
            <p>This section is restricted.</p>
          )}
          <p className="text-muted-foreground">
            If you believe this is wrong, ask an admin to update your role in
            <Link
              href="/admin/staff"
              className="ml-1 text-primary underline-offset-4 hover:underline"
            >
              Staff Management
            </Link>
            .
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="rounded border bg-background px-3 py-1.5 text-sm hover:bg-muted"
            >
              ← Back to dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
