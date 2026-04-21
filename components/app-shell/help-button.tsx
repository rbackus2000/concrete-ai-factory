"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HelpSheet } from "@/components/ui/help-sheet";
import { helpContent, type HelpGuide } from "@/lib/data/help-content";

function HelpContent({ guide }: { guide: HelpGuide }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">{guide.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{guide.summary}</p>
      </div>

      <div className="space-y-4">
        {guide.steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium">{step.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {guide.tips && guide.tips.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Pro Tips</p>
          <ul className="space-y-1.5">
            {guide.tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-primary">&bull;</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function HelpButton({ helpKey }: { helpKey: string }) {
  const [open, setOpen] = useState(false);
  const guide = helpContent[helpKey];

  if (!guide) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <HelpCircle className="size-4" />
        Help
      </Button>
      <HelpSheet open={open} onClose={() => setOpen(false)}>
        <HelpContent guide={guide} />
      </HelpSheet>
    </>
  );
}
