"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Camera, ExternalLink, LogOut, Minus, Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MOVEMENT_REASONS } from "@/lib/schemas/inventory";
import type { InventoryTypeValue } from "@/lib/schemas/inventory";

type FoundItem = {
  id: string;
  name: string;
  type: InventoryTypeValue;
  sku: string | null;
  qtyOnHand: number;
  isLowStock: boolean;
  unit: string | null;
};

type ActiveJob = {
  id: string;
  jobNumber: string;
  status: string;
  quantity: number;
  sku: { code: string; name: string };
  client: { name: string } | null;
};

const MATERIAL_OUT_DESTINATIONS = ["Project", "Shop", "Test"] as const;
type Destination = (typeof MATERIAL_OUT_DESTINATIONS)[number];

export function BarcodeScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState("Initializing camera...");
  const [foundItem, setFoundItem] = useState<FoundItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [manualCode, setManualCode] = useState("");

  // Action mode
  const [actionMode, setActionMode] = useState<"add" | "material-out" | null>(null);

  // Material Out state
  const [destination, setDestination] = useState<Destination | null>(null);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Shared adjustment state
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<string>(MOVEMENT_REASONS[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const lookupBarcode = useCallback(async (code: string) => {
    setNotFound(false);
    setFoundItem(null);
    setActionMode(null);
    setDestination(null);
    setSuccessMsg("");
    setStatus("Looking up...");

    try {
      const res = await fetch(`/api/inventory/barcode/${encodeURIComponent(code)}`);
      if (!res.ok) {
        setNotFound(true);
        setStatus("Item not found");
        return;
      }
      const { data } = await res.json();
      setFoundItem(data);
      setStatus("Item found");
    } catch {
      setStatus("Lookup failed");
    }
  }, []);

  // Load active jobs when "Project" destination is selected
  useEffect(() => {
    if (destination === "Project" && activeJobs.length === 0) {
      setLoadingJobs(true);
      fetch("/api/jobs/active")
        .then((r) => r.json())
        .then(({ data }) => setActiveJobs(data || []))
        .finally(() => setLoadingJobs(false));
    }
  }, [destination, activeJobs.length]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let reader: { reset: () => void } | null = null;
    let mounted = true;

    async function startScanner() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (!mounted || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        setStatus("Point camera at barcode");

        if ("BarcodeDetector" in window) {
          const detector = new (window as any).BarcodeDetector({
            formats: ["code_128", "ean_13", "ean_8", "qr_code", "upc_a", "upc_e"],
          });

          const scan = async () => {
            if (!mounted || !videoRef.current) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                if (code) {
                  await lookupBarcode(code);
                  setTimeout(() => { if (mounted) scan(); }, 3000);
                  return;
                }
              }
            } catch { /* frame read error */ }
            if (mounted) requestAnimationFrame(scan);
          };
          scan();
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/library");
          const zxingReader = new BrowserMultiFormatReader();
          reader = zxingReader;
          zxingReader.decodeFromVideoDevice(
            null,
            videoRef.current,
            async (result) => { if (result && mounted) await lookupBarcode(result.getText()); },
          );
        }
      } catch {
        setStatus("Camera access denied. Use manual entry below.");
      }
    }

    startScanner();
    return () => {
      mounted = false;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (reader) reader.reset();
    };
  }, [lookupBarcode]);

  function resetAction() {
    setActionMode(null);
    setDestination(null);
    setSelectedJobId("");
    setQty("");
    setReason(MOVEMENT_REASONS[0]);
    setNotes("");
    setError("");
    setSuccessMsg("");
  }

  async function handleSubmitAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!foundItem) return;
    setError("");

    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) { setError("Enter a valid quantity"); return; }

    // Build reason and reference based on mode
    let adjustReason = reason;
    let referenceType: string | undefined;
    let referenceId: string | undefined;
    let referenceNumber: string | undefined;

    if (actionMode === "material-out") {
      if (!destination) { setError("Select a destination"); return; }

      if (destination === "Project") {
        if (!selectedJobId) { setError("Select a project"); return; }
        const job = activeJobs.find((j) => j.id === selectedJobId);
        adjustReason = `Production use — ${job?.jobNumber ?? "Job"}`;
        referenceType = "JOB";
        referenceId = selectedJobId;
        referenceNumber = job?.jobNumber;
      } else if (destination === "Shop") {
        adjustReason = "Shop use";
      } else if (destination === "Test") {
        adjustReason = "Test / R&D";
      }
    }

    const qtyChange = actionMode === "add" ? qtyNum : -qtyNum;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${foundItem.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qtyChange,
          reason: adjustReason,
          notes: notes || undefined,
          referenceType,
          referenceId,
          referenceNumber,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed");
        return;
      }

      const { data } = await res.json();
      setFoundItem({ ...foundItem, qtyOnHand: data.qtyAfter, isLowStock: data.isLowStock });
      setSuccessMsg(
        actionMode === "add"
          ? `Added ${qtyNum} — new balance: ${data.qtyAfter}`
          : `Checked out ${qtyNum} to ${destination ?? "stock"} — new balance: ${data.qtyAfter}`,
      );
      setActionMode(null);
      setDestination(null);
      setSelectedJobId("");
      setQty("");
      setNotes("");
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleManualSearch(e: React.FormEvent) {
    e.preventDefault();
    if (manualCode.trim()) lookupBarcode(manualCode.trim());
  }

  const isRawMaterial = foundItem?.type === "RAW_MATERIAL";

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col gap-4">
      {/* Camera */}
      <div className="relative overflow-hidden rounded-lg border border-zinc-700 bg-black">
        <video
          ref={videoRef}
          className="aspect-[4/3] w-full object-cover"
          playsInline
          muted
        />
        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="size-12 text-zinc-600" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-24 w-48 rounded border-2 border-amber-500/60" />
        </div>
        <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-zinc-400">
          {status}
        </div>
      </div>

      {/* Manual entry */}
      <form onSubmit={handleManualSearch} className="flex gap-2">
        <Input
          placeholder="Enter barcode or SKU manually"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="outline" size="sm">Lookup</Button>
      </form>

      {/* Found Item */}
      {foundItem && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">{foundItem.name}</h3>
                {foundItem.sku && <p className="text-sm text-muted-foreground">{foundItem.sku}</p>}
              </div>
              <Badge variant={foundItem.type === "FINISHED_PRODUCT" ? "default" : "secondary"}>
                {foundItem.type === "FINISHED_PRODUCT" ? "Finished" : "Raw Material"}
              </Badge>
            </div>

            <div className="text-center">
              <p className="text-4xl font-bold">{foundItem.qtyOnHand}</p>
              <p className="text-sm text-muted-foreground">
                on hand{foundItem.unit ? ` (${foundItem.unit})` : ""}
              </p>
            </div>

            {foundItem.isLowStock && (
              <div className="rounded-lg bg-red-500/10 p-2 text-center text-sm font-medium text-red-600">
                LOW STOCK WARNING
              </div>
            )}

            {successMsg && (
              <div className="rounded-lg bg-emerald-500/10 p-2 text-center text-sm font-medium text-emerald-600">
                {successMsg}
              </div>
            )}

            {/* ── Action Buttons ── */}
            {!actionMode && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => { resetAction(); setActionMode("add"); }}>
                  <Plus className="mr-1 size-4" /> Add Stock
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => { resetAction(); setActionMode("material-out"); }}
                >
                  <LogOut className="mr-1 size-4" /> Material Out
                </Button>
                <Button variant="outline" onClick={() => router.push(`/inventory/${foundItem.id}`)}>
                  <ExternalLink className="size-4" />
                </Button>
              </div>
            )}

            {/* ── Add Stock Form ── */}
            {actionMode === "add" && (
              <form onSubmit={handleSubmitAdjust} className="space-y-3">
                <p className="text-sm font-medium">Add Stock</p>
                <Input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="Quantity"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  autoFocus
                  inputMode="decimal"
                />
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {MOVEMENT_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? "Saving..." : "Confirm Add"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetAction}>Cancel</Button>
                </div>
              </form>
            )}

            {/* ── Material Out Flow ── */}
            {actionMode === "material-out" && !destination && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Where is this material going?</p>
                <div className="grid grid-cols-3 gap-2">
                  {MATERIAL_OUT_DESTINATIONS.map((d) => (
                    <Button
                      key={d}
                      variant="outline"
                      className="h-16 flex-col gap-1"
                      onClick={() => setDestination(d)}
                    >
                      {d === "Project" && <span className="text-lg">🏗️</span>}
                      {d === "Shop" && <span className="text-lg">🔧</span>}
                      {d === "Test" && <span className="text-lg">🧪</span>}
                      <span className="text-sm font-medium">{d}</span>
                    </Button>
                  ))}
                </div>
                <Button variant="outline" className="w-full" onClick={resetAction}>Cancel</Button>
              </div>
            )}

            {/* ── Project Selector ── */}
            {actionMode === "material-out" && destination === "Project" && !selectedJobId && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Select Project</p>
                {loadingJobs ? (
                  <p className="text-sm text-muted-foreground">Loading active projects...</p>
                ) : activeJobs.length > 0 ? (
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {activeJobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <div>
                          <span className="font-medium">{job.jobNumber}</span>
                          <span className="ml-2 text-muted-foreground">
                            {job.sku.name}
                          </span>
                          {job.client && (
                            <span className="ml-1 text-muted-foreground">
                              — {job.client.name}
                            </span>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{job.status}</Badge>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active projects found.</p>
                )}
                <Button variant="outline" className="w-full" onClick={() => setDestination(null)}>
                  Back
                </Button>
              </div>
            )}

            {/* ── Qty Entry (after destination selected) ── */}
            {actionMode === "material-out" && destination && (destination !== "Project" || selectedJobId) && (
              <form onSubmit={handleSubmitAdjust} className="space-y-3">
                <div className="rounded-lg bg-secondary p-2 text-sm">
                  <span className="font-medium">Checking out to: </span>
                  {destination === "Project" ? (
                    <span>{activeJobs.find((j) => j.id === selectedJobId)?.jobNumber ?? "Project"}</span>
                  ) : (
                    <span>{destination}</span>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Quantity to check out</label>
                  <Input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="0"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    autoFocus
                    inputMode="decimal"
                  />
                </div>
                <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? "Processing..." : "Confirm Checkout"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    if (destination === "Project") setSelectedJobId("");
                    else setDestination(null);
                  }}>
                    Back
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Not found */}
      {notFound && (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Item not found for this barcode.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => router.push("/inventory/new")}>
              Create New Item
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
