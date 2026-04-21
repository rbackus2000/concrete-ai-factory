import { Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { LineItemValues } from "@/lib/schemas/quote";

type PreviewData = {
  quoteNumber: string;
  contactName: string;
  companyName: string;
  customerMessage: string;
  terms: string;
  validUntil: string;
  lineItems: LineItemValues[];
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
};

export function QuotePreview({ data }: { data: PreviewData }) {
  return (
    <div className="text-[11px]">
      {/* Header */}
      <div className="border-b bg-secondary/50 px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            RB Studio
          </span>
          <Badge variant="secondary" className="text-[10px]">{data.quoteNumber}</Badge>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-4">
        {/* Customer */}
        <div>
          <p className="font-semibold text-xs text-foreground">
            {data.contactName || "Customer Name"}
          </p>
          {data.companyName && (
            <p className="text-muted-foreground">{data.companyName}</p>
          )}
        </div>

        {/* Message */}
        {data.customerMessage && (
          <div className="rounded-lg bg-secondary/40 px-3 py-2 text-muted-foreground">
            {data.customerMessage}
          </div>
        )}

        {/* Line items */}
        {data.lineItems.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-1 font-medium">Item</th>
                <th className="pb-1 text-right font-medium">Qty</th>
                <th className="pb-1 text-right font-medium">Price</th>
                <th className="pb-1 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.lineItems.map((item, i) => {
                const total =
                  item.unitPrice * item.quantity * (1 - item.discount / 100);
                return (
                  <tr key={i}>
                    <td className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        {item.isOptional && (
                          <Badge variant="warning" className="text-[9px] px-1 py-0">
                            Optional
                          </Badge>
                        )}
                        <span className="font-medium text-foreground">
                          {item.name || "Untitled"}
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 text-right">{item.quantity}</td>
                    <td className="py-1.5 text-right">
                      ${item.unitPrice.toFixed(2)}
                      {item.discount > 0 && (
                        <span className="ml-0.5 text-destructive">
                          -{item.discount}%
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-right font-medium">
                      ${total.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-4 text-center text-muted-foreground">No items</div>
        )}

        {/* Totals */}
        {data.lineItems.length > 0 && (
          <div className="space-y-1 border-t pt-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${data.subtotal.toFixed(2)}</span>
            </div>
            {data.discountAmount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Discount</span>
                <span>-${data.discountAmount.toFixed(2)}</span>
              </div>
            )}
            {data.taxRate > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({data.taxRate}%)</span>
                <span>${data.taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 text-xs font-bold">
              <span>Total</span>
              <span>${data.total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Valid until */}
        {data.validUntil && (
          <p className="text-muted-foreground">
            Valid until{" "}
            {new Date(data.validUntil + "T00:00:00").toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}

        {/* Terms preview */}
        {data.terms && (
          <div className="rounded-lg border px-3 py-2 text-muted-foreground">
            <p className="mb-0.5 font-medium text-foreground">Terms & Conditions</p>
            <p className="line-clamp-3">{data.terms}</p>
          </div>
        )}
      </div>
    </div>
  );
}
