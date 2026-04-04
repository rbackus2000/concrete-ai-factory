"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import JSZip from "jszip";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  SCENARIO_LIST,
  SCENARIOS,
  WALL_SIZES,
  type PrintScenario,
  type WallConfig,
  type WallSizeKey,
} from "@/lib/engines/print-generator/scenarios";
import {
  generateSlatLines,
  generateSlatSVG,
  generateSlatPDF,
  generateSlatDXF,
  generateSpecSheet,
} from "@/lib/engines/print-generator/generators";

type Props = {
  projectCode: string;
  defaultSlatCount: number;
};

// ─── PREVIEW CANVAS ────────────────────────────────────────────

function PreviewCanvas({
  scenario,
  state,
  slatCount,
  width = 400,
  height = 200,
}: {
  scenario: PrintScenario;
  state: "A" | "B" | "C";
  slatCount: number;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sw = width / slatCount;
    ctx.fillStyle = "#dedad2";
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < slatCount; i++) {
      const xFrac = (i + 0.5) / slatCount;
      ctx.save();
      ctx.beginPath();
      ctx.rect(i * sw, 0, sw, height);
      ctx.clip();

      const lineCount = 60;
      if (state === "C") {
        const isOdd = i % 2 === 0;
        const bgFn = isOdd ? scenario.densityA : scenario.densityB;
        const cFn = scenario.densityC;
        for (let row = 0; row < lineCount; row++) {
          const yFrac = row / lineCount;
          const y = yFrac * height;
          const lineH = height / lineCount;
          const combined = Math.max(0, Math.min(1, bgFn(yFrac, xFrac) * 0.25 + cFn(yFrac, xFrac) * 0.85));
          if (combined > 0.02) {
            ctx.fillStyle = `rgba(17,17,17,${Math.min(1, combined * 1.2)})`;
            ctx.fillRect(i * sw, y, sw, lineH * combined * 1.5);
          }
        }
      } else {
        const fn = state === "A" ? scenario.densityA : scenario.densityB;
        for (let row = 0; row < lineCount; row++) {
          const yFrac = row / lineCount;
          const y = yFrac * height;
          const lineH = height / lineCount;
          const d = Math.max(0, Math.min(1, fn(yFrac, xFrac)));
          if (d > 0.02) {
            ctx.fillStyle = `rgba(17,17,17,${Math.min(1, d * 1.2)})`;
            ctx.fillRect(i * sw, y, sw, lineH * d * 1.5);
          }
        }
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(i * sw, 0);
      ctx.lineTo(i * sw, height);
      ctx.stroke();
    }
  }, [scenario, state, slatCount, width, height]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "auto", display: "block", borderRadius: "4px" }} />;
}

// ─── MAIN COMPONENT ────────────────────────────────────────────

export function PrintGeneratorClient({ projectCode, defaultSlatCount }: Props) {
  const [scenarioId, setScenarioId] = useState("skull");
  const [wallSizeKey, setWallSizeKey] = useState<WallSizeKey | "custom">("standard");
  const [customSlats, setCustomSlats] = useState(defaultSlatCount);
  const [customWidthIn, setCustomWidthIn] = useState(9);
  const [customHeightFt, setCustomHeightFt] = useState(10);
  const [formats, setFormats] = useState({ pdf: true, svg: true, dxf: false });
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [fileManifest, setFileManifest] = useState<{ name: string; slat: number; face: string; lines: number; format: string }[]>([]);

  const scenario = SCENARIOS[scenarioId]!;
  const config: WallConfig =
    wallSizeKey === "custom"
      ? { slatCount: customSlats, slatWidthMM: customWidthIn * 25.4, slatHeightMM: customHeightFt * 304.8, lineWeightMM: 0.75 }
      : WALL_SIZES[wallSizeKey];
  const sizeLabel = wallSizeKey === "custom" ? "SW-CUSTOM" : WALL_SIZES[wallSizeKey].label;

  const toggleFormat = (key: "pdf" | "svg" | "dxf") => {
    setFormats((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setZipBlob(null);
    setFileManifest([]);

    const zip = new JSZip();
    const folder = `${projectCode}_${scenarioId.toUpperCase()}_${sizeLabel}`;
    const root = zip.folder(folder)!;
    const pdfFolder = formats.pdf ? root.folder("PDF_UV_PRINT") : null;
    const svgFolder = formats.svg ? root.folder("SVG_VECTOR") : null;
    const dxfFolder = formats.dxf ? root.folder("DXF_STENCIL_CUT") : null;

    const total = config.slatCount * 2;
    const manifest: typeof fileManifest = [];
    let current = 0;

    for (let slatIndex = 0; slatIndex < config.slatCount; slatIndex++) {
      for (const face of ["A", "B"] as const) {
        current++;
        const slatNum = String(slatIndex + 1).padStart(2, "0");
        setProgress({ current, total, label: `Slat ${slatNum} Side ${face}` });

        const slatData = generateSlatLines({
          scenario,
          face,
          slatIndex,
          totalSlats: config.slatCount,
          config,
        });

        const baseName = `${folder}_SLAT${slatNum}_SIDE${face}`;

        if (pdfFolder) {
          const pdfBytes = await generateSlatPDF(slatData, config.slatCount);
          pdfFolder.file(`${baseName}.pdf`, pdfBytes);
          manifest.push({ name: `${baseName}.pdf`, slat: slatIndex + 1, face, lines: slatData.totalLines, format: "PDF" });
        }
        if (svgFolder) {
          svgFolder.file(`${baseName}.svg`, generateSlatSVG(slatData, config.slatCount));
          manifest.push({ name: `${baseName}.svg`, slat: slatIndex + 1, face, lines: slatData.totalLines, format: "SVG" });
        }
        if (dxfFolder) {
          dxfFolder.file(`${baseName}.dxf`, generateSlatDXF(slatData));
          manifest.push({ name: `${baseName}.dxf`, slat: slatIndex + 1, face, lines: slatData.totalLines, format: "DXF" });
        }

        // Yield to UI
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    root.file("PRINT_SPECIFICATION.txt", generateSpecSheet(scenario, sizeLabel, config));

    setProgress({ current: total, total, label: "Packaging ZIP..." });
    const blob = await zip.generateAsync({ type: "blob" });
    setZipBlob(blob);
    setFileManifest(manifest);
    setIsGenerating(false);
  }, [scenario, scenarioId, config, sizeLabel, formats, projectCode]);

  const downloadZip = () => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectCode}_${scenarioId.toUpperCase()}_${sizeLabel}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* CONFIG */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Scenario</Label>
              <div className="grid grid-cols-5 gap-2">
                {SCENARIO_LIST.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setScenarioId(s.id); setZipBlob(null); }}
                    className={`rounded-xl border p-3 text-center text-xs font-medium transition ${scenarioId === s.id ? "border-primary bg-primary/10 text-primary" : "border-border/70 hover:bg-secondary/40"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Wall Size</Label>
                <Select value={wallSizeKey} onChange={(e) => { setWallSizeKey(e.target.value as WallSizeKey | "custom"); setZipBlob(null); }}>
                  <option value="small">SW-SMALL (16 slats, 12 ft)</option>
                  <option value="standard">SW-STANDARD (32 slats, 24 ft)</option>
                  <option value="large">SW-LARGE (48 slats, 36 ft)</option>
                  <option value="custom">Custom</option>
                </Select>
              </div>
              {wallSizeKey === "custom" ? (
                <>
                  <div className="space-y-2">
                    <Label>Slat Count</Label>
                    <Input type="number" value={customSlats} onChange={(e) => setCustomSlats(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slat Width (inches)</Label>
                    <Input type="number" step="0.1" value={customWidthIn} onChange={(e) => setCustomWidthIn(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Wall Height (feet)</Label>
                    <Input type="number" step="0.5" value={customHeightFt} onChange={(e) => setCustomHeightFt(Number(e.target.value))} />
                  </div>
                </>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Output Formats</Label>
              <div className="flex gap-3">
                {(["pdf", "svg", "dxf"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFormat(f)}
                    className={`rounded-full border px-4 py-2 text-xs font-medium transition ${formats[f] ? "border-primary bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:bg-secondary/40"}`}
                  >
                    {f === "pdf" ? "PDF (UV Print)" : f === "svg" ? "SVG (Vector)" : "DXF (Stencil Cut)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 rounded-2xl border border-border/70 bg-secondary/20 p-4 text-sm">
              <div>
                <p className="text-muted-foreground">Slats</p>
                <p className="font-medium">{config.slatCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Width</p>
                <p className="font-medium">{(config.slatWidthMM / 25.4).toFixed(1)}&quot;</p>
              </div>
              <div>
                <p className="text-muted-foreground">Height</p>
                <p className="font-medium">{(config.slatHeightMM / 304.8).toFixed(1)} ft</p>
              </div>
              <div>
                <p className="text-muted-foreground">Files</p>
                <p className="font-medium">{config.slatCount * 2 * (Number(formats.pdf) + Number(formats.svg) + Number(formats.dxf))}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PREVIEW */}
        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardHeader><CardTitle>Live Preview — {scenario.label}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Side A — {scenario.sideALabel}</p>
              <PreviewCanvas scenario={scenario} state="A" slatCount={config.slatCount} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Side B — {scenario.sideBLabel}</p>
              <PreviewCanvas scenario={scenario} state="B" slatCount={config.slatCount} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Emergent — {scenario.emergentLabel}</p>
              <PreviewCanvas scenario={scenario} state="C" slatCount={config.slatCount} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GENERATE */}
      {isGenerating ? (
        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardContent className="py-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Generating: {progress.label}</span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-secondary/40">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{progress.current} / {progress.total} slat faces</p>
            </div>
          </CardContent>
        </Card>
      ) : zipBlob ? (
        <Button className="w-full h-14 text-lg" onClick={downloadZip}>
          Download ZIP ({(zipBlob.size / 1024 / 1024).toFixed(1)} MB)
        </Button>
      ) : (
        <Button
          className="w-full h-14 text-lg"
          disabled={!formats.pdf && !formats.svg && !formats.dxf}
          onClick={generate}
        >
          Generate Print Files
        </Button>
      )}

      {/* MANIFEST */}
      {fileManifest.length > 0 ? (
        <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
          <CardHeader>
            <CardTitle>File Manifest ({fileManifest.length} files)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white/90">
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">File</th>
                    <th className="py-2 pr-4">Slat</th>
                    <th className="py-2 pr-4">Face</th>
                    <th className="py-2 pr-4">Lines</th>
                    <th className="py-2">Format</th>
                  </tr>
                </thead>
                <tbody>
                  {fileManifest.map((f) => (
                    <tr key={f.name} className="border-b border-border/30">
                      <td className="py-1.5 pr-4 font-mono text-xs">{f.name}</td>
                      <td className="py-1.5 pr-4">S-{String(f.slat).padStart(2, "0")}</td>
                      <td className="py-1.5 pr-4">{f.face}</td>
                      <td className="py-1.5 pr-4">{f.lines}</td>
                      <td className="py-1.5"><Badge variant="secondary">{f.format}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
