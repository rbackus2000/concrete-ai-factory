"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LogActivityModalProps = {
  contactId: string;
  contactName: string;
  type: "NOTE" | "CALL";
  onClose: () => void;
  onSaved: () => void;
};

const CALL_OUTCOMES = [
  "Spoke with them",
  "Left Voicemail",
  "No Answer",
  "Wrong Number",
];

export function LogActivityModal({
  contactId,
  contactName,
  type,
  onClose,
  onSaved,
}: LogActivityModalProps) {
  const [content, setContent] = useState("");
  const [callOutcome, setCallOutcome] = useState(CALL_OUTCOMES[0]);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSaving(true);
    try {
      const activityContent =
        type === "CALL"
          ? `Call with ${contactName} — ${callOutcome}: ${content}`
          : content;

      const res = await fetch(`/api/contacts/${contactId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content: activityContent }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to log activity");
        return;
      }

      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle>{type === "CALL" ? "Log Call" : "Log Note"}</CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {type === "CALL" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">Who you spoke with</label>
                  <input
                    type="text"
                    value={contactName}
                    readOnly
                    className="w-full rounded-lg border bg-secondary px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Call Outcome</label>
                  <select
                    value={callOutcome}
                    onChange={(e) => setCallOutcome(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {CALL_OUTCOMES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">
                {type === "CALL" ? "Call Summary" : "What happened?"}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={type === "CALL" ? "Summarize the call..." : "Write your note..."}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={saving || !content.trim()}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
