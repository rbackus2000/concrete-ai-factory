"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { publishCatalogAction } from "./actions";

export function PublishCatalogButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = () => {
    if (!confirm("Publish a new catalog version? This will compose the latest product data, render a fresh PDF, upload to MinIO, and replace the live catalog on backusdesignco.com/catalog.")) {
      return;
    }
    setMessage("Composing and rendering — this takes 20–60 seconds...");
    startTransition(async () => {
      try {
        const result = await publishCatalogAction();
        setMessage(`Published v${result.version} ✓`);
      } catch (err) {
        setMessage(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleClick} disabled={isPending}>
        {isPending ? "Publishing..." : "Publish new version"}
      </Button>
      {message && (
        <span className="text-xs text-muted-foreground" suppressHydrationWarning>
          {message}
        </span>
      )}
    </div>
  );
}
