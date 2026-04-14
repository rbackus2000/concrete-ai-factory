"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Bot,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
  FileText,
  Beaker,
  ClipboardCheck,
  ImageIcon,
  ChevronDown,
  ChevronRight,
  Save,
  RefreshCw,
  ThumbsUp,
  Sparkles,
} from "lucide-react";

import {
  generateBriefAction,
  generateImageAction,
  generateBundleAction,
  saveProductAction,
} from "@/app/actions/product-agent-actions";
import type { ProductBundle } from "@/lib/engines/product-agent-engine";

type DesignBrief = {
  productName: string;
  category: string;
  styleDescription: string;
  keyFeatures: string[];
  suggestedDimensions: { outerLength: number; outerWidth: number; outerHeight: number; innerDepth: number };
  drainType: string;
  mountType: string;
  finish: string;
  imagePrompt: string;
};

type Step = "idea" | "briefing" | "brief-review" | "imaging" | "image-review" | "building" | "bundle-review" | "saving" | "done";

export function ProductAgentClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idea");
  const [prompt, setPrompt] = useState("");
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [conceptImageUrl, setConceptImageUrl] = useState<string | null>(null);
  const [bundle, setBundle] = useState<ProductBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["sku"]));

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const isLoading = ["briefing", "imaging", "building", "saving"].includes(step);

  // ── Step 1: Generate design brief ─────────────────────────
  const handleGenerateBrief = async () => {
    setError(null);
    setStep("briefing");
    try {
      const result = await generateBriefAction(prompt);
      if (result.error || !result.brief) {
        setError(result.error || "Failed to generate design brief.");
        setStep("idea");
      } else {
        setBrief(result.brief);
        setStep("brief-review");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setStep("idea");
    }
  };

  // ── Step 2: Generate concept image ────────────────────────
  const handleGenerateImage = async () => {
    if (!brief) return;
    setError(null);
    setStep("imaging");
    try {
      const result = await generateImageAction(brief.imagePrompt, brief.productName);
      if (result.error || !result.imageUrl) {
        setError(result.error || "Failed to generate image.");
        setStep("brief-review");
      } else {
        setConceptImageUrl(result.imageUrl);
        setStep("image-review");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setStep("brief-review");
    }
  };

  // ── Step 3: Generate full product bundle ──────────────────
  const handleGenerateBundle = async () => {
    if (!brief) return;
    setError(null);
    setStep("building");
    try {
      const result = await generateBundleAction(brief);
      if (result.error || !result.bundle?.sku) {
        setError(result.error || "Failed to generate product spec.");
        setStep("image-review");
      } else {
        setBundle(result.bundle);
        setStep("bundle-review");
        setExpandedSections(new Set(["sku"]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setStep("image-review");
    }
  };

  // ── Step 4: Save to database ──────────────────────────────
  const handleSave = async () => {
    if (!bundle) return;
    setStep("saving");
    setError(null);
    try {
      const result = await saveProductAction(bundle, conceptImageUrl);
      if (result.error) {
        setError(result.error);
        setStep("bundle-review");
      } else {
        setSavedCode(result.skuCode!);
        setStep("done");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setStep("bundle-review");
    }
  };

  const reset = () => {
    setStep("idea");
    setPrompt("");
    setBrief(null);
    setConceptImageUrl(null);
    setBundle(null);
    setError(null);
    setSavedCode(null);
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  // ── Progress Steps ────────────────────────────────────────
  const steps = [
    { key: "idea", label: "Describe", done: ["brief-review", "imaging", "image-review", "building", "bundle-review", "saving", "done"].includes(step) },
    { key: "brief", label: "Design Brief", done: ["imaging", "image-review", "building", "bundle-review", "saving", "done"].includes(step) },
    { key: "image", label: "Concept Image", done: ["building", "bundle-review", "saving", "done"].includes(step) },
    { key: "bundle", label: "Full Spec", done: ["saving", "done"].includes(step) },
    { key: "save", label: "Saved", done: step === "done" },
  ];

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              s.done ? "bg-blue-100 text-blue-700" : "bg-secondary text-muted-foreground"
            }`}>
              {s.done ? <CheckCircle2 className="h-3 w-3" /> : <span className="text-[10px]">{i + 1}</span>}
              {s.label}
            </div>
            {i < steps.length - 1 && <div className={`h-px w-6 ${s.done ? "bg-blue-300" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* ── STEP 1: Simple Prompt ──────────────────────────── */}
      {(step === "idea" || step === "briefing") && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">What do you want to create?</h2>
              <p className="text-sm text-muted-foreground">
                Keep it simple — the agent will research and fill in the details.
              </p>
            </div>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={"Examples:\n- Create a new erosion-style vessel sink\n- Modern rectangular ramp sink with slot drain\n- Large outdoor bench with arched legs\n- Fluted wall panel with deep shadow lines\n- Woodform vanity countertop with integrated basin"}
            rows={4}
            disabled={isLoading}
            className="w-full rounded-lg border bg-background p-4 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring disabled:opacity-50"
          />

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleGenerateBrief}
              disabled={isLoading || prompt.trim().length < 5}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {step === "briefing" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Claude is designing...</>
              ) : (
                <><Bot className="h-4 w-4" /> Generate Design</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Design Brief Review ────────────────────── */}
      {(step === "brief-review" || step === "imaging") && brief && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">{brief.productName}</h2>
                <p className="text-sm text-muted-foreground">{brief.category} | {brief.finish} | {brief.mountType}</p>
              </div>
            </div>
            <button onClick={handleGenerateBrief} disabled={isLoading} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-3.5 w-3.5" /> Redesign
            </button>
          </div>

          <p className="text-sm text-foreground">{brief.styleDescription}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {brief.keyFeatures.map((f, i) => (
              <span key={i} className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{f}</span>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-3 text-sm">
            <div><span className="text-xs text-muted-foreground">Size</span><br />{brief.suggestedDimensions.outerLength}" x {brief.suggestedDimensions.outerWidth}" x {brief.suggestedDimensions.outerHeight}"</div>
            <div><span className="text-xs text-muted-foreground">Depth</span><br />{brief.suggestedDimensions.innerDepth}"</div>
            <div><span className="text-xs text-muted-foreground">Drain</span><br />{brief.drainType || "None"}</div>
            <div><span className="text-xs text-muted-foreground">Mount</span><br />{brief.mountType}</div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground">Start over</button>
            <button
              onClick={handleGenerateImage}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {step === "imaging" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Gemini is rendering...</>
              ) : (
                <><ImageIcon className="h-4 w-4" /> Generate Concept Image</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Image Review ───────────────────────────── */}
      {(step === "image-review" || step === "building") && brief && conceptImageUrl && (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="relative aspect-video w-full bg-zinc-100">
            <Image src={conceptImageUrl} alt={brief.productName} fill className="object-contain" />
          </div>
          <div className="p-6">
            <h2 className="font-semibold text-foreground">{brief.productName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{brief.styleDescription}</p>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground">Start over</button>
                <button
                  onClick={handleGenerateImage}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> New image
                </button>
              </div>
              <button
                onClick={handleGenerateBundle}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {step === "building" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Building full product spec...</>
                ) : (
                  <><ThumbsUp className="h-4 w-4" /> Approve &amp; Build Product</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Bundle Review ──────────────────────────── */}
      {(step === "bundle-review" || step === "saving") && bundle?.sku && (
        <div className="space-y-4">
          {/* Header with concept image */}
          <div className="flex items-center justify-between rounded-lg border bg-blue-50 p-4">
            <div className="flex items-center gap-4">
              {conceptImageUrl && (
                <div className="relative h-16 w-24 overflow-hidden rounded-md">
                  <Image src={conceptImageUrl} alt="" fill className="object-cover" />
                </div>
              )}
              <div>
                <p className="font-semibold text-blue-900">{bundle.sku.code} — {bundle.sku.name}</p>
                <p className="text-sm text-blue-700">
                  {bundle.buildPacketSections.length} build sections | {bundle.materials.length} materials | {bundle.qcChecklists.length} QC checklists
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={reset} className="rounded-lg border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">Start Over</button>
              <button
                onClick={handleSave}
                disabled={step === "saving"}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {step === "saving" ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save to Database</>}
              </button>
            </div>
          </div>

          {/* SKU Details */}
          <ReviewSection icon={<Package className="h-4 w-4" />} title={`SKU: ${bundle.sku.code}`} expanded={expandedSections.has("sku")} onToggle={() => toggleSection("sku")}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Code" value={bundle.sku.code} />
              <Field label="Name" value={bundle.sku.name} />
              <Field label="Category" value={bundle.sku.category} />
              <Field label="Finish" value={bundle.sku.finish} />
              <Field label="Mount" value={bundle.sku.mountType} />
              <Field label="Drain" value={bundle.sku.drainType || "None"} />
              <Field label="Outer" value={`${bundle.sku.outerLength} x ${bundle.sku.outerWidth} x ${bundle.sku.outerHeight}"`} />
              <Field label="Weight" value={`${bundle.sku.targetWeight.min}-${bundle.sku.targetWeight.max} lbs`} />
              <Field label="Overflow" value={bundle.sku.hasOverflow ? "Yes" : "No"} />
            </div>
            <div className="mt-3"><Field label="Summary" value={bundle.sku.summary} /></div>
          </ReviewSection>

          <ReviewSection icon={<FileText className="h-4 w-4" />} title={`Build Packet — ${bundle.buildPacketSections.length} sections`} expanded={expandedSections.has("packet")} onToggle={() => toggleSection("packet")}>
            <div className="space-y-2">
              {bundle.buildPacketSections.map((s, i) => (
                <div key={i} className="rounded-md border bg-background p-3">
                  <p className="text-xs font-semibold uppercase text-blue-600">{s.name}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{s.content.substring(0, 300)}{s.content.length > 300 ? "..." : ""}</p>
                </div>
              ))}
            </div>
          </ReviewSection>

          <ReviewSection icon={<Beaker className="h-4 w-4" />} title={`Materials — ${bundle.materials.length}`} expanded={expandedSections.has("materials")} onToggle={() => toggleSection("materials")}>
            <div className="space-y-1 text-sm">
              {bundle.materials.map((m, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b last:border-0">
                  <span>{m.name}</span>
                  <span className="text-muted-foreground">{m.quantity} {m.unit} @ {fmt(m.unitCost)}</span>
                </div>
              ))}
            </div>
          </ReviewSection>

          <ReviewSection icon={<ClipboardCheck className="h-4 w-4" />} title={`QC — ${bundle.qcChecklists.length} checklists`} expanded={expandedSections.has("qc")} onToggle={() => toggleSection("qc")}>
            {bundle.qcChecklists.map((qc, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <p className="text-xs font-semibold uppercase text-blue-600">{qc.category} — {qc.name}</p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {qc.checklist.map((item, j) => <li key={j} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />{item}</li>)}
                </ul>
              </div>
            ))}
          </ReviewSection>
        </div>
      )}

      {/* ── DONE ───────────────────────────────────────────── */}
      {step === "done" && savedCode && (
        <div className="rounded-lg border bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="mt-3 text-xl font-bold text-emerald-900">Product Created</h2>
          <p className="mt-1 text-sm text-emerald-700">
            <span className="font-mono font-bold">{savedCode}</span> saved with all build packets, materials, and QC checklists.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={() => router.push(`/skus/${savedCode}`)} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
              View SKU
            </button>
            <button onClick={reset} className="rounded-lg border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">
              Create Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewSection({ icon, title, expanded, onToggle, children }: {
  icon: React.ReactNode; title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left hover:bg-secondary/50">
        <div className="text-blue-600">{icon}</div>
        <span className="flex-1 font-semibold text-foreground">{title}</span>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && <div className="border-t p-4">{children}</div>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  );
}
