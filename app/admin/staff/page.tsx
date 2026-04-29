import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/session";
import { listStaff } from "@/lib/services/staff-service";
import { STAFF_ROLE_LABELS } from "@/lib/schemas/domain";

export const dynamic = "force-dynamic";

export default async function StaffListPage() {
  await requireAdminSession();
  const staff = await listStaff();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-2 font-serif text-3xl">Staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {staff.length} {staff.length === 1 ? "user" : "users"}.
          </p>
        </div>
        <Link href="/admin/staff/new">
          <Button>Invite staff</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All staff</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b">
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Role</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Last login</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b last:border-b-0">
                  <td className="px-2 py-3 font-medium">
                    {s.displayName}
                    {s.mustChangePassword && (
                      <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                        TEMP PW
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3 font-mono text-xs">{s.email}</td>
                  <td className="px-2 py-3">{STAFF_ROLE_LABELS[s.role]}</td>
                  <td className="px-2 py-3">
                    <span
                      className={
                        s.status === "ACTIVE"
                          ? "text-green-700"
                          : "text-muted-foreground"
                      }
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-xs text-muted-foreground">
                    {s.lastLoginAt
                      ? s.lastLoginAt.toLocaleString("en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—"}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <Link
                      href={`/admin/staff/${s.id}`}
                      className="text-primary text-xs underline-offset-4 hover:underline"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
