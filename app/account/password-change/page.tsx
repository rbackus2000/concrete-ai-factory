import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readStaffSessionCookie } from "@/lib/auth/staff-session";

import { PasswordChangeForm } from "./form";

export const dynamic = "force-dynamic";

export default async function PasswordChangePage() {
  const session = await readStaffSessionCookie();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {session.email}
          </p>
          <CardTitle className="text-2xl">Set a new password</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>
    </div>
  );
}
