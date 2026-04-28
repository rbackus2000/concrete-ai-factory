"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { submitSampleRequestAction } from "../portal-actions";

type Props = {
  defaultName: string;
  defaultFirm: string;
};

export default function SampleRequestForm({ defaultName }: Props) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<{ orderNumber: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-700">
            Request received
          </p>
          <h2 className="font-serif text-2xl">Sample box on the way.</h2>
          <p className="text-sm text-muted-foreground">
            Order <strong>{done.orderNumber}</strong> created. Most boxes ship
            within three to five business days. You&apos;ll get a tracking
            email from your account manager when it&apos;s out the door.
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
                const result = await submitSampleRequestAction({
                  shipToName: String(fd.get("shipToName") || "").trim(),
                  shipToAddress1: String(fd.get("shipToAddress1") || "").trim(),
                  shipToAddress2: String(fd.get("shipToAddress2") || "").trim(),
                  shipToCity: String(fd.get("shipToCity") || "").trim(),
                  shipToState: String(fd.get("shipToState") || "").trim(),
                  shipToZip: String(fd.get("shipToZip") || "").trim(),
                  shipToCountry: String(fd.get("shipToCountry") || "US").trim(),
                  notes: String(fd.get("notes") || "").trim(),
                });
                setDone({ orderNumber: result.orderNumber });
              } catch (err) {
                setError(err instanceof Error ? err.message : "Request failed");
              }
            });
          }}
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="shipToName">Recipient</Label>
              <Input
                id="shipToName"
                name="shipToName"
                required
                defaultValue={defaultName}
                placeholder="Recipient name"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="shipToAddress1">Street address</Label>
              <Input id="shipToAddress1" name="shipToAddress1" required placeholder="Street, P.O. box, etc." />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="shipToAddress2">Apt / suite (optional)</Label>
              <Input id="shipToAddress2" name="shipToAddress2" placeholder="Apt, suite, floor" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipToCity">City</Label>
              <Input id="shipToCity" name="shipToCity" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipToState">State / Region</Label>
              <Input id="shipToState" name="shipToState" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipToZip">Postal code</Label>
              <Input id="shipToZip" name="shipToZip" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipToCountry">Country</Label>
              <Input id="shipToCountry" name="shipToCountry" defaultValue="US" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Anything we should know — finish preferences, project context, deadline?"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Send sample box request →"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
