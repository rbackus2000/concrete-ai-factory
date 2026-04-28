"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { submitQuoteRequestAction } from "../../portal-actions";

export default function QuoteRequestForm() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-700">
            Sent
          </p>
          <h2 className="font-serif text-2xl">Quote request received.</h2>
          <p className="text-sm text-muted-foreground">
            Your account manager will respond within one business day with a
            fixed quote at your trade pricing.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await submitQuoteRequestAction({
                  projectName: String(fd.get("projectName") || "").trim(),
                  projectType: String(fd.get("projectType") || "").trim(),
                  shipByDate: String(fd.get("shipByDate") || "").trim(),
                  pieces: String(fd.get("pieces") || "").trim(),
                  notes: String(fd.get("notes") || "").trim(),
                });
                setDone(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Request failed");
              }
            });
          }}
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="projectName">Project name</Label>
              <Input
                id="projectName"
                name="projectName"
                required
                placeholder="e.g. Hayes Residence — Master Bath"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectType">Project type</Label>
              <Input
                id="projectType"
                name="projectType"
                required
                placeholder="Residential / Hospitality / Commercial / …"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipByDate">Need by (optional)</Label>
              <Input
                id="shipByDate"
                name="shipByDate"
                type="date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pieces">Pieces / SKUs</Label>
            <Textarea
              id="pieces"
              name="pieces"
              required
              rows={5}
              placeholder={`One per line. Include SKU code if you know it.\n\nExample:\nS1-EROSION × 2 — Pewter\nT4-MONOLITH × 60 sq ft — Linen\nCustom 30" vanity slab × 1`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Project notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Mounting, finish family, install context, anything else."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send quote request →"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
