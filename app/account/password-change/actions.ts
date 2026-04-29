"use server";

import { readStaffSessionCookie } from "@/lib/auth/staff-session";
import { changeOwnPassword } from "@/lib/services/staff-service";

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: string };

export async function changePasswordAction(formData: FormData): Promise<ChangePasswordResult> {
  const session = await readStaffSessionCookie();
  if (!session) return { ok: false, error: "Not signed in." };

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next !== confirm) {
    return { ok: false, error: "New password and confirmation do not match." };
  }

  const result = await changeOwnPassword(session.staffId, current, next);
  if (!result.ok) return { ok: false, error: result.reason };
  return { ok: true };
}
