"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Camera, CheckCircle2, AlertTriangle, Package, Truck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LineItem = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  imageUrl: string | null;
  quantity: number;
  qtyVerified: number;
  isVerified: boolean;
};

type VerifyOrder = {
  id: string;
  orderNumber: string;
  lineItems: LineItem[];
};

export function VerifyOrderClient({ order }: { order: VerifyOrder }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<LineItem[]>(order.lineItems);
  const [scanResult, setScanResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [manualCode, setManualCode] = useState("");
  const lastScanRef = useRef("");

  const verifiedCount = items.filter((i) => i.isVerified).length;
  const totalCount = items.length;
  const allVerified = verifiedCount === totalCount && totalCount > 0;

  const playSound = useCallback((type: "success" | "error") => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = type === "success" ? 800 : 300;
      osc.type = type === "success" ? "sine" : "square";
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + (type === "success" ? 0.15 : 0.3));
    } catch { /* audio not available */ }
  }, []);

  const handleScan = useCallback(async (code: string) => {
    if (code === lastScanRef.current) return;
    lastScanRef.current = code;
    setTimeout(() => { lastScanRef.current = ""; }, 2000);

    // Find matching item by barcode or sku
    const match = items.find(
      (i) => !i.isVerified && (i.barcode === code || i.sku === code),
    );

    if (!match) {
      setScanResult({ type: "error", message: "This item is not in this order" });
      playSound("error");
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    try {
      const res = await fetch(`/api/orders/${order.id}/verify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItemId: match.id, qtyScanned: 1 }),
      });

      if (!res.ok) {
        setScanResult({ type: "error", message: "Failed to verify item" });
        playSound("error");
        return;
      }

      const { data } = await res.json();
      setItems((prev) =>
        prev.map((i) =>
          i.id === match.id
            ? { ...i, qtyVerified: data.qtyVerified, isVerified: data.isVerified }
            : i,
        ),
      );
      setScanResult({ type: "success", message: `Verified: ${match.name}` });
      playSound("success");
      setTimeout(() => setScanResult(null), 2000);
    } catch {
      setScanResult({ type: "error", message: "Network error" });
      playSound("error");
    }
  }, [items, order.id, playSound]);

  async function handleManualVerify(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    try {
      const res = await fetch(`/api/orders/${order.id}/verify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItemId: itemId, qtyScanned: item.quantity - item.qtyVerified }),
      });

      if (!res.ok) return;
      const { data } = await res.json();
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, qtyVerified: data.qtyVerified, isVerified: data.isVerified }
            : i,
        ),
      );
      playSound("success");
    } catch { /* ignore */ }
  }

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

        if ("BarcodeDetector" in window) {
          const detector = new (window as any).BarcodeDetector({
            formats: ["code_128", "ean_13", "ean_8", "qr_code", "upc_a", "upc_e"],
          });

          const scan = async () => {
            if (!mounted || !videoRef.current) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                await handleScan(barcodes[0].rawValue);
                setTimeout(() => { if (mounted) scan(); }, 2000);
                return;
              }
            } catch { /* frame error */ }
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
            async (result) => { if (result && mounted) await handleScan(result.getText()); },
          );
        }
      } catch {
        // Camera not available — manual entry only
      }
    }

    startScanner();
    return () => {
      mounted = false;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (reader) reader.reset();
    };
  }, [handleScan]);

  function handleManualSearch(e: React.FormEvent) {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
      setManualCode("");
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Scan to Verify</h1>
          <p className="text-sm text-muted-foreground">{order.orderNumber}</p>
        </div>
        <Link href={`/orders/${order.id}`}>
          <Button variant="outline" size="sm">Back to Order</Button>
        </Link>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{verifiedCount} of {totalCount} items verified</span>
          <span className="text-muted-foreground">{totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full transition-all ${allVerified ? "bg-emerald-500" : "bg-primary"}`}
            style={{ width: `${totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* All Verified Banner */}
      {allVerified && (
        <div className="rounded-lg bg-emerald-100 p-4 text-center">
          <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-700" />
          <p className="text-lg font-bold text-emerald-700">All Items Verified!</p>
          <p className="mt-1 text-sm text-emerald-600">Order is ready to ship.</p>
          <Link href={`/orders/${order.id}/ship`}>
            <Button className="mt-3">
              <Truck className="mr-1 size-4" /> Proceed to Ship
            </Button>
          </Link>
        </div>
      )}

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
          Scan item barcode to verify
        </div>
      </div>

      {/* Scan Result Flash */}
      {scanResult && (
        <div className={`rounded-lg p-3 text-center text-sm font-medium ${
          scanResult.type === "success"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-red-100 text-red-700"
        }`}>
          {scanResult.type === "success" ? (
            <CheckCircle2 className="mx-auto mb-1 size-5" />
          ) : (
            <AlertTriangle className="mx-auto mb-1 size-5" />
          )}
          {scanResult.message}
        </div>
      )}

      {/* Manual entry */}
      <form onSubmit={handleManualSearch} className="flex gap-2">
        <Input
          placeholder="Enter barcode or SKU manually"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="outline" size="sm">Scan</Button>
      </form>

      {/* Items Checklist */}
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id} className={item.isVerified ? "border-emerald-300 bg-emerald-50/50" : ""}>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded">
                {item.isVerified ? (
                  <CheckCircle2 className="size-8 text-emerald-600" />
                ) : item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="size-10 rounded object-cover" />
                ) : (
                  <Package className="size-8 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${item.isVerified ? "text-emerald-700" : ""}`}>{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.sku && <span>{item.sku} · </span>}
                  Qty: {item.quantity}
                  {item.qtyVerified > 0 && !item.isVerified && (
                    <span className="ml-1 text-amber-600">({item.qtyVerified} scanned)</span>
                  )}
                </p>
              </div>
              {item.isVerified ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleManualVerify(item.id)}
                >
                  Mark Verified
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
