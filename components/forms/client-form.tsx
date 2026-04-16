"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clientAdminSchema, type ClientAdminValues } from "@/lib/schemas/client";
import { createClientAction, updateClientAction } from "@/app/actions/admin-actions";

type ClientFormProps = {
  mode: "create" | "edit";
  clientId?: string;
  defaultValues: ClientAdminValues;
};

export default function ClientForm({ mode, clientId, defaultValues }: ClientFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<ClientAdminValues>({ resolver: zodResolver(clientAdminSchema), defaultValues });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      if (mode === "create") {
        await createClientAction(values);
      } else {
        await updateClientAction(clientId!, values);
      }
      router.push("/admin/clients" as never);
    });
  });

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input {...form.register("name")} />
          {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Company</Label>
          <Input {...form.register("company")} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" {...form.register("email")} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input {...form.register("phone")} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Textarea rows={2} {...form.register("address")} />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea rows={3} {...form.register("notes")} />
      </div>
      <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : mode === "create" ? "Create Client" : "Save Changes"}</Button>
    </form>
  );
}
