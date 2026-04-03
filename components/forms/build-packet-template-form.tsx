"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  createBuildPacketTemplateAction,
  updateBuildPacketTemplateAction,
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
  skuCategoryValues,
} from "@/lib/schemas/domain";
import {
  buildPacketTemplateAdminSchema,
  type BuildPacketTemplateAdminValues,
} from "@/lib/schemas/admin";

type BuildPacketTemplateFormProps = {
  mode: "create" | "edit";
  recordId?: string;
  skuOptions: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  defaultValues: BuildPacketTemplateAdminValues;
};

export function BuildPacketTemplateForm({
  mode,
  recordId,
  skuOptions,
  defaultValues,
}: BuildPacketTemplateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverNotice, setServerNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const form = useForm<BuildPacketTemplateAdminValues>({
    resolver: zodResolver(buildPacketTemplateAdminSchema),
    defaultValues,
  });

  const onSubmit = (values: BuildPacketTemplateAdminValues) => {
    setServerNotice(null);

    startTransition(async () => {
      try {
        const result =
          mode === "create"
            ? await createBuildPacketTemplateAction(values)
            : await updateBuildPacketTemplateAction(recordId ?? "", values);

        setServerNotice({
          tone: "success",
          message: mode === "create" ? "Created packet section." : "Saved packet section.",
        });

        if (mode === "create") {
          router.push(`/admin/build-packet-templates/${result.id}`);
        } else {
          router.refresh();
        }
      } catch (error) {
        setServerNotice({
          tone: "error",
          message: error instanceof Error ? error.message : "Unable to save packet section.",
        });
      }
    });
  };

  return (
    <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
      <CardHeader>
        <CardTitle>{mode === "create" ? "New Build Packet Section" : "Edit Build Packet Section"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="packetKey">Packet Key</Label>
              <Input id="packetKey" {...form.register("packetKey")} />
              <FieldError message={form.formState.errors.packetKey?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sectionKey">Section Key</Label>
              <Input id="sectionKey" {...form.register("sectionKey")} />
              <FieldError message={form.formState.errors.sectionKey?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sectionOrder">Section Order</Label>
              <Input id="sectionOrder" type="number" {...form.register("sectionOrder")} />
              <FieldError message={form.formState.errors.sectionOrder?.message} />
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
              <Label htmlFor="outputType">Output Type</Label>
              <Select id="outputType" {...form.register("outputType")}>
                {outputTypeValues.map((value) => (
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
            <Label htmlFor="content">Section Content</Label>
            <Textarea id="content" rows={10} {...form.register("content")} />
            <FieldError message={form.formState.errors.content?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="variablesText">Variables JSON</Label>
            <Textarea id="variablesText" rows={6} {...form.register("variablesText")} />
            <FieldError message={form.formState.errors.variablesText?.message} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Section keys stay stable so later export layers can map packet output consistently.
            </p>
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving..." : mode === "create" ? "Create Section" : "Save Section"}
            </Button>
          </div>

          <ActionNotice message={serverNotice?.message} tone={serverNotice?.tone} />
        </form>
      </CardContent>
    </Card>
  );
}
