"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MoldGeneratorSku } from "@/lib/services/mold-generator-service";

type Props = {
  sku: MoldGeneratorSku;
};

export function DimensionPanel({ sku }: Props) {
  const isTile = sku.category === "WALL_TILE";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dimensions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <DimRow label={isTile ? "Tile Width" : "Outer Length"} value={`${sku.outerLength}"`} />
          <DimRow label={isTile ? "Tile Height" : "Outer Width"} value={`${sku.outerWidth}"`} />
          <DimRow label={isTile ? "Thickness" : "Outer Height"} value={`${sku.outerHeight}"`} />
          {!isTile && sku.innerLength > 0 && (
            <>
              <DimRow label="Inner Length" value={`${sku.innerLength}"`} />
              <DimRow label="Inner Width" value={`${sku.innerWidth}"`} />
              <DimRow label="Inner Depth" value={`${sku.innerDepth}"`} />
            </>
          )}
        </div>

        {!isTile && (
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
            <DimRow label="Wall Thickness" value={`${sku.wallThickness}"`} />
            <DimRow label="Bottom Thickness" value={`${sku.bottomThickness}"`} />
            {sku.drainDiameter > 0 && (
              <DimRow
                label="Drain"
                value={`${sku.drainDiameter}" ${sku.drainType || "Round"}`}
              />
            )}
            {sku.longRibCount > 0 && <DimRow label="Ridges/Ribs" value={`${sku.longRibCount}`} />}
            {sku.crossRibCount > 0 && <DimRow label="Channels/Cross Ribs" value={`${sku.crossRibCount}`} />}
            {sku.hasOverflow && (
              <DimRow label="Overflow" value={`${sku.overflowHoleDiameter}" dia`} />
            )}
          </div>
        )}

        {isTile && (sku.longRibCount > 0 || sku.crossRibCount > 0) && (
          <div className="border-t border-border pt-3">
            {sku.longRibCount > 0 && (
              <DimRow label="Horizontal Ridges" value={`${sku.longRibCount} @ ${sku.ribHeight}" deep`} />
            )}
            {sku.crossRibCount > 0 && (
              <DimRow label="Vertical Channels" value={`${sku.crossRibCount} @ ${sku.ribHeight}" deep`} />
            )}
          </div>
        )}

        <div className="border-t border-border pt-3">
          <DimRow label="Target Weight" value={`${sku.targetWeight.min}–${sku.targetWeight.max} lbs`} />
          <DimRow label="Finish" value={sku.finish} />
        </div>
      </CardContent>
    </Card>
  );
}

function DimRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
