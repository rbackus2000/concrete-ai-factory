"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { generateSlatWallOutputAction } from "@/app/actions/slat-wall-generate-actions";
import { ActionNotice } from "@/components/forms/action-notice";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  slatWallOutputTypes,
  type SlatWallOutputType,
} from "@/lib/engines/slat-wall-prompt-engine";

type SlatWallGeneratorFormProps = {
  projectId: string;
  projectCode: string;
};

export function SlatWallGeneratorForm({ projectId, projectCode }: SlatWallGeneratorFormProps) {
  const [isPending, startTransition] = useTransition();
  const [outputType, setOutputType] = useState<SlatWallOutputType>("IMAGE_RENDER_A");
  const [creativeDirection, setCreativeDirection] = useState(
    "Keep the output premium, museum-quality, and architecturally refined.",
  );
  const [serverNotice, setServerNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [generated, setGenerated] = useState<{
    id: string;
    title: string;
    outputType: string;
    text: string;
    imageUrl: string | null;
  } | null>(null);

  const handleGenerate = () => {
    setServerNotice(null);
    startTransition(async () => {
      try {
        const result = await generateSlatWallOutputAction({
          projectId,
          outputType,
          creativeDirection,
        });
        setGenerated(result);
        setServerNotice({
          tone: "success",
          message: `Generated ${result.title}`,
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
      <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
        <CardHeader>
          <CardTitle>Generate Output</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="sw-outputType">Output Type</Label>
            <Select
              id="sw-outputType"
              value={outputType}
              onChange={(e) => setOutputType(e.target.value as SlatWallOutputType)}
            >
              {slatWallOutputTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sw-creativeDirection">Creative Direction</Label>
            <Textarea
              id="sw-creativeDirection"
              rows={4}
              value={creativeDirection}
              onChange={(e) => setCreativeDirection(e.target.value)}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {outputType.startsWith("IMAGE_RENDER")
              ? "Image render will call Gemini to generate a visualization using the project config and image descriptions."
              : outputType === "DETAIL_SHEET"
                ? "Detail sheet will generate a single-page production spec image with wall dimensions, slat construction, and position logic."
                : outputType === "CONCEPT"
                  ? "Concept visualization will show Position A and B side by side with technical callouts."
                  : "Build packet will generate the full text production spec for this slat wall project."}
          </p>

          <Button
            className="w-full"
            disabled={isPending}
            onClick={handleGenerate}
            type="button"
          >
            {isPending ? "Generating..." : "Generate"}
          </Button>

          <ActionNotice message={serverNotice?.message} tone={serverNotice?.tone} />
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
        <CardHeader>
          <CardTitle>Generated Output</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {generated ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Output</p>
                  <p className="font-medium">{generated.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{generated.outputType}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  href={`/outputs/${generated.id}`}
                >
                  View output
                </Link>
                {generated.imageUrl ? (
                  <a
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                    download={`${projectCode}-${generated.outputType.toLowerCase()}.png`}
                    href={generated.imageUrl}
                  >
                    Download image
                  </a>
                ) : null}
              </div>

              {generated.imageUrl ? (
                <div className="overflow-hidden rounded-3xl border border-border/70 bg-secondary/20 p-3">
                  <img
                    alt={generated.title}
                    className="w-full rounded-2xl object-cover"
                    src={generated.imageUrl}
                  />
                </div>
              ) : null}

              <div className="rounded-3xl border border-border/70 bg-secondary/30 p-5">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {generated.imageUrl ? "Underlying Prompt" : "Generated Text"}
                  </p>
                  <CopyButton text={generated.text} />
                </div>
                <p className="whitespace-pre-line font-mono text-sm leading-7 text-foreground/90">
                  {generated.text}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select an output type and click Generate to create a visualization, detail sheet, or build packet for this slat wall project.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
