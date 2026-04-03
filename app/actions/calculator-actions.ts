"use server";

import { requireSession } from "@/lib/auth/session";
import { runCalculatorFlow } from "@/lib/services/calculator-service";
import { calculatorRunSchema, type CalculatorRunValues } from "@/lib/schemas/calculator";

export async function runCalculatorAction(values: CalculatorRunValues) {
  await requireSession();
  const parsed = calculatorRunSchema.parse(values);
  return runCalculatorFlow(parsed);
}
