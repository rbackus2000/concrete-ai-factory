"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SlicingSpec } from "@/lib/engines/mold-print-engine";

type Props = {
  spec: SlicingSpec;
};

export function SlicingSpecPanel({ spec }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Slicing Spec — Creality Print 5.1</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <SpecRow label="Layer Height" value={`${spec.layerHeightMm} mm`} />
          <SpecRow label="Wall Count" value={`${spec.wallCount}`} />
          <SpecRow label="Infill" value={`${spec.infillPercent}%`} />
          <SpecRow label="Supports" value={spec.supportsEnabled ? spec.supportType : "None"} />
          <SpecRow label="Orientation" value={spec.orientation} />
          <SpecRow label="Adhesion" value={spec.adhesionType} />
          <SpecRow label="Nozzle" value={`${spec.nozzleDiameterMm} mm`} />
          <SpecRow label="Print Temp" value={`${spec.printTempC}°C`} />
          <SpecRow label="Bed Temp" value={`${spec.bedTempC}°C`} />
          <SpecRow label="Speed" value={`${spec.printSpeedMmS} mm/s`} />
        </div>

        <div className="border-t border-border pt-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated Print Time</span>
            <span className="text-lg font-bold">{spec.estimatedPrintTimeHours}h</span>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Post-Print Notes
          </p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {spec.postPrintNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
