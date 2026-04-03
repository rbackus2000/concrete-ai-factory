"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { updateSkuFromEditor } from "@/lib/services/sku-service";
import { skuEditorSchema, type SkuEditorValues } from "@/lib/schemas/sku";

export async function updateSkuAction(skuCode: string, values: SkuEditorValues) {
  const actor = await requireSession();
  const parsed = skuEditorSchema.parse(values);
  const sku = await updateSkuFromEditor(skuCode, parsed, actor);

  revalidatePath("/skus");
  revalidatePath(`/skus/${skuCode}`);

  return {
    success: true,
    sku,
  };
}
