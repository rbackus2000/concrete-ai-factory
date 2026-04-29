"use server";

import { redirect } from "next/navigation";

import { authenticateStaff } from "@/lib/services/staff-service";
import { setStaffSessionCookie } from "@/lib/auth/staff-session";

export type SignInResult =
  | { ok: true; mustChangePassword: boolean }
  | { ok: false; error: string };

export async function signInAction(formData: FormData): Promise<SignInResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  const user = await authenticateStaff(email, password);
  if (!user) {
    // Single generic error — don't distinguish "no such user" from "wrong password".
    return { ok: false, error: "Invalid email or password." };
  }

  await setStaffSessionCookie({
    staffId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  });

  return { ok: true, mustChangePassword: user.mustChangePassword };
}

export async function signOutAction(): Promise<never> {
  const { clearStaffSessionCookie } = await import("@/lib/auth/staff-session");
  await clearStaffSessionCookie();
  redirect("/login");
}
