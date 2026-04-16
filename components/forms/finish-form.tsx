"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { finishAdminSchema, type FinishAdminValues } from "@/lib/schemas/finish";
import { createFinishAction, updateFinishAction } from "@/app/actions/admin-actions";

type FinishFormProps = {
  mode: "create" | "edit";
  finishId?: string;
  defaultValues: FinishAdminValues;
};

export default function FinishForm({ mode, finishId, defaultValues }: FinishFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<FinishAdminValues>({ resolver: zodResolver(finishAdminSchema), defaultValues });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      if (mode === "create") {
        await createFinishAction(values);
      } else {
        await updateFinishAction(finishId!, values);
      }
      router.push("/admin/finishes" as never);
    });
  });

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Code</Label>
          <Input {...form.register("code")} disabled={mode === "edit"} />
          {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Name</Label>
          <Input {...form.register("name")} />
        </div>
        <div className="space-y-2">
          <Label>Color Family</Label>
          <Input {...form.register("colorFamily")} placeholder="e.g., Warm Neutrals" />
        </div>
        <div className="space-y-2">
          <Label>Texture Type</Label>
          <Input {...form.register("textureType")} placeholder="e.g., Woodform, Classic, Foundry" />
        </div>
        <div className="space-y-2">
          <Label>Sealer Type</Label>
          <Input {...form.register("sealerType")} placeholder="e.g., Matte, Satin, Gloss" />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select {...form.register("status")}>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Pigment Formula</Label>
        <Textarea rows={3} {...form.register("pigmentFormula")} placeholder="Pigment loading, color code, supplier part number..." />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea rows={3} {...form.register("notes")} />
      </div>
      <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : mode === "create" ? "Create Finish" : "Save Changes"}</Button>
    </form>
  );
}
