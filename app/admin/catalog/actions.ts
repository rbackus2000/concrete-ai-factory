"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/auth/session";
import { publishCatalog } from "@/lib/services/catalog-service";

export async function publishCatalogAction() {
  await requireAdminSession();
  const result = await publishCatalog();
  revalidatePath("/admin/catalog");
  return { success: true as const, version: result.version, pdfUrl: result.pdfUrl };
}
