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
import { jobCreateSchema, type JobCreateValues } from "@/lib/schemas/job";
import { createJobAction } from "@/app/actions/job-actions";

type JobFormProps = {
  skuOptions: { code: string; name: string }[];
  clientOptions: { id: string; name: string; company: string | null }[];
};

export default function JobForm({ skuOptions, clientOptions }: JobFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<JobCreateValues>({
    resolver: zodResolver(jobCreateSchema),
    defaultValues: { skuCode: "", clientId: "", quantity: 1, dueDate: "", notes: "", retailPriceTotal: 0, wholesalePriceTotal: 0 },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createJobAction(values);
      if (result.success) router.push("/jobs" as never);
    });
  });

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>SKU</Label>
          <Select {...form.register("skuCode")}>
            <option value="">Select SKU...</option>
            {skuOptions.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
          </Select>
          {form.formState.errors.skuCode && <p className="text-xs text-destructive">{form.formState.errors.skuCode.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Client (optional)</Label>
          <Select {...form.register("clientId")}>
            <option value="">No client</option>
            {clientOptions.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>)}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Quantity</Label>
          <Input type="number" step="1" min="1" {...form.register("quantity")} />
        </div>

        <div className="space-y-2">
          <Label>Due Date (optional)</Label>
          <Input type="date" {...form.register("dueDate")} />
        </div>

        <div className="space-y-2">
          <Label>Retail Price Total ($)</Label>
          <Input type="number" step="0.01" min="0" {...form.register("retailPriceTotal")} />
        </div>

        <div className="space-y-2">
          <Label>Wholesale Price Total ($)</Label>
          <Input type="number" step="0.01" min="0" {...form.register("wholesalePriceTotal")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea rows={3} {...form.register("notes")} placeholder="Production notes, special instructions..." />
      </div>

      <Button type="submit" disabled={isPending}>{isPending ? "Creating..." : "Create Job"}</Button>
    </form>
  );
}
