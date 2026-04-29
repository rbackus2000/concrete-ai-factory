import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/session";
import { findStaffById } from "@/lib/services/staff-service";

import { EditForm } from "./form";

export const dynamic = "force-dynamic";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const user = await findStaffById(id);
  if (!user) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Admin · Staff
        </p>
        <h1 className="mt-2 font-serif text-3xl">{user.displayName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Created {user.createdAt.toLocaleDateString("en-US")}
          {user.lastLoginAt && (
            <> · Last login {user.lastLoginAt.toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}</>
          )}
        </p>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <EditForm
            user={{
              id: user.id,
              email: user.email,
              displayName: user.displayName,
              role: user.role,
              status: user.status,
            }}
          />
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
