"use client";

import { useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { runCalculatorAction } from "@/app/actions/calculator-actions";
import { ActionNotice } from "@/components/forms/action-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { calculatorRunSchema, type CalculatorRunValues } from "@/lib/schemas/calculator";

type CalculatorFormProps = {
  skus: Array<{
    code: string;
    name: string;
    category: string;
    defaults: CalculatorRunValues;
  }>;
  initialResult: {
    sku: {
      code: string;
      name: string;
    };
    cards: Array<{
      title: string;
      items: Array<{
        label: string;
        value: string;
      }>;
    }>;
    metrics: {
      batchSize: number;
      scaleFactor: number;
      water: number;
      plasticizer: number;
      fiber: number;
      pigmentGrams: number;
      sealerEstimateGallons: number;
      materialCost: number;
      packagingCost: number;
      sealerCost: number;
      laborCost: number;
      overheadCost: number;
      totalCost: number;
      costPerUnit: number;
    };
  };
};

const editableFields: Array<{
  name: keyof CalculatorRunValues;
  label: string;
  step: string;
}> = [
  { name: "unitsToProduce", label: "Units", step: "1" },
  { name: "wasteFactor", label: "Waste Factor", step: "0.01" },
  { name: "pigmentIntensityPercent", label: "Pigment Intensity", step: "0.0001" },
  { name: "sealerCoats", label: "Sealer Coats", step: "1" },
  { name: "materialCostMultiplier", label: "Material Multiplier", step: "0.01" },
  { name: "sealerCostPerGallon", label: "Sealer Cost / Gal", step: "0.01" },
  { name: "laborCostPerUnit", label: "Labor / Unit", step: "0.01" },
  { name: "overheadCostPerUnit", label: "Overhead / Unit", step: "0.01" },
];

export function CalculatorForm({ skus, initialResult }: CalculatorFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverNotice, setServerNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [result, setResult] = useState(initialResult);

  const form = useForm<CalculatorRunValues>({
    resolver: zodResolver(calculatorRunSchema),
    defaultValues: skus[0]?.defaults,
  });

  const selectedSkuCode = form.watch("skuCode");

  useEffect(() => {
    const selectedSku = skus.find((sku) => sku.code === selectedSkuCode);

    if (!selectedSku) {
      return;
    }

    form.reset(selectedSku.defaults);
  }, [form, selectedSkuCode, skus]);

  const onSubmit = (values: CalculatorRunValues) => {
    setServerNotice(null);

    startTransition(async () => {
      try {
        const nextResult = await runCalculatorAction(values);
        setResult(nextResult);
        setServerNotice({
          tone: "success",
          message: `Calculated from live SKU ${nextResult.sku.code}.`,
        });
      } catch (error) {
        setServerNotice({
          tone: "error",
          message: error instanceof Error ? error.message : "Calculation failed.",
        });
      }
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
        <CardHeader>
          <CardTitle>Run Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="skuCode">SKU</Label>
              <Select id="skuCode" {...form.register("skuCode")}>
                {skus.map((sku) => (
                  <option key={sku.code} value={sku.code}>
                    {sku.code} · {sku.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {editableFields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input
                    id={field.name}
                    step={field.step}
                    type="number"
                    {...form.register(field.name)}
                  />
                </div>
              ))}
            </div>

            <Button className="w-full" disabled={isPending || skus.length === 0} type="submit">
              {isPending ? "Calculating..." : "Run Calculator"}
            </Button>

            <ActionNotice message={serverNotice?.message} tone={serverNotice?.tone} />
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <section className="grid gap-4 md:grid-cols-3">
          {result.cards.map((card) => (
            <Card key={card.title} className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
              <CardHeader>
                <CardTitle>{card.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {card.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardHeader>
            <CardTitle>Metric Detail</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Batch size</span>
              <span className="font-medium">{result.metrics.batchSize} lb</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Scale factor</span>
              <span className="font-medium">{result.metrics.scaleFactor}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Water</span>
              <span className="font-medium">{result.metrics.water} lb</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Plasticizer</span>
              <span className="font-medium">{result.metrics.plasticizer} g</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Fiber</span>
              <span className="font-medium">{result.metrics.fiber} lb</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Pigment grams</span>
              <span className="font-medium">{result.metrics.pigmentGrams} g</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Sealer estimate</span>
              <span className="font-medium">{result.metrics.sealerEstimateGallons} gal</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Cost per unit</span>
              <span className="font-medium">${result.metrics.costPerUnit.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
