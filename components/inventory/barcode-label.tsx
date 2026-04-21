"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

type Props = {
  value: string;
  name: string;
  sku?: string | null;
  width?: number;
  height?: number;
  showText?: boolean;
};

export function BarcodeLabel({
  value,
  name,
  sku,
  width = 2,
  height = 40,
  showText = true,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue: showText,
          fontSize: 12,
          margin: 4,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch {
        // Invalid barcode value — show fallback
      }
    }
  }, [value, width, height, showText]);

  return (
    <div className="flex flex-col items-center">
      <p className="mb-0.5 text-xs font-semibold leading-tight text-black">{name}</p>
      {sku && sku !== value && (
        <p className="mb-0.5 text-[9px] text-gray-600">{sku}</p>
      )}
      <svg ref={svgRef} />
    </div>
  );
}
