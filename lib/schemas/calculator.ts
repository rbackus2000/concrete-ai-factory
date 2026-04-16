import { z } from "zod";

export const calculatorRunSchema = z.object({
  skuCode: z.string().min(1, "SKU is required."),
  unitsToProduce: z.coerce.number().int().min(1, "Units must be at least 1."),
  wasteFactor: z.coerce.number().min(1, "Waste factor must be at least 1."),
  pigmentIntensityPercent: z.coerce.number().min(0, "Pigment intensity cannot be negative."),
  sealerCoats: z.coerce.number().int().min(0, "Sealer coats cannot be negative."),
  materialCostMultiplier: z.coerce.number().min(0, "Material multiplier cannot be negative."),
  sealerCostPerGallon: z.coerce.number().min(0, "Sealer cost cannot be negative."),
  laborCostPerUnit: z.coerce.number().min(0, "Labor cost cannot be negative."),
  overheadCostPerUnit: z.coerce.number().min(0, "Overhead cost cannot be negative."),
  marginPercent: z.coerce.number().min(0).max(99).default(0),
});

export type CalculatorRunValues = z.infer<typeof calculatorRunSchema>;
