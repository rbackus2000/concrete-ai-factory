"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { createSupplierAction, updateSupplierAction } from "@/app/actions/admin-actions";
import { ActionNotice } from "@/components/forms/action-notice";
import { FieldError } from "@/components/forms/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { recordStatusValues } from "@/lib/schemas/domain";
import { supplierAdminSchema, type SupplierAdminValues } from "@/lib/schemas/supplier";

type SupplierFormProps = {
  mode: "create" | "edit";
  recordId?: string;
  defaultValues: SupplierAdminValues;
};

export default function SupplierForm({ mode, recordId, defaultValues }: SupplierFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverNotice, setServerNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const form = useForm<SupplierAdminValues>({
    resolver: zodResolver(supplierAdminSchema),
    defaultValues,
  });

  const onSubmit = (values: SupplierAdminValues) => {
    setServerNotice(null);
    startTransition(async () => {
      try {
        const result = mode === "create"
          ? await createSupplierAction(values)
          : await updateSupplierAction(recordId ?? "", values);
        setServerNotice({ tone: "success", message: mode === "create" ? "Created supplier." : "Saved supplier." });
        if (mode === "create") router.push(`/admin/suppliers/${result.id}`);
        else router.refresh();
      } catch (error) {
        setServerNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to save." });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "New Supplier" : "Edit Supplier"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...form.register("code")} placeholder="SUP-KODIAK" />
              <FieldError message={form.formState.errors.code?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" {...form.register("website")} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" {...form.register("status")}>
                {recordStatusValues.map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input id="contactEmail" {...form.register("contactEmail")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input id="contactPhone" {...form.register("contactPhone")} />
            </div>
          </section>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={4} {...form.register("notes")} />
          </div>
          <div className="flex justify-end">
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving..." : mode === "create" ? "Create Supplier" : "Save Supplier"}
            </Button>
          </div>
          <ActionNotice message={serverNotice?.message} tone={serverNotice?.tone} />
        </form>
      </CardContent>
    </Card>
  );
}
