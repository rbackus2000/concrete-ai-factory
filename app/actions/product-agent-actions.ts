"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/auth/session";
import {
  generateDesignBrief,
  generateConceptImage,
  generateProductBundle,
  saveProductBundle,
} from "@/lib/services/product-agent-service";
import type { ProductBundle } from "@/lib/engines/product-agent-engine";

// Step 1: Generate design brief from simple prompt
export async function generateBriefAction(simplePrompt: string) {
  await requireAdminSession();

  if (!simplePrompt || simplePrompt.trim().length < 5) {
    return { error: "Tell me what product you want to create." };
  }

  try {
    const { brief, usage } = await generateDesignBrief(simplePrompt.trim());
    return { brief, usage, error: null };
  } catch (err) {
    console.error("[Product Agent] Brief generation failed:", err);
    return { error: err instanceof Error ? err.message : "Failed to generate design brief.", brief: null, usage: null };
  }
}

// Step 2: Generate concept image from image prompt
export async function generateImageAction(imagePrompt: string, productName: string) {
  await requireAdminSession();

  try {
    const result = await generateConceptImage(imagePrompt, productName);
    return { ...result, error: null };
  } catch (err) {
    console.error("[Product Agent] Image generation failed:", err);
    return { error: err instanceof Error ? err.message : "Failed to generate concept image.", imageUrl: null, filePath: null, outputId: null };
  }
}

// Step 3: Generate full product bundle from approved brief
export async function generateBundleAction(brief: {
  productName: string;
  category: string;
  styleDescription: string;
  keyFeatures: string[];
  suggestedDimensions: { outerLength: number; outerWidth: number; outerHeight: number; innerDepth: number };
  drainType: string;
  mountType: string;
  finish: string;
  imagePrompt: string;
}) {
  await requireAdminSession();

  try {
    const { bundle, usage } = await generateProductBundle(brief);
    return { bundle, usage, error: null };
  } catch (err) {
    console.error("[Product Agent] Bundle generation failed:", err);
    return { error: err instanceof Error ? err.message : "Failed to generate product bundle.", bundle: null, usage: null };
  }
}

// Step 4: Save to database
export async function saveProductAction(bundle: ProductBundle, conceptImageUrl: string | null) {
  const actor = await requireAdminSession();

  try {
    const result = await saveProductBundle(bundle, conceptImageUrl, actor);
    revalidatePath("/skus");
    revalidatePath("/admin");
    return { ...result, error: null };
  } catch (err) {
    console.error("[Product Agent] Save failed:", err);
    return { error: err instanceof Error ? err.message : "Failed to save product.", skuId: null, skuCode: null };
  }
}
