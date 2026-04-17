"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { createProductColorAction, updateProductColorAction } from "@/app/actions/admin-actions";
import { ActionNotice } from "@/components/forms/action-notice";
import { FieldError } from "@/components/forms/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { recordStatusValues } from "@/lib/schemas/domain";
import { productColorAdminSchema, type ProductColorAdminValues } from "@/lib/schemas/color";

type Props = {
  mode: "create" | "edit";
  recordId?: string;
  collectionOptions: Array<{ id: string; label: string }>;
  defaultValues: ProductColorAdminValues;
};

export default function ProductColorForm({ mode, recordId, collectionOptions, defaultValues }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverNotice, setServerNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const form = useForm<ProductColorAdminValues>({
    resolver: zodResolver(productColorAdminSchema),
    defaultValues,
  });

  const hexValue = form.watch("hexApprox");

  const onSubmit = (values: ProductColorAdminValues) => {
    setServerNotice(null);
    startTransition(async () => {
      try {
        const result = mode === "create"
          ? await createProductColorAction(values)
          : await updateProductColorAction(recordId ?? "", values);
        setServerNotice({ tone: "success", message: mode === "create" ? "Created color." : "Saved color." });
        if (mode === "create") router.push(`/admin/colors/${result.id}`);
        else router.refresh();
      } catch (error) {
        setServerNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to save." });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "New Color" : "Edit Color"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="collectionId">Collection</Label>
              <Select id="collectionId" {...form.register("collectionId")}>
                <option value="">Select collection...</option>
                {collectionOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.collectionId?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" {...form.register("status")}>
                {recordStatusValues.map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...form.register("code")} placeholder="CLR-CLASSIC-FROST" />
              <FieldError message={form.formState.errors.code?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} placeholder="Classic Frost" />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hexApprox">Hex Color</Label>
              <div className="flex items-center gap-2">
                <Input id="hexApprox" {...form.register("hexApprox")} placeholder="#F2F1EE" className="flex-1" />
                <div
                  className="h-9 w-9 shrink-0 rounded-md border border-border shadow-sm"
                  style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(hexValue) ? hexValue : "#ccc" }}
                />
              </div>
              <FieldError message={form.formState.errors.hexApprox?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input id="sortOrder" type="number" {...form.register("sortOrder")} />
            </div>
          </section>
          <div className="space-y-2">
            <Label htmlFor="pigmentFormula">Pigment Formula</Label>
            <Textarea id="pigmentFormula" rows={3} {...form.register("pigmentFormula")} placeholder="e.g. STONE pigment — light dose (~0.5lb per 50lb bag)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...form.register("notes")} />
          </div>
          <div className="flex justify-end">
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving..." : mode === "create" ? "Create Color" : "Save Color"}
            </Button>
          </div>
          <ActionNotice message={serverNotice?.message} tone={serverNotice?.tone} />
        </form>
      </CardContent>
    </Card>
  );
}
