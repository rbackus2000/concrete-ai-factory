"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  createMaterialsMasterAction,
  updateMaterialsMasterAction,
} from "@/app/actions/admin-actions";
import { ActionNotice } from "@/components/forms/action-notice";
import { FieldError } from "@/components/forms/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  categoryScopeValues,
  materialCategoryValues,
  recordStatusValues,
  skuCategoryValues,
} from "@/lib/schemas/domain";
import {
  materialsMasterAdminSchema,
  type MaterialsMasterAdminValues,
} from "@/lib/schemas/admin";

type MaterialsMasterFormProps = {
  mode: "create" | "edit";
  recordId?: string;
  skuOptions: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  defaultValues: MaterialsMasterAdminValues;
};

export function MaterialsMasterForm({
  mode,
  recordId,
  skuOptions,
  defaultValues,
}: MaterialsMasterFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverNotice, setServerNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const form = useForm<MaterialsMasterAdminValues>({
    resolver: zodResolver(materialsMasterAdminSchema),
    defaultValues,
  });

  const onSubmit = (values: MaterialsMasterAdminValues) => {
    setServerNotice(null);

    startTransition(async () => {
      try {
        const result =
          mode === "create"
            ? await createMaterialsMasterAction(values)
            : await updateMaterialsMasterAction(recordId ?? "", values);

        setServerNotice({
          tone: "success",
          message: mode === "create" ? "Created material record." : "Saved material record.",
        });

        if (mode === "create") {
          router.push(`/admin/materials-master/${result.id}`);
        } else {
          router.refresh();
        }
      } catch (error) {
        setServerNotice({
          tone: "error",
          message: error instanceof Error ? error.message : "Unable to save material record.",
        });
      }
    });
  };

  return (
    <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
      <CardHeader>
        <CardTitle>{mode === "create" ? "New Material Record" : "Edit Material Record"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...form.register("code")} />
              <FieldError message={form.formState.errors.code?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select id="category" {...form.register("category")}>
                {materialCategoryValues.map((value) => (
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
              <Label htmlFor="categoryScope">Scope</Label>
              <Select id="categoryScope" {...form.register("categoryScope")}>
                {categoryScopeValues.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="skuCategory">SKU Category</Label>
              <Select id="skuCategory" {...form.register("skuCategory")}>
                <option value="">None</option>
                {skuCategoryValues.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.skuCategory?.message} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="skuOverrideId">SKU Override</Label>
              <Select id="skuOverrideId" {...form.register("skuOverrideId")}>
                <option value="">None</option>
                {skuOptions.map((sku) => (
                  <option key={sku.id} value={sku.id}>
                    {sku.code} · {sku.name}
                  </option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.skuOverrideId?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" {...form.register("unit")} />
              <FieldError message={form.formState.errors.unit?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" step="0.01" type="number" {...form.register("quantity")} />
              <FieldError message={form.formState.errors.quantity?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitCost">Unit Cost</Label>
              <Input id="unitCost" step="0.01" type="number" {...form.register("unitCost")} />
              <FieldError message={form.formState.errors.unitCost?.message} />
            </div>
          </section>

          <div className="space-y-2">
            <Label htmlFor="specification">Specification</Label>
            <Textarea id="specification" rows={4} {...form.register("specification")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={4} {...form.register("notes")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metadataJson">Metadata JSON</Label>
            <Textarea id="metadataJson" rows={6} {...form.register("metadataJson")} />
            <FieldError message={form.formState.errors.metadataJson?.message} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Material records remain reusable defaults unless scoped to a category or SKU override.
            </p>
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving..." : mode === "create" ? "Create Material" : "Save Material"}
            </Button>
          </div>

          <ActionNotice message={serverNotice?.message} tone={serverNotice?.tone} />
        </form>
      </CardContent>
    </Card>
  );
}
