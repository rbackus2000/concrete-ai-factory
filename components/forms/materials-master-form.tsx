"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  createMaterialsMasterAction,
  updateMaterialsMasterAction,
  syncSingleMaterialPriceAction,
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
  supplierOptions?: Array<{
    id: string;
    label: string;
  }>;
  defaultValues: MaterialsMasterAdminValues;
};

export function MaterialsMasterForm({
  mode,
  recordId,
  skuOptions,
  supplierOptions = [],
  defaultValues,
}: MaterialsMasterFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
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

  async function handleSyncPrice() {
    if (!recordId) return;
    setIsSyncing(true);
    setServerNotice(null);
    try {
      const result = await syncSingleMaterialPriceAction(recordId);
      if (result.success) {
        setServerNotice({
          tone: "success",
          message: result.priceChanged
            ? `Price updated: $${result.previousUnitCost?.toFixed(2)} → $${result.newUnitCost?.toFixed(2)} (${result.tiersFound} variants found)`
            : `Price confirmed — no change (${result.tiersFound} variants found)`,
        });
        router.refresh();
      } else {
        setServerNotice({ tone: "error", message: result.error ?? "Sync failed." });
      }
    } catch (e) {
      setServerNotice({ tone: "error", message: e instanceof Error ? e.message : "Sync failed." });
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Card>
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

          {/* Supplier Section */}
          <section className="space-y-4 rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Supplier & Price Tracking
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplierId">Supplier</Label>
                <Select id="supplierId" {...form.register("supplierId")}>
                  <option value="">None</option>
                  {supplierOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierSku">Supplier SKU / Part #</Label>
                <Input id="supplierSku" {...form.register("supplierSku")} placeholder="e.g. KP-MM-56" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="supplierProductUrl">Supplier Product URL</Label>
                <Input
                  id="supplierProductUrl"
                  {...form.register("supplierProductUrl")}
                  placeholder="https://www.kodiakpro.com/products/..."
                />
                <p className="text-xs text-muted-foreground">
                  Shopify product URL — used for automatic price scraping
                </p>
              </div>
            </div>
            {mode === "edit" && form.getValues("supplierProductUrl") && (
              <div className="flex items-center gap-4 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSyncing}
                  onClick={handleSyncPrice}
                >
                  {isSyncing ? "Syncing..." : "Sync Price Now"}
                </Button>
              </div>
            )}
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
