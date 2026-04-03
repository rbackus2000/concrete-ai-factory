"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  createQcTemplateAction,
  updateQcTemplateAction,
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
  qcCategoryValues,
  recordStatusValues,
  skuCategoryValues,
} from "@/lib/schemas/domain";
import {
  qcTemplateAdminSchema,
  type QcTemplateAdminValues,
} from "@/lib/schemas/admin";

type QcTemplateFormProps = {
  mode: "create" | "edit";
  recordId?: string;
  skuOptions: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  defaultValues: QcTemplateAdminValues;
};

export function QcTemplateForm({
  mode,
  recordId,
  skuOptions,
  defaultValues,
}: QcTemplateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverNotice, setServerNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const form = useForm<QcTemplateAdminValues>({
    resolver: zodResolver(qcTemplateAdminSchema),
    defaultValues,
  });

  const onSubmit = (values: QcTemplateAdminValues) => {
    setServerNotice(null);

    startTransition(async () => {
      try {
        const result =
          mode === "create"
            ? await createQcTemplateAction(values)
            : await updateQcTemplateAction(recordId ?? "", values);

        setServerNotice({
          tone: "success",
          message: mode === "create" ? "Created QC template." : "Saved QC template.",
        });

        if (mode === "create") {
          router.push(`/admin/qc-templates/${result.id}`);
        } else {
          router.refresh();
        }
      } catch (error) {
        setServerNotice({
          tone: "error",
          message: error instanceof Error ? error.message : "Unable to save QC template.",
        });
      }
    });
  };

  return (
    <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
      <CardHeader>
        <CardTitle>{mode === "create" ? "New QC Template" : "Edit QC Template"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="templateKey">Template Key</Label>
              <Input id="templateKey" {...form.register("templateKey")} />
              <FieldError message={form.formState.errors.templateKey?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select id="category" {...form.register("category")}>
                {qcCategoryValues.map((value) => (
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
          </section>

          <div className="space-y-2">
            <Label htmlFor="checklistText">Checklist JSON</Label>
            <Textarea id="checklistText" rows={6} {...form.register("checklistText")} />
            <FieldError message={form.formState.errors.checklistText?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acceptanceCriteriaText">Acceptance Criteria JSON</Label>
            <Textarea
              id="acceptanceCriteriaText"
              rows={5}
              {...form.register("acceptanceCriteriaText")}
            />
            <FieldError message={form.formState.errors.acceptanceCriteriaText?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rejectionCriteriaText">Rejection Criteria JSON</Label>
            <Textarea
              id="rejectionCriteriaText"
              rows={5}
              {...form.register("rejectionCriteriaText")}
            />
            <FieldError message={form.formState.errors.rejectionCriteriaText?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={4} {...form.register("notes")} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              QC templates stay intentionally structured so packet and export layers can consume them later.
            </p>
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving..." : mode === "create" ? "Create QC Template" : "Save QC Template"}
            </Button>
          </div>

          <ActionNotice message={serverNotice?.message} tone={serverNotice?.tone} />
        </form>
      </CardContent>
    </Card>
  );
}
