"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";

type CopyButtonProps = Omit<ButtonProps, "onClick"> & {
  text: string;
};

export function CopyButton({ text, className, ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      className={cn("gap-2", className)}
      onClick={handleCopy}
      size="sm"
      variant="outline"
      {...props}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Copy prompt
        </>
      )}
    </Button>
  );
}
