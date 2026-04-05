"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  createRulesMasterAction,
  updateRulesMasterAction,
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
  outputTypeValues,
  recordStatusValues,
  ruleCategoryValues,
  skuCategoryValues,
} from "@/lib/schemas/domain";
import {
  rulesMasterAdminSchema,
  type RulesMasterAdminValues,
} from "@/lib/schemas/admin";

type RulesMasterFormProps = {
  mode: "create" | "edit";
  recordId?: string;
  skuOptions: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  defaultValues: RulesMasterAdminValues;
};

export function RulesMasterForm({
  mode,
  recordId,
  skuOptions,
  defaultValues,
}: RulesMasterFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverNotice, setServerNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const form = useForm<RulesMasterAdminValues>({
    resolver: zodResolver(rulesMasterAdminSchema),
    defaultValues,
  });

  const onSubmit = (values: RulesMasterAdminValues) => {
    setServerNotice(null);

    startTransition(async () => {
      try {
        const result =
          mode === "create"
            ? await createRulesMasterAction(values)
            : await updateRulesMasterAction(recordId ?? "", values);

        setServerNotice({
          tone: "success",
          message: mode === "create" ? "Created rule record." : "Saved rule record.",
        });

        if (mode === "create") {
          router.push(`/admin/rules-master/${result.id}`);
        } else {
          router.refresh();
        }
      } catch (error) {
        setServerNotice({
          tone: "error",
          message: error instanceof Error ? error.message : "Unable to save rule record.",
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "New Rules Master Record" : "Edit Rules Master Record"}</CardTitle>
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
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...form.register("title")} />
              <FieldError message={form.formState.errors.title?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select id="category" {...form.register("category")}>
                {ruleCategoryValues.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="outputType">Output Type</Label>
              <Select id="outputType" {...form.register("outputType")}>
                <option value="">Any</option>
                {outputTypeValues.map((value) => (
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
            <div className="space-y-2">
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
              <Label htmlFor="priority">Priority</Label>
              <Input id="priority" type="number" {...form.register("priority")} />
              <FieldError message={form.formState.errors.priority?.message} />
            </div>
          </section>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...form.register("description")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ruleText">Rule Text</Label>
            <Textarea id="ruleText" rows={6} {...form.register("ruleText")} />
            <FieldError message={form.formState.errors.ruleText?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input id="source" {...form.register("source")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metadataJson">Metadata JSON</Label>
            <Textarea id="metadataJson" rows={6} {...form.register("metadataJson")} />
            <FieldError message={form.formState.errors.metadataJson?.message} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Archive a rule to remove it from active packet, generator, and validation resolution.
            </p>
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving..." : mode === "create" ? "Create Rule" : "Save Rule"}
            </Button>
          </div>

          <ActionNotice message={serverNotice?.message} tone={serverNotice?.tone} />
        </form>
      </CardContent>
    </Card>
  );
}
