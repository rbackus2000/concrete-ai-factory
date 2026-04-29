"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/auth/session";
import {
  countActiveAdmins,
  inviteStaff,
  resetStaffPassword,
  updateStaff,
  findStaffById,
} from "@/lib/services/staff-service";
import { staffRoleSchema, staffStatusSchema } from "@/lib/schemas/domain";

export type InviteResult =
  | { ok: true; email: string; tempPassword: string }
  | { ok: false; error: string };

export async function inviteStaffAction(formData: FormData): Promise<InviteResult> {
  const admin = await requireAdminSession();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "");

  const roleParse = staffRoleSchema.safeParse(roleRaw);
  if (!roleParse.success) return { ok: false, error: "Invalid role." };
  if (!email.includes("@")) return { ok: false, error: "Invalid email address." };
  if (!displayName) return { ok: false, error: "Display name is required." };

  try {
    const result = await inviteStaff({
      email,
      displayName,
      role: roleParse.data,
      createdById: admin.id,
    });
    revalidatePath("/admin/staff");
    return { ok: true, email: result.user.email, tempPassword: result.tempPassword };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to invite staff." };
  }
}

export type UpdateResult = { ok: true } | { ok: false; error: string };

export async function updateStaffAction(
  id: string,
  formData: FormData,
): Promise<UpdateResult> {
  await requireAdminSession();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "");
  const statusRaw = String(formData.get("status") ?? "");

  const roleParse = staffRoleSchema.safeParse(roleRaw);
  const statusParse = staffStatusSchema.safeParse(statusRaw);
  if (!roleParse.success || !statusParse.success) {
    return { ok: false, error: "Invalid role or status." };
  }
  if (!displayName) return { ok: false, error: "Display name is required." };

  // Safety: never let the last active ADMIN demote / disable themselves out
  // of admin coverage. Count BEFORE the change.
  const target = await findStaffById(id);
  if (!target) return { ok: false, error: "User not found." };
  const currentlyAdmin = target.role === "ADMIN" && target.status === "ACTIVE";
  const stillAdminAfter = roleParse.data === "ADMIN" && statusParse.data === "ACTIVE";
  if (currentlyAdmin && !stillAdminAfter) {
    const adminCount = await countActiveAdmins();
    if (adminCount <= 1) {
      return { ok: false, error: "Cannot remove the last active admin. Promote another user first." };
    }
  }

  try {
    await updateStaff(id, {
      displayName,
      role: roleParse.data,
      status: statusParse.data,
    });
    revalidatePath("/admin/staff");
    revalidatePath(`/admin/staff/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed." };
  }
}

export type ResetResult =
  | { ok: true; tempPassword: string }
  | { ok: false; error: string };

export async function resetStaffPasswordAction(id: string): Promise<ResetResult> {
  await requireAdminSession();
  try {
    const result = await resetStaffPassword(id);
    revalidatePath(`/admin/staff/${id}`);
    return { ok: true, tempPassword: result.tempPassword };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Reset failed." };
  }
}
