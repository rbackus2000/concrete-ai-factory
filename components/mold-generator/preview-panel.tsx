"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateMoldPreviewAction } from "@/app/actions/mold-preview-actions";

type Props = {
  skuId: string;
  skuCode: string;
  productName: string;
};

export function PreviewPanel({ skuId, skuCode, productName }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateMoldPreviewAction({ skuCode, skuId, productName });
      if (result.success && result.imageUrl) {
        setImageUrl(result.imageUrl);
      } else {
        setError(result.error ?? "Preview generation failed. Try again.");
      }
    } catch {
      setError("Connection error. Check your API key.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleDownload() {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `${skuCode}-preview.png`;
    a.click();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Product Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!imageUrl && (
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Generating Preview..." : "Generate AI Preview"}
          </Button>
        )}

        {isLoading && (
          <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-muted">
            <div className="text-center">
              <div className="mb-2 animate-pulse text-primary text-lg">●</div>
              <p className="text-xs text-muted-foreground">Rendering product preview via Gemini...</p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {imageUrl && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-border">
              <img
                src={imageUrl}
                alt={`${productName} AI preview`}
                className="w-full"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={handleDownload} className="flex-1">
                Download Image
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isLoading}
                className="flex-1"
              >
                Regenerate
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Preview shows finished GFRC product — mold print will be PLA plastic.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
