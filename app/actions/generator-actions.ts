"use server";

import { requireSession } from "@/lib/auth/session";
import { generateOutput } from "@/lib/services/generator-service";
import { generatorFormSchema, type GeneratorFormValues } from "@/lib/schemas/generator";

export async function generateOutputAction(values: GeneratorFormValues) {
  await requireSession();
  const parsed = generatorFormSchema.parse(values);
  return generateOutput(parsed);
}
