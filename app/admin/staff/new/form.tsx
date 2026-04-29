"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { staffRoleValues, STAFF_ROLE_LABELS } from "@/lib/schemas/domain";

import { inviteStaffAction } from "../actions";

export function InviteForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ email: string; tempPassword: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await inviteStaffAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIssued({ email: result.email, tempPassword: result.tempPassword });
    });
  }

  if (issued) {
    return (
      <div className="space-y-4">
        <div className="rounded border border-green-300 bg-green-50 p-4">
          <p className="font-medium text-green-900">Account created.</p>
          <p className="mt-1 text-sm text-green-800">
            Send the user this temporary password — it is shown once and cannot
            be retrieved later. They will be forced to change it on first login.
          </p>
        </div>
        <div className="rounded border bg-muted/30 p-4 font-mono text-sm">
          <div className="flex items-center justify-between gap-4 border-b pb-2">
            <span className="text-muted-foreground">Email</span>
            <span>{issued.email}</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-2">
            <span className="text-muted-foreground">Temp password</span>
            <span className="select-all rounded bg-amber-100 px-2 py-1 font-bold text-amber-900">
              {issued.tempPassword}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigator.clipboard?.writeText(
                `Email: ${issued.email}\nTemp password: ${issued.tempPassword}\nLogin: ${window.location.origin}/login`,
              )
            }
          >
            Copy credentials
          </Button>
          <Button type="button" onClick={() => { setIssued(null); }}>
            Invite another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">Full name</Label>
        <Input id="displayName" name="displayName" required autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          name="role"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          defaultValue="SHOP_USER"
          required
        >
          {staffRoleValues.map((r) => (
            <option key={r} value={r}>
              {STAFF_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          <strong>Admin</strong> sees everything · <strong>Ops Manager</strong> sees CRM, ops,
          reports · <strong>Shop Foreman</strong> sees production, mold gen, packets ·{" "}
          <strong>Shop User</strong> sees jobs + packets only · <strong>Marketing</strong> sees
          catalog + image gen + marketing · <strong>Finance</strong> sees CRM, orders, invoices,
          reports.
        </p>
      </div>
      {error && (
        <p className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
