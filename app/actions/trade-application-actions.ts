"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/auth/session";
import {
  approveTradeApplication,
  declineTradeApplication,
} from "@/lib/services/trade-application-service";

export async function approveTradeApplicationAction(contactId: string) {
  const actor = await requireAdminSession();
  const result = await approveTradeApplication(contactId, actor);
  revalidatePath("/admin/trade-applications");
  revalidatePath(`/contacts/${contactId}`);
  return result;
}

export async function declineTradeApplicationAction(
  contactId: string,
  reason: string,
) {
  const actor = await requireAdminSession();
  const result = await declineTradeApplication(
    contactId,
    actor,
    reason?.trim() || null,
  );
  revalidatePath("/admin/trade-applications");
  revalidatePath(`/contacts/${contactId}`);
  return result;
}
