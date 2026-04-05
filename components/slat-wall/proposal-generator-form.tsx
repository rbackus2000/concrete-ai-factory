"use client";

import { useState, useMemo, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateSlatWallCost,
  WALL_PRESETS,
  type WallPresetKey,
} from "@/lib/engines/slat-wall-calculator-engine";
import { SCENARIO_LIST } from "@/lib/engines/print-generator/scenarios";
import { generateProposalPDF, type ProposalInput } from "@/lib/engines/proposal-pdf-engine";
import { saveProposalAction } from "@/app/actions/proposal-actions";

type Props = {
  nextProposalNumber: string;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  clientName?: string;
  defaultSlatCount?: number;
  defaultSlatWidthIn?: number;
  defaultSlatHeightFt?: number;
  positionAName?: string;
  positionBName?: string;
  aiImages?: Record<string, string>;
};

function detectPreset(slatCount: number): WallPresetKey | "custom" {
  for (const [key, p] of Object.entries(WALL_PRESETS) as [WallPresetKey, (typeof WALL_PRESETS)[WallPresetKey]][]) {
    if (p.slatCount === slatCount) return key;
  }
  return "custom";
}

export function ProposalGeneratorForm({
  nextProposalNumber,
  projectId,
  projectCode,
  projectName: defaultProjectName,
  clientName: defaultClientName,
  defaultSlatCount,
  defaultSlatWidthIn,
  defaultSlatHeightFt,
  positionAName,
  positionBName,
  aiImages,
}: Props) {
  // Client info
  const [clientName, setClientName] = useState(defaultClientName || "");
  const [projectName, setProjectName] = useState(defaultProjectName || "");
  const [clientEmail, setClientEmail] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [proposalNumber] = useState(nextProposalNumber);

  // Wall config
  const [preset, setPreset] = useState<WallPresetKey | "custom">(() =>
    defaultSlatCount ? detectPreset(defaultSlatCount) : "standard",
  );
  const [customSlats, setCustomSlats] = useState(defaultSlatCount ?? 32);
  const [customWidthIn, setCustomWidthIn] = useState(defaultSlatWidthIn ?? 9);
  const [customHeightFt, setCustomHeightFt] = useState(defaultSlatHeightFt ?? 10);
  const [printMethod, setPrintMethod] = useState<"uv" | "stencil">("uv");
  const [includeInstall, setIncludeInstall] = useState(true);

  // Scenario
  const [scenarioId, setScenarioId] = useState("skull");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const slatCount = preset === "custom" ? customSlats : WALL_PRESETS[preset].slatCount;
  const slatWidthIn = preset === "custom" ? customWidthIn : WALL_PRESETS[preset].slatWidthIn;
  const slatHeightFt = preset === "custom" ? customHeightFt : WALL_PRESETS[preset].slatHeightFt;

  const calcResult = useMemo(
    () => calculateSlatWallCost({ slatCount, slatWidthIn, slatHeightFt, printMethod, includeInstall }),
    [slatCount, slatWidthIn, slatHeightFt, printMethod, includeInstall],
  );

  const selectedScenario = SCENARIO_LIST.find((s) => s.id === scenarioId);

  const generate = useCallback(async () => {
    if (!clientName || !projectName) return;
    setIsGenerating(true);
    setPdfBlob(null);

    try {
      setProgress("Building cover page...");
      await new Promise((r) => setTimeout(r, 100));

      const input: ProposalInput = {
        clientName,
        projectName,
        clientEmail,
        siteAddress,
        proposalNumber,
        proposalDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        scenarioId,
        slatCount,
        slatWidthIn,
        slatHeightFt,
        printMethod,
        includeInstall,
        aiImages,
      };

      setProgress("Generating 16-page proposal...");
      const pdfBytes = await generateProposalPDF(input);

      setProgress("Finalizing document...");
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
      setPdfBlob(blob);

      // Save to DB
      setProgress("Saving proposal...");
      await saveProposalAction({
        proposalNumber,
        clientName,
        projectName,
        clientEmail,
        siteAddress,
        scenarioId,
        wallSize: preset === "custom" ? "SW-CUSTOM" : WALL_PRESETS[preset].label,
        slatCount,
        slatWidthIn,
        slatHeightFt,
        printMethod,
        includeInstall,
        clientPrice: calcResult.pricing.studioPrice,
        breakdown: calcResult.breakdown,
      });

      setProgress("");
    } catch (error) {
      console.error("Proposal generation failed:", error);
      setProgress("Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [clientName, projectName, clientEmail, siteAddress, proposalNumber, scenarioId, slatCount, slatWidthIn, slatHeightFt, printMethod, includeInstall, preset, calcResult]);

  const downloadPdf = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${proposalNumber}-${clientName.replace(/\s+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n: number) => `$${n.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* CLIENT INFO */}
      <Card>
        <CardHeader><CardTitle>Client Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Client Name *</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Acme Hotels" />
            </div>
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Lobby Installation" />
            </div>
            <div className="space-y-2">
              <Label>Client Email</Label>
              <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Site Address</Label>
              <Input value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Proposal Number</Label>
              <Input value={proposalNumber} readOnly className="bg-secondary/30" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input value={new Date().toLocaleDateString()} readOnly className="bg-secondary/30" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WALL CONFIG */}
      <Card>
        <CardHeader><CardTitle>Wall Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {(Object.entries(WALL_PRESETS) as [WallPresetKey, (typeof WALL_PRESETS)[WallPresetKey]][]).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPreset(key)}
                className={`rounded-lg border p-3 text-left text-sm transition ${preset === key ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-secondary"}`}
              >
                <p className="font-medium">{p.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.slatCount} slats · {(p.slatCount * p.slatWidthIn / 12).toFixed(0)} ft</p>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPreset("custom")}
              className={`rounded-lg border p-3 text-left text-sm transition ${preset === "custom" ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-secondary"}`}
            >
              <p className="font-medium">Custom</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Enter dims</p>
            </button>
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            {(["uv", "stencil"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPrintMethod(m)}
                className={`rounded-lg border p-3 text-sm transition ${printMethod === m ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-secondary"}`}
              >
                {m === "uv" ? "UV Flatbed Print" : "Physical Stencil"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setIncludeInstall(v)}
                className={`rounded-lg border p-3 text-sm transition ${includeInstall === v ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-secondary"}`}
              >
                {v ? "Include Installation" : "Delivery Only"}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SCENARIO SELECTION */}
      <Card>
        <CardHeader><CardTitle>Scenario Selection</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {SCENARIO_LIST.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScenarioId(s.id)}
                className={`rounded-lg border p-3 text-center transition ${scenarioId === s.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}
              >
                <p className="text-sm font-medium" style={{ color: s.color }}>{s.emergentLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.sideALabel} + {s.sideBLabel}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* LIVE PRICING */}
      <Card>
        <CardHeader><CardTitle>Live Pricing Preview</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 col-span-2">
              <p className="text-xs text-muted-foreground">Client Price</p>
              <p className="text-3xl font-bold text-primary">{fmt(calcResult.pricing.studioPrice)}</p>
              <p className="text-xs text-muted-foreground">
                {slatCount} slats · {calcResult.inputs.wallWidthFt} ft wide · {slatHeightFt} ft tall
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Per Slat</p>
              <p className="text-lg font-bold">{fmt(calcResult.pricing.pricePerSlat)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Per Sq Ft</p>
              <p className="text-lg font-bold">{fmt(calcResult.pricing.pricePerSqFt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI IMAGES FROM PROJECT */}
      {aiImages && Object.keys(aiImages).length > 0 ? (
        <Card>
          <CardHeader><CardTitle>Project AI Renders (will be included in proposal)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {(["A", "B", "C"] as const).map((state) =>
                aiImages[state] ? (
                  <div key={state} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {state === "A" ? `Side A${positionAName ? ` - ${positionAName}` : ""}` : state === "B" ? `Side B${positionBName ? ` - ${positionBName}` : ""}` : "Transition"}
                    </p>
                    <img
                      alt={`${state} render`}
                      className="w-full rounded-lg object-cover"
                      src={aiImages[state]}
                    />
                  </div>
                ) : null,
              )}
            </div>
          </CardContent>
        </Card>
      ) : projectId ? (
        <Card>
          <CardContent className="py-6">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-sm font-medium text-amber-800">No AI images generated yet</p>
              <p className="text-xs text-amber-600">Generate images in the Simulator first to include them in the proposal.</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* GENERATE */}
      {isGenerating ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium">{progress}</p>
            <div className="mx-auto mt-3 h-2 w-64 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
            </div>
          </CardContent>
        </Card>
      ) : pdfBlob ? (
        <Button className="w-full h-14 text-lg" onClick={downloadPdf}>
          Download Proposal PDF ({(pdfBlob.size / 1024 / 1024).toFixed(1)} MB)
        </Button>
      ) : (
        <Button
          className="w-full h-14 text-lg"
          disabled={!clientName || !projectName}
          onClick={generate}
        >
          Generate Proposal PDF — {selectedScenario?.label ?? ""} · {fmt(calcResult.pricing.studioPrice)}
        </Button>
      )}
    </div>
  );
}
