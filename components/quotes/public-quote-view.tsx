"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Package,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LineItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
  unitPrice: number;
  quantity: number;
  discount: number;
  lineTotal: number;
  customerCanEditQty: boolean;
  customerCanRemove: boolean;
  isOptional: boolean;
  isSelected: boolean;
};

type PublicQuote = {
  id: string;
  quoteNumber: string;
  status: string;
  contactName: string;
  companyName: string | null;
  clientNumber: string | null;
  customerMessage: string | null;
  terms: string | null;
  validUntil: string | null;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  signedAt: string | null;
  signerName: string | null;
  lineItems: LineItem[];
};

export function PublicQuoteView({ quote }: { quote: PublicQuote }) {
  const [items, setItems] = useState<LineItem[]>(quote.lineItems);
  const [termsOpen, setTermsOpen] = useState(false);

  // Signature state
  const [signerName, setSignerName] = useState("");
  const [signatureMode, setSignatureMode] = useState<"type" | "draw">("type");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(!!quote.signedAt);

  // Canvas ref for draw signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const isSigned = quote.status === "SIGNED" || quote.status === "CONVERTED";

  // Recalculate totals when optional items toggled
  const totals = useMemo(() => {
    const subtotal = items
      .filter((item) => !item.isOptional || item.isSelected)
      .reduce((sum, item) => {
        return sum + item.unitPrice * item.quantity * (1 - item.discount / 100);
      }, 0);
    const afterDiscount = subtotal - quote.discountAmount;
    const taxAmount = afterDiscount * (quote.taxRate / 100);
    const total = afterDiscount + taxAmount;
    return { subtotal, taxAmount, total };
  }, [items, quote.discountAmount, quote.taxRate]);

  function toggleOptional(itemId: string) {
    if (isSigned) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, isSelected: !item.isSelected } : item,
      ),
    );
  }

  // Canvas drawing setup
  useEffect(() => {
    if (signatureMode !== "draw" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    function getPos(e: MouseEvent | TouchEvent) {
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function onStart(e: MouseEvent | TouchEvent) {
      isDrawing.current = true;
      lastPos.current = getPos(e);
    }

    function onMove(e: MouseEvent | TouchEvent) {
      if (!isDrawing.current || !ctx) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
    }

    function onEnd() {
      isDrawing.current = false;
    }

    canvas.addEventListener("mousedown", onStart);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onEnd);
    canvas.addEventListener("mouseleave", onEnd);
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd);

    return () => {
      canvas.removeEventListener("mousedown", onStart);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onEnd);
      canvas.removeEventListener("mouseleave", onEnd);
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, [signatureMode]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function handleSign() {
    if (!signerName || !agreedToTerms) return;

    let signatureData: string;
    if (signatureMode === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      signatureData = canvas.toDataURL("image/png");
    } else {
      // Generate typed signature as data URL via canvas
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 600;
      tempCanvas.height = 120;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 600, 120);
      ctx.font = '48px "Dancing Script", cursive';
      ctx.fillStyle = "#0a0a0a";
      ctx.textBaseline = "middle";
      ctx.fillText(signerName, 20, 60);
      signatureData = tempCanvas.toDataURL("image/png");
    }

    setSigning(true);
    try {
      const selectedItemIds = items
        .filter((item) => item.isOptional && item.isSelected)
        .map((item) => item.id);

      const res = await fetch(`/api/quotes/${quote.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName,
          signatureData,
          agreedToTerms: true,
          selectedItems: selectedItemIds,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to sign quote");
        return;
      }

      setSigned(true);
    } finally {
      setSigning(false);
    }
  }

  const canSign =
    signerName.trim().length > 0 && agreedToTerms && !signing && !isSigned;

  // ── Already signed success screen ──────────────────────────
  if (signed && !isSigned) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-8 text-emerald-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            Thank you, {signerName}!
          </h1>
          <p className="mb-1 text-muted-foreground">
            Your quote has been signed successfully.
          </p>
          <p className="text-sm text-muted-foreground">
            We&apos;ll be in touch shortly to discuss next steps.
          </p>
          <div className="mt-6">
            <img src="/rb-studio-logo.png" alt="RB Architecture Concrete Studio" className="mx-auto h-12" />
          </div>
        </div>
      </div>
    );
  }

  // ── Main quote view ────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between rounded-xl border bg-card p-5 shadow-panel">
          <img src="/rb-studio-logo.png" alt="RB Architecture Concrete Studio" className="h-16" />
          <Badge variant="secondary">{quote.quoteNumber}</Badge>
        </div>
        {/* Customer header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">
            Quote for {quote.contactName}
          </h1>
          {quote.companyName && (
            <p className="text-muted-foreground">{quote.companyName}</p>
          )}
          {quote.clientNumber && (
            <p className="font-mono text-xs" style={{ color: "#c8a96e" }}>Client: RB-{quote.clientNumber}</p>
          )}
          {quote.validUntil && (
            <p className="mt-1 text-sm text-muted-foreground">
              Valid until{" "}
              {new Date(quote.validUntil).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {/* Customer message */}
        {quote.customerMessage && (
          <div className="mb-6 rounded-lg border border-border bg-white p-4 text-sm text-foreground">
            {quote.customerMessage}
          </div>
        )}

        {/* Line Items */}
        <div className="mb-6 overflow-hidden rounded-lg border border-border bg-white">
          <div className="border-b bg-muted/50 px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">Items</h2>
          </div>
          <div className="divide-y">
            {items.map((item) => {
              const isActive = !item.isOptional || item.isSelected;
              const lineTotal =
                item.unitPrice * item.quantity * (1 - item.discount / 100);

              return (
                <div
                  key={item.id}
                  className={`px-5 py-4 transition-opacity ${
                    isActive ? "" : "opacity-50"
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Image */}
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="size-[80px] shrink-0 rounded-lg bg-secondary object-cover sm:size-[120px]"
                      />
                    ) : (
                      <div className="flex size-[80px] shrink-0 items-center justify-center rounded-lg bg-secondary sm:size-[120px]">
                        <Package className="size-8 text-zinc-300" />
                      </div>
                    )}

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                          {item.category && (
                            <span className="mt-1 inline-block rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                              {item.category.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-foreground">
                            ${lineTotal.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${item.unitPrice.toFixed(2)} x {item.quantity}
                            {item.discount > 0 && ` (-${item.discount}%)`}
                          </p>
                        </div>
                      </div>

                      {/* Optional toggle */}
                      {item.isOptional && !isSigned && (
                        <button
                          onClick={() => toggleOptional(item.id)}
                          className={`mt-2 inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                            item.isSelected
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-border bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          {item.isSelected ? (
                            <>
                              <CheckCircle2 className="size-3" />
                              Included
                            </>
                          ) : (
                            "Add to Quote"
                          )}
                        </button>
                      )}
                      {item.isOptional && isSigned && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                          Optional
                          {item.isSelected ? " — Included" : " — Declined"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="border-t bg-muted/50 px-5 py-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">
                ${totals.subtotal.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            {quote.discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount</span>
                <span>
                  -$
                  {quote.discountAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            {quote.taxRate > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({quote.taxRate}%)</span>
                <span>
                  ${totals.taxAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="text-lg font-bold text-foreground">Total</span>
              <span className="text-lg font-bold text-foreground">
                ${totals.total.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Terms */}
        {quote.terms && (
          <div className="mb-6 rounded-lg border border-border bg-white">
            <button
              onClick={() => setTermsOpen(!termsOpen)}
              className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-foreground"
            >
              Terms & Conditions
              {termsOpen ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>
            {termsOpen && (
              <div className="border-t px-5 py-3 text-sm text-muted-foreground whitespace-pre-wrap">
                {quote.terms}
              </div>
            )}
          </div>
        )}

        {/* Already signed banner */}
        {isSigned && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
            <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-600" />
            <p className="font-semibold text-emerald-800">
              This quote was signed by {quote.signerName}
            </p>
            {quote.signedAt && (
              <p className="text-sm text-emerald-600">
                on{" "}
                {new Date(quote.signedAt).toLocaleDateString("en-US", {
                  dateStyle: "long",
                })}
              </p>
            )}
          </div>
        )}

        {/* E-Sign Section */}
        {!isSigned && !signed && (
          <div className="rounded-lg border border-border bg-white p-6">
            <h2 className="mb-1 text-lg font-bold text-foreground">
              Approve & Sign This Quote
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              By signing below, you approve{" "}
              {items.filter((i) => !i.isOptional || i.isSelected).length} item
              {items.filter((i) => !i.isOptional || i.isSelected).length !== 1
                ? "s"
                : ""}{" "}
              for a total of{" "}
              <strong>
                $
                {totals.total.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </strong>
              .
            </p>

            {/* Full Name */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-foreground">
                Full Name *
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Signature Tabs */}
            <div className="mb-4">
              <div className="mb-3 flex gap-1 rounded-lg bg-secondary p-1">
                <button
                  onClick={() => setSignatureMode("type")}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    signatureMode === "type"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Type Signature
                </button>
                <button
                  onClick={() => setSignatureMode("draw")}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    signatureMode === "draw"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Draw Signature
                </button>
              </div>

              {signatureMode === "type" ? (
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50">
                  {signerName ? (
                    <span
                      className="text-3xl text-foreground"
                      style={{ fontFamily: "'Dancing Script', cursive" }}
                    >
                      {signerName}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Your signature will appear here
                    </span>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    className="h-32 w-full cursor-crosshair rounded-lg border-2 border-dashed border-border bg-muted/50 touch-none"
                  />
                  <button
                    onClick={clearCanvas}
                    className="absolute right-2 top-2 rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary/80"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Agreement checkbox */}
            <label className="mb-5 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 size-4 rounded border-border"
              />
              <span className="text-sm text-muted-foreground">
                I agree to the terms and conditions outlined in this quote
              </span>
            </label>

            {/* Sign button */}
            <Button
              onClick={handleSign}
              disabled={!canSign}
              className="w-full py-3"
            >
              {signing ? "Signing..." : "Approve & Sign"}
            </Button>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 flex justify-center">
          <img src="/rb-studio-logo.png" alt="RB Architecture Concrete Studio" className="h-10 opacity-60" />
        </footer>
      </div>
    </div>
  );
}
