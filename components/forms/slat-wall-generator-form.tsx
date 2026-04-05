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

type GeneratedResult = {
  id: string;
  title: string;
  outputType: string;
  text: string;
  imageUrl: string | null;
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

  // Track Position A and B renders separately
  const [positionA, setPositionA] = useState<GeneratedResult | null>(null);
  const [positionB, setPositionB] = useState<GeneratedResult | null>(null);
  const [otherOutput, setOtherOutput] = useState<GeneratedResult | null>(null);

  const handleGenerate = () => {
    setServerNotice(null);
    startTransition(async () => {
      try {
        const result = await generateSlatWallOutputAction({
          projectId,
          outputType,
          creativeDirection,
        });

        if (outputType === "IMAGE_RENDER_A") {
          setPositionA(result);
        } else if (outputType === "IMAGE_RENDER_B") {
          setPositionB(result);
        } else {
          setOtherOutput(result);
        }

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
    <div className="space-y-6">
      {/* Generator form */}
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
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

        {/* Other outputs (non Position A/B) */}
        {otherOutput ? (
          <Card>
            <CardHeader>
              <CardTitle>{otherOutput.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Link
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  href={`/outputs/${otherOutput.id}`}
                >
                  View output
                </Link>
                {otherOutput.imageUrl ? (
                  <a
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                    download={`${projectCode}-${otherOutput.outputType.toLowerCase()}.png`}
                    href={otherOutput.imageUrl}
                  >
                    Download image
                  </a>
                ) : null}
              </div>
              {otherOutput.imageUrl ? (
                <div className="overflow-hidden rounded-3xl border border-border/70 bg-secondary/20 p-3">
                  <img alt={otherOutput.title} className="w-full rounded-2xl object-cover" src={otherOutput.imageUrl} />
                </div>
              ) : null}
              <div className="rounded-3xl border border-border/70 bg-secondary/30 p-5">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {otherOutput.imageUrl ? "Underlying Prompt" : "Generated Text"}
                  </p>
                  <CopyButton text={otherOutput.text} />
                </div>
                <p className="max-h-[400px] overflow-y-auto whitespace-pre-line font-mono text-sm leading-7 text-foreground/90">
                  {otherOutput.text}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : !positionA && !positionB ? (
          <Card>
            <CardHeader>
              <CardTitle>Generated Output</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Select an output type and click Generate. Position A and B renders will display side by side below.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Position A and B renders side by side */}
      {positionA || positionB ? (
        <div className="grid gap-4 md:grid-cols-2">
          <PositionCard
            label="Position A"
            result={positionA}
            projectCode={projectCode}
          />
          <PositionCard
            label="Position B"
            result={positionB}
            projectCode={projectCode}
          />
        </div>
      ) : null}
    </div>
  );
}

function PositionCard({
  label,
  result,
  projectCode,
}: {
  label: string;
  result: GeneratedResult | null;
  projectCode: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {result ? (
          <>
            {result.imageUrl ? (
              <div className="overflow-hidden rounded-3xl border border-border/70 bg-secondary/20 p-3">
                <img
                  alt={result.title}
                  className="w-full rounded-2xl object-cover"
                  src={result.imageUrl}
                />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                href={`/outputs/${result.id}`}
              >
                View output
              </Link>
              {result.imageUrl ? (
                <a
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  download={`${projectCode}-${result.outputType.toLowerCase()}.png`}
                  href={result.imageUrl}
                >
                  Download image
                </a>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-3xl border-2 border-dashed border-border/50 bg-secondary/10">
            <p className="text-sm text-muted-foreground">Not generated yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
