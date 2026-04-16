"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SectionPlan } from "@/lib/engines/mold-print-engine";

type Props = {
  plan: SectionPlan;
};

export function SectionPlanPanel({ plan }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Section Plan</CardTitle>
        <Badge variant={plan.fitsInOnePrint ? "default" : "secondary"}>
          {plan.fitsInOnePrint ? "Single Print" : `${plan.totalSections} Sections`}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Mold Dimensions</span>
          <span className="font-medium">
            {plan.moldDimensionsMm.length} x {plan.moldDimensionsMm.width} x {plan.moldDimensionsMm.height} mm
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Build Volume</span>
          <span className="font-medium">400 x 400 x 400 mm</span>
        </div>

        {plan.sections.map((section) => (
          <div
            key={section.sectionNumber}
            className="rounded-lg border border-border/70 bg-secondary/40 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Section {section.sectionNumber}</span>
              <span className="text-xs text-muted-foreground">
                ~{Math.round(section.printTimeMins / 60 * 10) / 10}h print
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {section.lengthMm} x {section.widthMm} x {section.heightMm} mm — {section.orientation}
            </div>
          </div>
        ))}

        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          {plan.bondingNotes}
        </p>
      </CardContent>
    </Card>
  );
}
