"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LEAD_STAGES, LEAD_SOURCES, type LeadStageType } from "@/lib/schemas/contact";

type ContactData = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  source: string;
  tags: string[];
  notes: string;
  stage: LeadStageType;
};

const stageLabels: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTED: "Quoted",
  NEGOTIATING: "Negotiating",
  WON: "Won",
  LOST: "Lost",
};

export function ContactForm({ initial }: { initial?: ContactData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showAddress, setShowAddress] = useState(
    Boolean(initial?.address || initial?.city || initial?.state || initial?.zip),
  );

  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [zip, setZip] = useState(initial?.zip ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [stage, setStage] = useState<LeadStageType>(initial?.stage ?? "NEW");

  const addTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput("");
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  async function handleSave() {
    if (!name || !email) {
      alert("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name, email, phone, company, title,
        address, city, state, zip, source,
        tags, notes, stage,
      };

      const url = initial?.id ? `/api/contacts/${initial.id}` : "/api/contacts";
      const method = initial?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save contact");
        return;
      }

      const { data } = await res.json();
      router.push(`/contacts/${data.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="John Smith" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="john@example.com" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="(555) 123-4567" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Company</label>
              <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} placeholder="Acme Corp" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="VP of Design" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Lead Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
                <option value="">Select source...</option>
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address (collapsible) */}
      <Card>
        <CardHeader>
          <button onClick={() => setShowAddress(!showAddress)} className="flex w-full items-center justify-between">
            <CardTitle>Address</CardTitle>
            <span className="text-xs text-muted-foreground">{showAddress ? "Hide" : "Show"}</span>
          </button>
        </CardHeader>
        {showAddress && (
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="sm:col-span-4">
                <label className="mb-1 block text-sm font-medium">Street Address</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} placeholder="123 Main St" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} placeholder="Houston" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">State</label>
                <input type="text" value={state} onChange={(e) => setState(e.target.value)} className={inputClass} placeholder="TX" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">ZIP</label>
                <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} className={inputClass} placeholder="77001" />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tags & Stage */}
      <Card>
        <CardHeader>
          <CardTitle>Tags & Stage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Tags</label>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(); }
                }}
                className="rounded-lg border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Add tag + Enter"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Stage</label>
            <div className="flex flex-wrap gap-1.5">
              {LEAD_STAGES.map((s) => (
                <Button
                  key={s}
                  variant={stage === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStage(s)}
                >
                  {stageLabels[s]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="Internal notes about this contact..."
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving || !name || !email}>
          <Save className="mr-1.5 size-4" />
          {saving ? "Saving..." : initial?.id ? "Save Changes" : "Create Contact"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </div>
  );
}
