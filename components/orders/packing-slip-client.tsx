"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type PackingSlipOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  orderTotal: number;
  shippingCost: number;
  shipToName: string | null;
  shipToCompany: string | null;
  shipToAddress1: string | null;
  shipToAddress2: string | null;
  shipToCity: string | null;
  shipToState: string | null;
  shipToZip: string | null;
  productionNotes: string | null;
  packingNotes: string | null;
  contact: { name: string; clientNumber?: string } | null;
  lineItems: Array<{
    id: string;
    name: string;
    sku: string | null;
    imageUrl: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function PackingSlipClient({ order }: { order: PackingSlipOrder }) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, order.orderNumber, {
          format: "CODE128",
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 12,
        });
      } catch { /* ignore barcode errors */ }
    }
  }, [order.orderNumber]);

  const subtotal = order.lineItems.reduce((sum, li) => sum + li.lineTotal, 0);

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Print Button */}
      <div className="no-print mb-4 flex justify-end">
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 size-4" /> Print Packing Slip
        </Button>
      </div>

      {/* Packing Slip Content */}
      <div className="mx-auto max-w-3xl bg-white p-8 text-black">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Space Mono, monospace" }}>
              RB Studio
            </h1>
            <p className="mt-1 text-sm text-gray-600">RB Architecture Concrete Studio</p>
            <p className="text-sm text-gray-600">Dallas, TX</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">ORDER {order.orderNumber}</p>
            {order.contact?.clientNumber && (
              <p className="font-mono text-xs" style={{ color: "#c8a96e" }}>Client: RB-{order.contact.clientNumber}</p>
            )}
            <p className="text-sm text-gray-600">{fmtDate(order.createdAt)}</p>
            <div className="mt-2">
              <svg ref={barcodeRef} />
            </div>
          </div>
        </div>

        {/* Ship To */}
        <div className="mt-6 rounded-lg border p-4">
          <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Ship To</p>
          {order.shipToName && <p className="font-semibold">{order.shipToName}</p>}
          {order.shipToCompany && <p>{order.shipToCompany}</p>}
          {order.shipToAddress1 && <p>{order.shipToAddress1}</p>}
          {order.shipToAddress2 && <p>{order.shipToAddress2}</p>}
          {order.shipToCity && (
            <p>{order.shipToCity}, {order.shipToState} {order.shipToZip}</p>
          )}
        </div>

        {/* Items Table */}
        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="py-2 text-left text-xs font-semibold uppercase text-gray-500">Item</th>
              <th className="py-2 text-left text-xs font-semibold uppercase text-gray-500">SKU</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-gray-500">Qty</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-gray-500">Price</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-gray-500">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.lineItems.map((item) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="" className="size-10 rounded object-cover" />
                    )}
                    <span className="font-medium">{item.name}</span>
                  </div>
                </td>
                <td className="py-3 text-sm text-gray-600">{item.sku || "—"}</td>
                <td className="py-3 text-right">{item.quantity}</td>
                <td className="py-3 text-right text-sm">{fmt(item.unitPrice)}</td>
                <td className="py-3 text-right font-medium">{fmt(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 border-t-2 border-gray-300 pt-4">
          <div className="flex justify-end">
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {order.shippingCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>{fmt(order.shippingCost)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 text-base font-bold">
                <span>Total</span>
                <span>{fmt(order.orderTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {(order.productionNotes || order.packingNotes) && (
          <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm">
            {order.packingNotes && (
              <div>
                <p className="font-semibold">Packing Notes</p>
                <p className="whitespace-pre-wrap text-gray-600">{order.packingNotes}</p>
              </div>
            )}
            {order.productionNotes && (
              <div className="mt-2">
                <p className="font-semibold">Production Notes</p>
                <p className="whitespace-pre-wrap text-gray-600">{order.productionNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 border-t pt-6 text-center text-sm text-gray-500">
          <p className="font-semibold text-gray-700">
            Thank you{order.contact?.name ? `, ${order.contact.name}` : ""}! We appreciate your business.
          </p>
          <p className="mt-2">RB Architecture Concrete Studio · rbstudio.com</p>
        </div>
      </div>
    </>
  );
}
