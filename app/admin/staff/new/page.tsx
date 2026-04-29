import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/session";

import { InviteForm } from "./form";

export const dynamic = "force-dynamic";

export default async function InviteStaffPage() {
  await requireAdminSession();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Admin · Staff
        </p>
        <h1 className="mt-2 font-serif text-3xl">Invite a new staff member</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Creates the account and shows you a one-time temporary password. Share
          it with the user out-of-band (Slack, text, in person) — they will be
          forced to change it on first login.
        </p>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Account details</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteForm />
        </CardContent>
      </Card>
      <Link
        href="/admin/staff"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to staff list
      </Link>
    </div>
  );
}
