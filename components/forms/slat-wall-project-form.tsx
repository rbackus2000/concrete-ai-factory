"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { createSlatWallAction, updateSlatWallAction } from "@/app/actions/slat-wall-actions";
import { ActionNotice } from "@/components/forms/action-notice";
import { FieldError } from "@/components/forms/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  slatWallProjectEditorSchema,
  slatWallProjectStatusValues,
  type SlatWallProjectEditorValues,
} from "@/lib/schemas/slat-wall";

type SlatWallProjectFormProps = {
  mode: "create" | "edit";
  projectId?: string;
  defaultValues?: Partial<SlatWallProjectEditorValues>;
};

export function SlatWallProjectForm({ mode, projectId, defaultValues }: SlatWallProjectFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverNotice, setServerNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const autoSlug = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const form = useForm<SlatWallProjectEditorValues>({
    resolver: zodResolver(slatWallProjectEditorSchema),
    defaultValues: {
      name: "",
      code: "",
      slug: "",
      status: "DRAFT",
      clientName: "",
      location: "",
      designer: "",
      engineer: "",
      revision: "A",
      description: "",
      positionAName: "Image A",
      positionBName: "Image B",
      positionADescription:
        "A unified full-wall composite image spanning the entire rotating vertical slat installation, rendered as a premium large-scale architectural artwork. The image should read clearly and continuously across the full width and height of the wall when all slats align in this viewing position. The subject of the image is: [INSERT SIDE A IMAGE SUBJECT HERE]. The composition should feel bold, clean, cohesive, and visually strong at architectural scale, with tonal continuity across all slats and no disconnected panel artwork.",
      positionBDescription:
        "A unified full-wall composite image spanning the entire rotating vertical slat installation, rendered as a premium large-scale architectural artwork. The image should read clearly and continuously across the full width and height of the wall when all slats align in this viewing position. The subject of the image is: [INSERT SIDE B IMAGE SUBJECT HERE]. The composition should feel bold, clean, cohesive, and visually strong at architectural scale, with tonal continuity across all slats and no disconnected panel artwork.",
      totalSlatCount: 32,
      slatWidth: 7,
      slatThickness: 0.45,
      slatHeight: 180,
      slatSpacing: 0.25,
      supportFrameType: "Engineered aluminum top/bottom track",
      pivotType: "Concealed vertical pin pivot",
      rotationAngleA: 0,
      rotationAngleB: 180,
      ...defaultValues,
    },
  });

  const onSubmit = (values: SlatWallProjectEditorValues) => {
    setServerNotice(null);
    startTransition(async () => {
      try {
        const result =
          mode === "create"
            ? await createSlatWallAction(values)
            : await updateSlatWallAction(projectId!, values);
        setServerNotice({ tone: "success", message: `Saved project ${result.code}.` });
        if (mode === "create") {
          router.push(`/slat-walls/${result.id}`);
        }
      } catch (error) {
        setServerNotice({
          tone: "error",
          message: error instanceof Error ? error.message : "Save failed.",
        });
      }
    });
  };

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input id="name" {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Project Code</Label>
              <Input
                id="code"
                placeholder="SW-001"
                {...form.register("code", {
                  onChange: (e) => {
                    if (mode === "create") {
                      form.setValue("slug", autoSlug(e.target.value), { shouldValidate: true });
                    }
                  },
                })}
              />
              <FieldError message={form.formState.errors.code?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="auto-generated from code" {...form.register("slug")} />
              <FieldError message={form.formState.errors.slug?.message} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client</Label>
              <Input id="clientName" {...form.register("clientName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...form.register("location")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designer">Designer</Label>
              <Input id="designer" {...form.register("designer")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" {...form.register("status")}>
                {slatWallProjectStatusValues.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...form.register("description")} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
        <CardHeader>
          <CardTitle>Position Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="positionAName">Position A Name</Label>
              <Input id="positionAName" placeholder="e.g. Cityscape" {...form.register("positionAName")} />
              <FieldError message={form.formState.errors.positionAName?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="positionBName">Position B Name</Label>
              <Input id="positionBName" placeholder="e.g. Forest" {...form.register("positionBName")} />
              <FieldError message={form.formState.errors.positionBName?.message} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="positionADescription">Position A Image Description</Label>
              <Textarea
                id="positionADescription"
                rows={4}
                placeholder="Describe the full-wall composite image for Position A. This feeds directly into the AI image generation prompt."
                {...form.register("positionADescription")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="positionBDescription">Position B Image Description</Label>
              <Textarea
                id="positionBDescription"
                rows={4}
                placeholder="Describe the full-wall composite image for Position B. This feeds directly into the AI image generation prompt."
                {...form.register("positionBDescription")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
        <CardHeader>
          <CardTitle>Wall Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="totalSlatCount">Total Slats</Label>
              <Input id="totalSlatCount" type="number" {...form.register("totalSlatCount")} />
              <FieldError message={form.formState.errors.totalSlatCount?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slatWidth">Slat Width (in)</Label>
              <Input id="slatWidth" type="number" step="0.01" {...form.register("slatWidth")} />
              <FieldError message={form.formState.errors.slatWidth?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slatThickness">Slat Thickness (in)</Label>
              <Input id="slatThickness" type="number" step="0.01" {...form.register("slatThickness")} />
              <FieldError message={form.formState.errors.slatThickness?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slatHeight">Slat Height (in)</Label>
              <Input id="slatHeight" type="number" step="0.1" {...form.register("slatHeight")} />
              <FieldError message={form.formState.errors.slatHeight?.message} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="slatSpacing">Slat Spacing (in)</Label>
              <Input id="slatSpacing" type="number" step="0.01" {...form.register("slatSpacing")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rotationAngleA">Position A Angle (°)</Label>
              <Input id="rotationAngleA" type="number" {...form.register("rotationAngleA")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rotationAngleB">Position B Angle (°)</Label>
              <Input id="rotationAngleB" type="number" {...form.register("rotationAngleB")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revision">Revision</Label>
              <Input id="revision" {...form.register("revision")} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supportFrameType">Support Frame Type</Label>
              <Input id="supportFrameType" {...form.register("supportFrameType")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pivotType">Pivot Type</Label>
              <Input id="pivotType" {...form.register("pivotType")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Saving..." : mode === "create" ? "Create Project" : "Save Changes"}
      </Button>
      <ActionNotice message={serverNotice?.message} tone={serverNotice?.tone} />
    </form>
  );
}
