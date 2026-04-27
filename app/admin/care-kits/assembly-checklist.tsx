"use client";

import { useState } from "react";

export function AssemblyChecklist({ sheetId, steps }: { sheetId: string; steps: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const reset = () => setChecked(new Set());

  const allDone = checked.size === steps.length && steps.length > 0;

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <label
          key={`${sheetId}-step-${i}`}
          className="flex cursor-pointer items-start gap-3 rounded border border-border/50 p-3 text-sm transition hover:border-border"
        >
          <input
            type="checkbox"
            checked={checked.has(i)}
            onChange={() => toggle(i)}
            className="mt-0.5 h-4 w-4 cursor-pointer"
          />
          <span className={checked.has(i) ? "text-muted-foreground line-through" : ""}>{step}</span>
        </label>
      ))}
      <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
        <span>
          {checked.size}/{steps.length} steps
        </span>
        {allDone ? (
          <span className="font-semibold text-emerald-600">Kit complete ✓</span>
        ) : (
          <button type="button" onClick={reset} className="hover:text-foreground hover:underline">
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
