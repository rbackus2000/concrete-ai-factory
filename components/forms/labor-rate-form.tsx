"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { createLaborRateAction, updateLaborRateAction } from "@/app/actions/admin-actions";
import { ActionNotice } from "@/components/forms/action-notice";
import { FieldError } from "@/components/forms/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { recordStatusValues } from "@/lib/schemas/domain";
import { laborRateAdminSchema, type LaborRateAdminValues } from "@/lib/schemas/labor-rate";

type Props = {
  mode: "create" | "edit";
  recordId?: string;
  defaultValues: LaborRateAdminValues;
};

export default function LaborRateForm({ mode, recordId, defaultValues }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverNotice, setServerNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const form = useForm<LaborRateAdminValues>({
    resolver: zodResolver(laborRateAdminSchema),
    defaultValues,
  });

  const onSubmit = (values: LaborRateAdminValues) => {
    setServerNotice(null);
    startTransition(async () => {
      try {
        const result = mode === "create"
          ? await createLaborRateAction(values)
          : await updateLaborRateAction(recordId ?? "", values);
        setServerNotice({ tone: "success", message: mode === "create" ? "Created labor rate." : "Saved labor rate." });
        if (mode === "create") router.push(`/admin/labor-rates/${result.id}`);
        else router.refresh();
      } catch (error) {
        setServerNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to save." });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "New Labor Rate" : "Edit Labor Rate"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...form.register("code")} placeholder="LR-SHOP" />
              <FieldError message={form.formState.errors.code?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} placeholder="Shop Production" />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <Input id="hourlyRate" type="number" step="0.01" {...form.register("hourlyRate")} />
              <FieldError message={form.formState.errors.hourlyRate?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" {...form.register("status")}>
                {recordStatusValues.map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("isDefault")} className="rounded border-input" />
                Default rate for new SKUs (only one rate can be default)
              </label>
            </div>
          </section>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...form.register("description")} placeholder="What this rate covers — labor types, skill level, etc." />
          </div>
          <div className="flex justify-end">
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving..." : mode === "create" ? "Create Rate" : "Save Rate"}
            </Button>
          </div>
          <ActionNotice message={serverNotice?.message} tone={serverNotice?.tone} />
        </form>
      </CardContent>
    </Card>
  );
}
