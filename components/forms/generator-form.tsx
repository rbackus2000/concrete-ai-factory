"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import Link from "next/link";

import { generateOutputAction } from "@/app/actions/generator-actions";
import { ActionNotice } from "@/components/forms/action-notice";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { OutputType } from "@/lib/schemas/domain";
import {
  colorOptions,
  finishOptions,
  sealerOptions,
  generatorFormSchema,
  getImageScenePresetsForCategory,
  imageScenePresetLabelMap,
  type GeneratorFormValues,
} from "@/lib/schemas/generator";

type GeneratorFormProps = {
  skus: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
  }>;
  outputTypes: readonly OutputType[];
  referenceImages: Record<string, string>;
  recentOutputs: Array<{
    id: string;
    skuCode: string;
    title: string;
    outputType: OutputType;
    status: string;
    createdAt: string;
    promptTemplateKey: string | null;
    buildPacketSectionKey: string | null;
    text: string;
    promptText: string;
    imageUrl: string | null;
  }>;
};

export function GeneratorForm({ skus, outputTypes, referenceImages, recentOutputs }: GeneratorFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverNotice, setServerNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [generated, setGenerated] = useState<GeneratorFormProps["recentOutputs"][number] | null>(
    recentOutputs[0] ?? null,
  );
  const [history, setHistory] = useState(recentOutputs);

  const defaultSkuCode = skus[0]?.code ?? "";

  const form = useForm<GeneratorFormValues>({
    resolver: zodResolver(generatorFormSchema),
    defaultValues: {
      skuCode: defaultSkuCode,
      outputType: "IMAGE_PROMPT",
      scenePreset: "lifestyle",
      requestedOutput: "Generate the first internal draft.",
      creativeDirection: "Keep the output production-aware and grounded in manufacturable geometry.",
    },
  });

  const selectedOutputType = form.watch("outputType");
  const selectedSkuCode = form.watch("skuCode");
  const selectedScenePreset = form.watch("scenePreset");
  const selectedSku = useMemo(
    () => skus.find((sku) => sku.code === selectedSkuCode) ?? skus[0] ?? null,
    [selectedSkuCode, skus],
  );
  const scenePresetOptions = useMemo(
    () => getImageScenePresetsForCategory(selectedSku?.category),
    [selectedSku?.category],
  );

  useEffect(() => {
    if (selectedOutputType !== "IMAGE_RENDER") {
      return;
    }

    if (scenePresetOptions.length === 0) {
      form.setValue("scenePreset", undefined, { shouldValidate: true });
      return;
    }

    if (!selectedScenePreset || !scenePresetOptions.includes(selectedScenePreset)) {
      form.setValue("scenePreset", scenePresetOptions[0], { shouldValidate: true });
    }
  }, [form, scenePresetOptions, selectedOutputType, selectedScenePreset]);

  const helperText = useMemo(() => {
    if (selectedOutputType === "IMAGE_RENDER") {
      if (!selectedSku) {
        return "Select a SKU to resolve the scene-specific IMAGE_RENDER template.";
      }

      if (scenePresetOptions.length === 0) {
        return `No IMAGE_RENDER scene presets are configured for ${selectedSku.category} yet.`;
      }

      return "Image render output will resolve the category-and-scene template from Prisma, inject SKU geometry variables plus negative rules, call the image provider, and save the finished image with the underlying prompt text.";
    }

    if (selectedOutputType === "BUILD_PACKET") {
      return "Build packet output will compile packet sections plus derived QC and rule content.";
    }

    if (selectedOutputType === "CALCULATION") {
      return "Calculation output will snapshot the SKU's current calculator defaults and material baselines.";
    }

    return "Prompt output will resolve the active scoped template and manufacturing rules from Prisma.";
  }, [scenePresetOptions.length, selectedOutputType, selectedSku]);

  const onSubmit = (values: GeneratorFormValues) => {
    setServerNotice(null);

    startTransition(async () => {
      try {
        const result = await generateOutputAction(values);
        setGenerated(result);
        setHistory((current) => [result, ...current.filter((entry) => entry.id !== result.id)].slice(0, 10));
        setServerNotice({
          tone: "success",
          message: `Saved: ${result.title}`,
        });
      } catch (error) {
        setServerNotice({
          tone: "error",
          message: error instanceof Error ? error.message : "Generation failed.",
        });
      }
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Generate Output</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="skuCode">SKU</Label>
              <Select id="skuCode" {...form.register("skuCode")}>
                {skus.map((sku) => (
                  <option key={sku.id} value={sku.code}>
                    {sku.code} · {sku.name}
                  </option>
                ))}
              </Select>
            </div>

            {referenceImages[selectedSkuCode] ? (
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-3">
                <img
                  alt="Reference"
                  className="h-14 w-14 rounded-lg object-cover"
                  src={referenceImages[selectedSkuCode]}
                />
                <div>
                  <p className="text-xs font-medium text-green-800">Reference image locked</p>
                  <p className="text-xs text-green-600">All generated images will match this render.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-800">No reference image yet</p>
                <p className="text-xs text-amber-600">Generate an IMAGE RENDER first to lock the product appearance.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="outputType">Output Type</Label>
              <Select id="outputType" {...form.register("outputType")}>
                {outputTypes.map((outputType) => (
                  <option key={outputType} value={outputType}>
                    {outputType}
                  </option>
                ))}
              </Select>
            </div>

            {selectedOutputType === "IMAGE_RENDER" ? (
              <div className="space-y-2">
                <Label htmlFor="scenePreset">Scene Preset</Label>
                <Select
                  id="scenePreset"
                  disabled={scenePresetOptions.length === 0}
                  {...form.register("scenePreset")}
                >
                  {scenePresetOptions.length > 0 ? (
                    scenePresetOptions.map((scenePreset) => (
                      <option key={scenePreset} value={scenePreset}>
                        {imageScenePresetLabelMap[scenePreset]}
                      </option>
                    ))
                  ) : (
                    <option value="">No scene presets available</option>
                  )}
                </Select>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="colorOverride">Color</Label>
                <Select id="colorOverride" {...form.register("colorOverride")}>
                  {colorOptions.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="finishOverride">Finish</Label>
                <Select id="finishOverride" {...form.register("finishOverride")}>
                  {finishOptions.map((finish) => (
                    <option key={finish} value={finish}>
                      {finish}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sealerOverride">Sealer</Label>
                <Select id="sealerOverride" {...form.register("sealerOverride")}>
                  {sealerOptions.map((sealer) => (
                    <option key={sealer} value={sealer}>
                      {sealer}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestedOutput">Requested Output</Label>
              <Input id="requestedOutput" {...form.register("requestedOutput")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creativeDirection">Creative Direction</Label>
              <Textarea
                id="creativeDirection"
                rows={6}
                {...form.register("creativeDirection")}
              />
            </div>

            <p className="text-sm text-muted-foreground">{helperText}</p>

            <Button
              className="w-full"
              disabled={
                isPending ||
                skus.length === 0 ||
                (selectedOutputType === "IMAGE_RENDER" && scenePresetOptions.length === 0)
              }
              type="submit"
            >
              {isPending ? "Generating..." : "Generate And Save"}
            </Button>

            <ActionNotice message={serverNotice?.message} tone={serverNotice?.tone} />
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Generated Payload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {generated ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Output</p>
                    <p className="text-lg font-bold">{generated.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">SKU</p>
                    <p className="font-medium">{generated.skuCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Output Type</p>
                    <p className="font-medium">{generated.outputType.replaceAll("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Template</p>
                    <p className="font-medium">
                      {generated.promptTemplateKey ?? generated.buildPacketSectionKey ?? "Runtime-only"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium">{generated.status}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                    href={`/outputs/${generated.id}`}
                  >
                    View output
                  </Link>
                  {generated.outputType === "BUILD_PACKET" ? (
                    <Button
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = `/outputs/${generated.id}/pdf`;
                        a.download = `${generated.skuCode}-build-packet.pdf`;
                        a.click();
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Download PDF
                    </Button>
                  ) : null}
                  {generated.imageUrl ? (
                    <a
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                      download={`${generated.skuCode}-${generated.outputType.toLowerCase()}.png`}
                      href={generated.imageUrl}
                    >
                      Download image
                    </a>
                  ) : null}
                </div>
                {generated.imageUrl ? (
                  <div className="overflow-hidden rounded-3xl border border-border/70 bg-secondary/20 p-3">
                    <img
                      alt={`${generated.skuCode} rendered output`}
                      className="w-full rounded-2xl object-cover"
                      src={generated.imageUrl}
                    />
                  </div>
                ) : null}
                <div className="rounded-3xl border border-border/70 bg-secondary/30 p-5">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {generated.imageUrl ? "Underlying Prompt Text" : "Generated Text"}
                    </p>
                    <CopyButton text={generated.promptText || generated.text} />
                  </div>
                  <p className="whitespace-pre-line font-mono text-sm leading-7 text-foreground/90">
                    {generated.promptText || generated.text}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Generate an output to save a real `GeneratedOutput` row and inspect the text payload here.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Generated Outputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.length > 0 ? (
              history.map((item) => (
                <button
                  key={item.id}
                  className="block w-full rounded-2xl border border-border/70 p-4 text-left"
                  onClick={() => setGenerated(item)}
                  type="button"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.skuCode} · {item.outputType} · {new Date(item.createdAt).toLocaleString()}
                  </p>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No generated history yet. Run the first packet, prompt, or calculation output to create one.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
