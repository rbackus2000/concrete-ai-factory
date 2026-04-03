"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { ActionNotice } from "@/components/forms/action-notice";
import { Button, buttonVariants } from "@/components/ui/button";

type OutputExportActionsProps = {
  outputId: string;
  canPrint: boolean;
};

async function downloadFile(url: string, fallbackName: string) {
  const response = await fetch(url);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Export failed.");
  }

  const blob = await response.blob();
  const href = window.URL.createObjectURL(blob);
  const disposition = response.headers.get("Content-Disposition");
  const filenameMatch = disposition?.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] ?? fallbackName;
  const anchor = document.createElement("a");

  anchor.href = href;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(href);
}

export function OutputExportActions({ outputId, canPrint }: OutputExportActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const runExport = (url: string, fallbackName: string, successMessage: string) => {
    setNotice(null);

    startTransition(async () => {
      try {
        await downloadFile(url, fallbackName);
        setNotice({
          tone: "success",
          message: successMessage,
        });
      } catch (error) {
        setNotice({
          tone: "error",
          message: error instanceof Error ? error.message : "Export failed.",
        });
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={isPending}
          onClick={() =>
            runExport(`/outputs/${outputId}/markdown`, `generated-output-${outputId}.md`, "Markdown export downloaded.")
          }
          type="button"
          variant="outline"
        >
          {isPending ? "Working..." : "Export markdown"}
        </Button>
        {canPrint ? (
          <>
            <Link className={buttonVariants({ variant: "outline" })} href={`/outputs/${outputId}/print`}>
              Open print view
            </Link>
            <Button
              disabled={isPending}
              onClick={() =>
                runExport(`/outputs/${outputId}/pdf`, `generated-output-${outputId}.pdf`, "PDF export downloaded.")
              }
              type="button"
              variant="outline"
            >
              {isPending ? "Working..." : "Export PDF"}
            </Button>
          </>
        ) : null}
      </div>
      <ActionNotice message={notice?.message} tone={notice?.tone} />
    </div>
  );
}
