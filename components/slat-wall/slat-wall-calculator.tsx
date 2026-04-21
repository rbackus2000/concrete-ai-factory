"use client";

import { useState, useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  calculateSlatWallCost,
  DEFAULT_UNIT_COSTS,
  WALL_PRESETS,
  type SlatWallUnitCosts,
  type WallPresetKey,
} from "@/lib/engines/slat-wall-calculator-engine";

const COST_FIELDS: Array<{ key: keyof SlatWallUnitCosts; label: string; group: string }> = [
  { key: "gfrcSlabPerSlat", label: "GFRC slab / slat", group: "Materials (per slat)" },
  { key: "steelInsertPerSlat", label: "Steel inserts / slat", group: "Materials (per slat)" },
  { key: "uBracketPerSlat", label: "U-brackets / slat", group: "Materials (per slat)" },
  { key: "pivotShaftPerSlat", label: "Pivot shafts / slat", group: "Materials (per slat)" },
  { key: "topBearingPerSlat", label: "Top bearing / slat", group: "Materials (per slat)" },
  { key: "bottomBearingPerSlat", label: "Bottom bearing / slat", group: "Materials (per slat)" },
  { key: "motorPerSlat", label: "Motor / slat", group: "Materials (per slat)" },
  { key: "reductionDrivePerSlat", label: "Reduction drive / slat", group: "Materials (per slat)" },
  { key: "wiringPerSlat", label: "Wiring / slat", group: "Materials (per slat)" },
  { key: "sensorPerSlat", label: "Sensor / slat", group: "Materials (per slat)" },
  { key: "controlSystemPerWall", label: "Control system / wall", group: "Materials (per wall)" },
  { key: "mountingFramePerLinFt", label: "Mounting frame / lin ft", group: "Materials (per wall)" },
  { key: "powerSupplyPerWall", label: "Power supply / wall", group: "Materials (per wall)" },
  { key: "enclosurePerWall", label: "Enclosure / wall", group: "Materials (per wall)" },
  { key: "uvPrintPerSqFt", label: "UV print / sq ft", group: "Print" },
  { key: "stencilCutPerSlat", label: "Stencil cut / slat", group: "Print" },
  { key: "stencilInkPerSlat", label: "Stencil ink / slat", group: "Print" },
  { key: "artworkSetupPerWall", label: "Artwork setup / wall", group: "Print" },
  { key: "fabricationRatePerHour", label: "Fabrication rate / hr", group: "Labor Rates" },
  { key: "printRatePerHour", label: "Print rate / hr", group: "Labor Rates" },
  { key: "installRatePerHour", label: "Install rate / hr", group: "Labor Rates" },
  { key: "engineeringRatePerHour", label: "Engineering rate / hr", group: "Labor Rates" },
  { key: "fabricationHoursPerSlat", label: "Fabrication hrs / slat", group: "Labor Hours" },
  { key: "printHoursPerSlat", label: "Print hrs / slat face", group: "Labor Hours" },
  { key: "installHoursPerSlat", label: "Install hrs / slat", group: "Labor Hours" },
  { key: "engineeringHoursPerWall", label: "Engineering hrs / wall", group: "Labor Hours" },
  { key: "commissioningHoursPerWall", label: "Commissioning hrs", group: "Labor Hours" },
  { key: "shippingPercent", label: "Shipping %", group: "Overhead" },
  { key: "contingencyPercent", label: "Contingency %", group: "Overhead" },
  { key: "projectMgmtPercent", label: "Project mgmt %", group: "Overhead" },
  { key: "studioMarkupPercent", label: "Studio margin %", group: "Margin" },
];

type Props = {
  defaultSlatCount?: number;
  defaultSlatWidthIn?: number;
  defaultSlatHeightFt?: number;
};

export function SlatWallCalculator({ defaultSlatCount, defaultSlatWidthIn, defaultSlatHeightFt }: Props) {
  const [preset, setPreset] = useState<WallPresetKey | "custom">(() => {
    if (!defaultSlatCount) return "standard";
    for (const [key, p] of Object.entries(WALL_PRESETS) as [WallPresetKey, (typeof WALL_PRESETS)[WallPresetKey]][]) {
      if (p.slatCount === defaultSlatCount) return key;
    }
    return "custom";
  });
  const [customSlats, setCustomSlats] = useState(defaultSlatCount ?? 32);
  const [customWidthIn, setCustomWidthIn] = useState(defaultSlatWidthIn ?? 9);
  const [customHeightFt, setCustomHeightFt] = useState(defaultSlatHeightFt ?? 10);
  const [printMethod, setPrintMethod] = useState<"uv" | "stencil">("uv");
  const [includeInstall, setIncludeInstall] = useState(true);
  const [costOverrides, setCostOverrides] = useState<Partial<SlatWallUnitCosts>>({});
  const [showCostEditor, setShowCostEditor] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const slatCount = preset === "custom" ? customSlats : WALL_PRESETS[preset].slatCount;
  const slatWidthIn = preset === "custom" ? customWidthIn : WALL_PRESETS[preset].slatWidthIn;
  const slatHeightFt = preset === "custom" ? customHeightFt : WALL_PRESETS[preset].slatHeightFt;

  const result = useMemo(
    () =>
      calculateSlatWallCost({
        slatCount,
        slatWidthIn,
        slatHeightFt,
        printMethod,
        includeInstall,
        costOverrides: Object.keys(costOverrides).length > 0 ? costOverrides : undefined,
      }),
    [slatCount, slatWidthIn, slatHeightFt, printMethod, includeInstall, costOverrides],
  );

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const barData = [
    { label: "Materials", value: result.breakdown.materialsTotal, pct: result.percentages.materials, color: "bg-blue-500" },
    { label: "Print", value: result.breakdown.printTotal, pct: result.percentages.print, color: "bg-teal-500" },
    { label: "Labor", value: result.breakdown.laborTotal, pct: result.percentages.labor, color: "bg-amber-500" },
    { label: "Contingency", value: result.breakdown.contingency, pct: result.percentages.contingency, color: "bg-zinc-400" },
  ];

  const breakdownRows = [
    { label: "Materials (slats)", value: result.breakdown.materialsSlats, bold: false },
    { label: "Materials (fixed)", value: result.breakdown.materialsFixed, bold: false },
    { label: "Shipping", value: result.breakdown.materialsShipping, bold: false },
    { label: "Materials Total", value: result.breakdown.materialsTotal, bold: true },
    { label: "", value: 0, bold: false },
    { label: `Print (${printMethod === "uv" ? "UV Flatbed" : "Physical Stencil"})`, value: result.breakdown.printTotal, bold: true },
    { label: "", value: 0, bold: false },
    { label: "Labor — Fabrication", value: result.breakdown.laborFabrication, bold: false },
    { label: "Labor — Print", value: result.breakdown.laborPrint, bold: false },
    { label: "Labor — Install", value: result.breakdown.laborInstall, bold: false },
    { label: "Labor — Engineering", value: result.breakdown.laborEngineering, bold: false },
    { label: "Labor — Commissioning", value: result.breakdown.laborCommission, bold: false },
    { label: "Labor — Project Mgmt", value: result.breakdown.laborProjectMgmt, bold: false },
    { label: "Labor Total", value: result.breakdown.laborTotal, bold: true },
    { label: "", value: 0, bold: false },
    { label: "Contingency (10%)", value: result.breakdown.contingency, bold: false },
    { label: "Cost to Deliver", value: result.breakdown.costToDeliver, bold: true },
  ];

  return (
    <div className="space-y-6">
      {/* CONFIGURATION */}
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Wall Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preset selector */}
            <div className="space-y-2">
              <Label>Wall Size</Label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(WALL_PRESETS) as [WallPresetKey, (typeof WALL_PRESETS)[WallPresetKey]][]).map(
                  ([key, p]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPreset(key)}
                      className={`rounded-lg border p-3 text-left text-sm transition ${preset === key ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-secondary"}`}
                    >
                      <p className="font-medium">{p.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{p.slatCount} slats</p>
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => setPreset("custom")}
                  className={`rounded-lg border p-3 text-left text-sm transition ${preset === "custom" ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-secondary"}`}
                >
                  <p className="font-medium">Custom</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Enter dims</p>
                </button>
              </div>
            </div>

            {/* Custom inputs */}
            {preset === "custom" ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Slat Count</Label>
                  <Input type="number" value={customSlats} onChange={(e) => setCustomSlats(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Slat Width (in)</Label>
                  <Input type="number" step="0.1" value={customWidthIn} onChange={(e) => setCustomWidthIn(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Wall Height (ft)</Label>
                  <Input type="number" step="0.5" value={customHeightFt} onChange={(e) => setCustomHeightFt(Number(e.target.value))} />
                </div>
              </div>
            ) : null}

            {/* Print method */}
            <div className="space-y-2">
              <Label>Print Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "uv" as const, label: "UV Flatbed Print" },
                  { key: "stencil" as const, label: "Physical Stencil" },
                ]).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setPrintMethod(m.key)}
                    className={`rounded-lg border p-3 text-sm transition ${printMethod === m.key ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-secondary"}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Installation */}
            <div className="space-y-2">
              <Label>Include Installation</Label>
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setIncludeInstall(v)}
                    className={`rounded-lg border p-3 text-sm transition ${includeInstall === v ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-secondary"}`}
                  >
                    {v ? "Yes — include install" : "No — delivery only"}
                  </button>
                ))}
              </div>
            </div>

            {/* Dimensions summary */}
            <div className="grid grid-cols-4 gap-3 rounded-lg border bg-secondary/30 p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Slats</p>
                <p className="font-medium">{slatCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Width</p>
                <p className="font-medium">{slatWidthIn}&quot;</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Height</p>
                <p className="font-medium">{slatHeightFt} ft</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Wall Width</p>
                <p className="font-medium">{result.inputs.wallWidthFt} ft</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PRICING CARDS */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {result.cards.map((card) => (
                <div
                  key={card.label}
                  className={`rounded-lg border p-4 ${card.label === "Client Price" ? "col-span-2 bg-primary/5 border-primary/30" : ""}`}
                >
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className={`font-bold ${card.label === "Client Price" ? "text-2xl text-primary" : "text-lg"}`}>
                    {card.value}
                  </p>
                  {card.sub ? <p className="text-xs text-muted-foreground">{card.sub}</p> : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* COST BREAKDOWN BAR */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {barData.map((bar) => (
            <div key={bar.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{bar.label}</span>
                <span className="text-muted-foreground">{fmt(bar.value)} ({bar.pct}%)</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div className={`h-full rounded-full ${bar.color} transition-all`} style={{ width: `${bar.pct}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* DETAILED BREAKDOWN */}
      <Card>
        <CardHeader>
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex w-full items-center justify-between"
          >
            <CardTitle>Detailed Breakdown</CardTitle>
            <span className="text-xs text-muted-foreground">{showBreakdown ? "Collapse" : "Expand"}</span>
          </button>
        </CardHeader>
        {showBreakdown ? (
          <CardContent>
            <div className="space-y-1">
              {breakdownRows.map((row, i) =>
                row.label === "" ? (
                  <div key={i} className="h-2" />
                ) : (
                  <div key={row.label} className={`flex items-center justify-between py-1.5 text-sm ${row.bold ? "font-semibold border-t pt-2" : ""}`}>
                    <span>{row.label}</span>
                    <span className="tabular-nums">{fmt(row.value)}</span>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        ) : null}
      </Card>

      {/* COST EDITOR */}
      <Card>
        <CardHeader>
          <button
            type="button"
            onClick={() => setShowCostEditor(!showCostEditor)}
            className="flex w-full items-center justify-between"
          >
            <CardTitle>Studio Cost Settings</CardTitle>
            <span className="text-xs text-muted-foreground">{showCostEditor ? "Collapse" : "Expand"}</span>
          </button>
        </CardHeader>
        {showCostEditor ? (
          <CardContent className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setCostOverrides({})}>
                Reset to Defaults
              </Button>
            </div>
            {Array.from(new Set(COST_FIELDS.map((f) => f.group))).map((group) => (
              <div key={group} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{group}</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {COST_FIELDS.filter((f) => f.group === group).map((field) => {
                    const currentValue = costOverrides[field.key] ?? DEFAULT_UNIT_COSTS[field.key];
                    const isPercent = field.key.includes("Percent");
                    return (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{field.label}</Label>
                        <Input
                          type="number"
                          step={isPercent ? "0.01" : "1"}
                          value={isPercent ? currentValue : currentValue}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCostOverrides((prev) => ({ ...prev, [field.key]: val }));
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
