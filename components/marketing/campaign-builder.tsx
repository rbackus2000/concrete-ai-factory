"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SEGMENT_TYPES } from "@/lib/schemas/marketing";

const SEGMENT_LABELS: Record<string, string> = {
  ALL: "All Contacts",
  STAGE: "By Lead Stage",
  TAG: "By Tag",
  HAS_OPEN_QUOTE: "Has Open Quote",
  HAS_OVERDUE_INVOICE: "Has Overdue Invoice",
  CUSTOM: "Custom",
};

const STAGE_OPTIONS = ["NEW", "CONTACTED", "QUOTED", "NEGOTIATING", "WON", "LOST"];

function CampaignPreviewFrame({ html, subject }: { html: string; subject: string }) {
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
      title="Campaign preview"
      className="h-72 w-full rounded border-0"
      sandbox="allow-same-origin"
    />
  );
}

type CampaignData = {
  id?: string;
  name: string;
  subject: string;
  bodyHtml: string;
  segmentType: string;
  segmentConfig: string;
  recipientCount?: number;
};

export function CampaignBuilder({ initial }: { initial?: CampaignData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml ?? "");
  const [segmentType, setSegmentType] = useState(initial?.segmentType ?? "ALL");
  const [segmentConfig, setSegmentConfig] = useState(initial?.segmentConfig ?? "");
  const [recipientCount] = useState(initial?.recipientCount ?? 0);

  const [showConfirm, setShowConfirm] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");

  async function generateBody() {
    setGenerating(true);
    try {
      const res = await fetch("/api/marketing/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "campaign",
          campaignName: name,
          segmentDescription: SEGMENT_LABELS[segmentType],
          tone: "friendly",
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
        setBodyHtml(text);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function improveSubject() {
    if (!subject) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/marketing/improve-subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, context: `Campaign: ${name}` }),
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
        setSubject(text);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setError("");
    if (!name || !subject || !bodyHtml) {
      setError("Name, subject, and body are required");
      return;
    }

    setLoading(true);
    try {
      const url = initial?.id
        ? `/api/marketing/campaigns/${initial.id}`
        : "/api/marketing/campaigns";

      const res = await fetch(url, {
        method: initial?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, bodyHtml, segmentType, segmentConfig }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save campaign");
        return;
      }

      const { data } = await res.json();
      router.push(`/marketing/campaigns/${data.id}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!initial?.id) {
      await handleSave();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/marketing/campaigns/${initial.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendNow: scheduleMode === "now",
          scheduledAt: scheduleMode === "later" ? scheduledAt : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send campaign");
        return;
      }

      router.push(`/marketing/campaigns/${initial.id}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left — Config */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Campaign Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spring 2026 Product Launch" />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium">Subject Line</label>
                  <Button type="button" variant="ghost" size="sm" onClick={improveSubject} disabled={generating} className="h-6 text-xs">
                    <Sparkles className="mr-1 size-3" /> Improve
                  </Button>
                </div>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject..." />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Audience Segment</label>
                <div className="space-y-2">
                  {SEGMENT_TYPES.map((seg) => (
                    <label key={seg} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="segment"
                        value={seg}
                        checked={segmentType === seg}
                        onChange={(e) => { setSegmentType(e.target.value); setSegmentConfig(""); }}
                      />
                      {SEGMENT_LABELS[seg]}
                    </label>
                  ))}
                </div>
                {segmentType === "STAGE" && (
                  <select
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={segmentConfig}
                    onChange={(e) => setSegmentConfig(e.target.value)}
                  >
                    <option value="">Select stage...</option>
                    {STAGE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
                {segmentType === "TAG" && (
                  <Input
                    className="mt-2"
                    value={segmentConfig}
                    onChange={(e) => setSegmentConfig(e.target.value)}
                    placeholder="Enter tag name..."
                  />
                )}
                {recipientCount > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {recipientCount} contact{recipientCount !== 1 ? "s" : ""} match this segment
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Email Body</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={generateBody} disabled={generating} className="text-xs">
                <Sparkles className="mr-1 size-3" />
                {generating ? "Generating..." : "Generate with AI"}
              </Button>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                rows={12}
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder="<p>Hi [contactName],</p>..."
              />
            </CardContent>
          </Card>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={loading} variant="outline">
              {loading ? "Saving..." : "Save Draft"}
            </Button>
            {initial?.id && (
              <Button onClick={() => setShowConfirm(true)} disabled={loading}>
                Send / Schedule
              </Button>
            )}
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>

        {/* Right — Preview */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-sm">Email Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="bg-card px-4 py-3 border-b border-border">
                  <span className="text-sm font-semibold text-primary">RB Studio</span>
                </div>
                <div className="bg-card">
                  <CampaignPreviewFrame html={bodyHtml} subject={subject} />
                </div>
                <div className="border-t border-border bg-card px-4 py-2 text-center">
                  <span className="text-[10px] text-muted-foreground">RB Architecture Concrete Studio</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Send Campaign</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="schedule"
                  checked={scheduleMode === "now"}
                  onChange={() => setScheduleMode("now")}
                />
                Send Now
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="schedule"
                  checked={scheduleMode === "later"}
                  onChange={() => setScheduleMode("later")}
                />
                Schedule for Later
              </label>
              {scheduleMode === "later" && (
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              )}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {scheduleMode === "now"
                ? "This will send immediately to all matching contacts. This cannot be undone."
                : "Campaign will be sent at the scheduled time."}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={loading || (scheduleMode === "later" && !scheduledAt)}
                variant="destructive"
              >
                {loading ? "Sending..." : scheduleMode === "now" ? "Send Now" : "Schedule"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
