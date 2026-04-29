"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  staffRoleValues,
  staffStatusValues,
  STAFF_ROLE_LABELS,
  type StaffRole,
  type StaffStatus,
} from "@/lib/schemas/domain";

import { resetStaffPasswordAction, updateStaffAction } from "../actions";

type Props = {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: StaffRole;
    status: StaffStatus;
  };
};

export function EditForm({ user }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resetTemp, setResetTemp] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateStaffAction(user.id, fd);
      if (!result.ok) { setError(result.error); return; }
      router.refresh();
    });
  }

  function handleReset() {
    if (!confirm(`Reset password for ${user.email}? They'll be forced to set a new one on next login.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await resetStaffPasswordAction(user.id);
      if (!result.ok) { setError(result.error); return; }
      setResetTemp(result.tempPassword);
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email (read-only)</Label>
          <Input id="email" value={user.email} readOnly disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">Full name</Label>
          <Input id="displayName" name="displayName" defaultValue={user.displayName} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              name="role"
              defaultValue={user.role}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {staffRoleValues.map((r) => (
                <option key={r} value={r}>{STAFF_ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={user.status}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {staffStatusValues.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <p className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <div className="space-y-3 rounded border bg-muted/30 p-4">
        <p className="text-sm font-medium">Reset password</p>
        <p className="text-xs text-muted-foreground">
          Generates a new temporary password. Shown once — copy and send to the user.
        </p>
        <Button type="button" variant="outline" onClick={handleReset} disabled={pending}>
          Generate new temp password
        </Button>
        {resetTemp && (
          <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-3 font-mono text-sm">
            <span className="text-xs uppercase text-amber-900">New temp pw:</span>{" "}
            <span className="select-all rounded bg-amber-100 px-2 py-1 font-bold text-amber-900">
              {resetTemp}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
