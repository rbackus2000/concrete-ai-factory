"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SEQUENCE_TRIGGERS, TRIGGER_LABELS, EMAIL_TONES } from "@/lib/schemas/marketing";

type Step = {
  stepNumber: number;
  delayDays: number;
  subject: string;
  bodyHtml: string;
  tone: string;
  sentCount?: number;
  openCount?: number;
  clickCount?: number;
};

type SequenceData = {
  id?: string;
  name: string;
  description: string;
  trigger: string;
  isActive: boolean;
  steps: Step[];
};

/**
 * Renders trusted HTML from admin-authored email templates into an iframe
 * for safe preview isolation. Only admin users can edit these templates.
 */
function EmailPreviewFrame({ html, subject }: { html: string; subject: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`<!DOCTYPE html><html><head><style>
          body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: hsl(224 10% 10%); background: hsl(0 0% 100%); }
          p { line-height: 1.6; margin: 0 0 12px; }
          a { color: hsl(221 83% 53%); }
          h2 { margin: 0 0 16px; }
          ol, ul { padding-left: 20px; }
          li { margin-bottom: 4px; }
        </style></head><body>
          <p style="font-size:12px;color:#888;margin-bottom:12px;">Subject: ${subject.replace(/</g, "&lt;").replace(/>/g, "&gt;") || "(no subject)"}</p>
          ${html || "<p style='color:#aaa'>No content yet</p>"}
        </body></html>`);
        doc.close();
      }
    }
  }, [html, subject]);

  return (
    <iframe
      ref={iframeRef}
      title="Email preview"
      className="h-64 w-full rounded border-0"
      sandbox="allow-same-origin"
    />
  );
}

export function SequenceBuilder({
  initial,
}: {
  initial?: SequenceData;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [trigger, setTrigger] = useState(initial?.trigger ?? "MANUAL");
  const [isActive, setIsActive] = useState(initial?.isActive ?? false);
  const [steps, setSteps] = useState<Step[]>(
    initial?.steps?.length
      ? initial.steps
      : [{ stepNumber: 1, delayDays: 0, subject: "", bodyHtml: "", tone: "friendly" }],
  );
  const [previewStep, setPreviewStep] = useState(0);
  const [generating, setGenerating] = useState<number | null>(null);

  function addStep() {
    const lastStep = steps[steps.length - 1];
    setSteps([
      ...steps,
      {
        stepNumber: steps.length + 1,
        delayDays: (lastStep?.delayDays ?? 0) + 3,
        subject: "",
        bodyHtml: "",
        tone: "friendly",
      },
    ]);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepNumber: i + 1 })));
  }

  function updateStep(index: number, field: keyof Step, value: string | number) {
    setSteps(steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  const generateEmail = useCallback(
    async (index: number) => {
      setGenerating(index);
      try {
        const step = steps[index];
        const previousSteps = steps.slice(0, index).map((s) => s.subject).filter(Boolean);

        const res = await fetch("/api/marketing/generate-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "sequence_step",
            stepNumber: step.stepNumber,
            sequenceName: name,
            triggerEvent: TRIGGER_LABELS[trigger] ?? trigger,
            delayDays: step.delayDays,
            tone: step.tone,
            previousSteps,
            subject: step.subject,
          }),
        });

        if (!res.ok) return;

        const reader = res.body?.getReader();
        if (!reader) return;

        let text = "";
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, bodyHtml: text } : s)));
        }
      } finally {
        setGenerating(null);
      }
    },
    [steps, name, trigger],
  );

  async function improveSubject(index: number) {
    const step = steps[index];
    if (!step.subject) return;

    setGenerating(index);
    try {
      const res = await fetch("/api/marketing/improve-subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: step.subject,
          context: `${TRIGGER_LABELS[trigger] ?? trigger} email for RB Studio`,
        }),
      });

      if (!res.ok) return;

      const reader = res.body?.getReader();
      if (!reader) return;

      let text = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, subject: text } : s)));
      }
    } finally {
      setGenerating(null);
    }
  }

  async function handleSubmit() {
    setError("");
    if (!name.trim()) {
      setError("Sequence name is required");
      return;
    }
    if (steps.some((s) => !s.subject.trim() || !s.bodyHtml.trim())) {
      setError("All steps need a subject and body");
      return;
    }

    setLoading(true);
    try {
      const url = initial?.id
        ? `/api/marketing/sequences/${initial.id}`
        : "/api/marketing/sequences";

      const res = await fetch(url, {
        method: initial?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, trigger, isActive, steps }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save sequence");
        return;
      }

      const { data } = await res.json();
      router.push(`/marketing/sequences/${data.id}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* Left — Config + Steps */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sequence Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Quote Follow-Up — 3 Step" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this sequence does..." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Trigger</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                >
                  {SEQUENCE_TRIGGERS.map((t) => (
                    <option key={t} value={t}>
                      {TRIGGER_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded"
                  />
                  Active
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        {steps.map((step, i) => (
          <Card key={i} className={previewStep === i ? "ring-2 ring-primary" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Step {step.stepNumber}</Badge>
                <span className="text-xs text-muted-foreground">
                  Send {step.delayDays} day{step.delayDays !== 1 ? "s" : ""} after{" "}
                  {i === 0 ? "trigger" : "previous step"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {step.sentCount !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    Sent: {step.sentCount} | Open: {step.openCount} | Click: {step.clickCount}
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeStep(i)}
                  disabled={steps.length <= 1}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[80px_1fr]">
                <div>
                  <label className="mb-1 block text-xs font-medium">Delay (days)</label>
                  <Input
                    type="number"
                    min="0"
                    value={step.delayDays}
                    onChange={(e) => updateStep(i, "delayDays", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Tone</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={step.tone}
                    onChange={(e) => updateStep(i, "tone", e.target.value)}
                  >
                    {EMAIL_TONES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium">Subject Line</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => improveSubject(i)}
                    disabled={generating !== null}
                    className="h-6 text-xs"
                  >
                    <Sparkles className="mr-1 size-3" /> Improve
                  </Button>
                </div>
                <Input
                  value={step.subject}
                  onChange={(e) => updateStep(i, "subject", e.target.value)}
                  placeholder="Email subject line..."
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium">Email Body (HTML)</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => generateEmail(i)}
                    disabled={generating !== null}
                    className="h-6 text-xs"
                  >
                    <Sparkles className="mr-1 size-3" />
                    {generating === i ? "Generating..." : "Generate with AI"}
                  </Button>
                </div>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                  rows={8}
                  value={step.bodyHtml}
                  onChange={(e) => updateStep(i, "bodyHtml", e.target.value)}
                  placeholder="<p>Hi [contactName],</p>..."
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreviewStep(i)}
                className="text-xs"
              >
                Preview this step
              </Button>
            </CardContent>
          </Card>
        ))}

        <Button type="button" variant="outline" onClick={addStep} className="w-full">
          <Plus className="mr-1 size-3" /> Add Step
        </Button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : initial?.id ? "Save Changes" : "Create Sequence"}
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </div>

      {/* Right — Preview */}
      <div className="space-y-4">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="text-sm">Email Preview — Step {previewStep + 1}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="bg-card px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-primary">RB Studio</span>
              </div>
              <div className="bg-card">
                <EmailPreviewFrame
                  html={steps[previewStep]?.bodyHtml ?? ""}
                  subject={steps[previewStep]?.subject ?? ""}
                />
              </div>
              <div className="border-t border-border bg-card px-4 py-2 text-center">
                <span className="text-[10px] text-muted-foreground">RB Architecture Concrete Studio</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
