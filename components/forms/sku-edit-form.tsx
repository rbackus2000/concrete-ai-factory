"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { createSkuAction, updateSkuAction } from "@/app/actions/sku-actions";
import { ActionNotice } from "@/components/forms/action-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  recordStatusValues,
  skuCategoryValues,
} from "@/lib/schemas/domain";
import {
  skuEditorSchema,
  type SkuEditorValues,
} from "@/lib/schemas/sku";

type SkuEditFormProps = {
  mode?: "create" | "edit";
  skuCode?: string;
  defaultValues: SkuEditorValues;
};

const geometryFields: Array<{
  name: keyof SkuEditorValues;
  label: string;
  step?: string;
}> = [
  { name: "outerLength", label: "Outer Length", step: "0.01" },
  { name: "outerWidth", label: "Outer Width", step: "0.01" },
  { name: "outerHeight", label: "Outer Height", step: "0.01" },
  { name: "innerLength", label: "Inner Length", step: "0.01" },
  { name: "innerWidth", label: "Inner Width", step: "0.01" },
  { name: "innerDepth", label: "Inner Depth", step: "0.01" },
  { name: "wallThickness", label: "Wall Thickness", step: "0.01" },
  { name: "bottomThickness", label: "Bottom Thickness", step: "0.01" },
  { name: "topLipThickness", label: "Top Lip Thickness", step: "0.01" },
  { name: "hollowCoreDepth", label: "Hollow Core Depth", step: "0.01" },
  { name: "domeRiseMin", label: "Dome Rise Min", step: "0.01" },
  { name: "domeRiseMax", label: "Dome Rise Max", step: "0.01" },
  { name: "longRibCount", label: "Long Rib Count", step: "1" },
  { name: "crossRibCount", label: "Cross Rib Count", step: "1" },
  { name: "ribWidth", label: "Rib Width", step: "0.01" },
  { name: "ribHeight", label: "Rib Height", step: "0.01" },
  { name: "drainDiameter", label: "Drain Diameter", step: "0.01" },
  { name: "reinforcementDiameter", label: "Reinforcement Diameter", step: "0.01" },
  { name: "reinforcementThickness", label: "Reinforcement Thickness", step: "0.01" },
  { name: "draftAngle", label: "Draft Angle", step: "0.01" },
  { name: "cornerRadius", label: "Corner Radius", step: "0.01" },
  { name: "fiberPercent", label: "Fiber Percent", step: "0.0001" },
];

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-red-600">{message}</p>;
}

export function SkuEditForm({ mode = "edit", skuCode, defaultValues }: SkuEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverNotice, setServerNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const form = useForm<SkuEditorValues>({
    resolver: zodResolver(skuEditorSchema),
    defaultValues,
  });

  const [newCode, setNewCode] = useState("");

  const onSubmit = (values: SkuEditorValues) => {
    setServerNotice(null);

    startTransition(async () => {
      try {
        if (mode === "create") {
          if (!newCode.trim()) {
            setServerNotice({ tone: "error", message: "SKU code is required." });
            return;
          }
          const result = await createSkuAction(newCode.trim(), values);
          setServerNotice({ tone: "success", message: `Created SKU ${result.sku.code}.` });
          router.push(`/skus/${result.sku.code}` as never);
          return;
        }
        const result = await updateSkuAction(skuCode!, values);
        form.reset({
          ...values,
          name: result.sku.name,
          slug: result.sku.slug,
          category: result.sku.category,
          status: result.sku.status,
          type: result.sku.type,
          finish: result.sku.finish,
          summary: result.sku.summary,
          targetWeightMin: result.sku.targetWeight.min,
          targetWeightMax: result.sku.targetWeight.max,
          outerLength: result.sku.outerLength,
          outerWidth: result.sku.outerWidth,
          outerHeight: result.sku.outerHeight,
          innerLength: result.sku.innerLength,
          innerWidth: result.sku.innerWidth,
          innerDepth: result.sku.innerDepth,
          wallThickness: result.sku.wallThickness,
          bottomThickness: result.sku.bottomThickness,
          topLipThickness: result.sku.topLipThickness,
          hollowCoreDepth: result.sku.hollowCoreDepth,
          domeRiseMin: result.sku.domeRiseMin,
          domeRiseMax: result.sku.domeRiseMax,
          longRibCount: result.sku.longRibCount,
          crossRibCount: result.sku.crossRibCount,
          ribWidth: result.sku.ribWidth,
          ribHeight: result.sku.ribHeight,
          drainDiameter: result.sku.drainDiameter,
          reinforcementDiameter: result.sku.reinforcementDiameter,
          reinforcementThickness: result.sku.reinforcementThickness,
          draftAngle: result.sku.draftAngle,
          cornerRadius: result.sku.cornerRadius,
          fiberPercent: result.sku.fiberPercent,
          datumSystemJson: JSON.stringify(result.sku.datumSystem, null, 2),
          calculatorDefaultsJson: JSON.stringify(result.sku.calculatorDefaults, null, 2),
        });
        setServerNotice({
          tone: "success",
          message: "Saved SKU changes to Prisma.",
        });
        router.refresh();
      } catch (error) {
        setServerNotice({
          tone: "error",
          message: error instanceof Error ? error.message : "Unable to save SKU.",
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "Create New SKU" : "Edit SKU Definition"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
          <section className="grid gap-4 md:grid-cols-2">
            {mode === "create" && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="skuCode">SKU Code</Label>
                <Input id="skuCode" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g., S9-WAVE" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" {...form.register("slug")} />
              <FieldError message={form.formState.errors.slug?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select id="category" {...form.register("category")}>
                {skuCategoryValues.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" {...form.register("status")}>
                {recordStatusValues.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input id="type" {...form.register("type")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finish">Finish</Label>
              <Input id="finish" {...form.register("finish")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetWeightMin">Target Weight Min</Label>
              <Input id="targetWeightMin" step="0.01" type="number" {...form.register("targetWeightMin")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetWeightMax">Target Weight Max</Label>
              <Input id="targetWeightMax" step="0.01" type="number" {...form.register("targetWeightMax")} />
              <FieldError message={form.formState.errors.targetWeightMax?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retailPrice">Retail Price ($)</Label>
              <Input id="retailPrice" step="0.01" type="number" {...form.register("retailPrice")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wholesalePrice">Wholesale Price ($)</Label>
              <Input id="wholesalePrice" step="0.01" type="number" {...form.register("wholesalePrice")} />
            </div>
          </section>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea id="summary" rows={4} {...form.register("summary")} />
            <FieldError message={form.formState.errors.summary?.message} />
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {geometryFields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  step={field.step}
                  type="number"
                  {...form.register(field.name)}
                />
                <FieldError message={form.formState.errors[field.name]?.message as string | undefined} />
              </div>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="datumSystemJson">Datum System JSON</Label>
              <Textarea id="datumSystemJson" rows={10} {...form.register("datumSystemJson")} />
              <FieldError message={form.formState.errors.datumSystemJson?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calculatorDefaultsJson">Calculator Defaults JSON</Label>
              <Textarea
                id="calculatorDefaultsJson"
                rows={10}
                {...form.register("calculatorDefaultsJson")}
              />
              <FieldError message={form.formState.errors.calculatorDefaultsJson?.message} />
            </div>
          </section>

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {mode === "create" ? "Enter a unique SKU code above." : `SKU code is locked to the route key: ${skuCode}`}
            </p>
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving..." : mode === "create" ? "Create SKU" : "Save SKU"}
            </Button>
          </div>

          <ActionNotice message={serverNotice?.message} tone={serverNotice?.tone} />
        </form>
      </CardContent>
    </Card>
  );
}
