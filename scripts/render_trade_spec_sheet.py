#!/usr/bin/env python3
"""Render a single-page Trade Spec Sheet PDF for a SKU.

Usage:
    python3 render_trade_spec_sheet.py < payload.json > spec.pdf

Payload schema:
    {
      "code": str, "name": str, "category": str, "finish": str,
      "categoryLabel": str,
      "subtitle": str | None,
      "heroImagePath": str | None,         # absolute path to a temp image file
      "dimensions": {                       # all values may be null
        "outer": {"length": num, "width": num, "height": num},
        "inner": {"length": num, "width": num, "depth": num},
        "weightLbs": {"min": num, "max": num},
        "drainDiameter": num, "drainType": str,
        "mountType": str
      },
      "finishes": {"family": str, "colors": [str, ...], "sealer": str},
      "leadTime": str,
      "pricing": {"retail": num | None, "tradePct": num, "trade": num | None},
      "productUrl": str,
      "tradeContact": str,
      "generatedAt": "YYYY-MM-DD",
      "validThrough": "YYYY-MM-DD"
    }

The renderer is forgiving — any missing field is skipped or shown as "—".
"""

import json
import os
import sys
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepInFrame,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

INK = colors.HexColor("#0f172a")
SUBTLE = colors.HexColor("#475569")
LINE = colors.HexColor("#cbd5e1")
ACCENT = colors.HexColor("#a76a3f")  # warm terracotta-ish, matches BDC palette


def num_or_dash(value, fmt="{:g}"):
    if value is None:
        return "—"
    try:
        return fmt.format(float(value))
    except (TypeError, ValueError):
        return "—"


def money_or_dash(value):
    if value is None:
        return "—"
    try:
        return "${:,.2f}".format(float(value))
    except (TypeError, ValueError):
        return "—"


def build_styles():
    base = getSampleStyleSheet()
    styles = {
        "header_brand": ParagraphStyle(
            name="HeaderBrand",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=0,
        ),
        "header_meta": ParagraphStyle(
            name="HeaderMeta",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=SUBTLE,
            alignment=TA_RIGHT,
            spaceAfter=0,
        ),
        "sku_code": ParagraphStyle(
            name="SkuCode",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=12,
            textColor=ACCENT,
            spaceAfter=2,
        ),
        "sku_name": ParagraphStyle(
            name="SkuName",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=INK,
            spaceAfter=2,
        ),
        "sku_sub": ParagraphStyle(
            name="SkuSub",
            parent=base["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=11,
            leading=14,
            textColor=SUBTLE,
            spaceAfter=12,
        ),
        "section_h": ParagraphStyle(
            name="SectionH",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=ACCENT,
            spaceAfter=6,
            spaceBefore=4,
        ),
        "body": ParagraphStyle(
            name="Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=INK,
            spaceAfter=2,
        ),
        "kv_label": ParagraphStyle(
            name="KVLabel",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=SUBTLE,
        ),
        "kv_value": ParagraphStyle(
            name="KVValue",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=INK,
        ),
        "price_retail": ParagraphStyle(
            name="PriceRetail",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=SUBTLE,
        ),
        "price_trade": ParagraphStyle(
            name="PriceTrade",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=INK,
        ),
        "footer": ParagraphStyle(
            name="Footer",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=SUBTLE,
            alignment=TA_CENTER,
        ),
        "muted": ParagraphStyle(
            name="Muted",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=SUBTLE,
        ),
    }
    return styles


def kv_table(rows, styles, col_widths=(1.0 * inch, 2.4 * inch)):
    """Render label/value rows as a compact table."""
    data = [
        [
            Paragraph(label, styles["kv_label"]),
            Paragraph(value, styles["kv_value"]),
        ]
        for label, value in rows
    ]
    t = Table(data, colWidths=col_widths)
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return t


def build_dimensions_rows(dims):
    if not dims:
        return [("Dimensions", "Available on request")]
    rows = []
    outer = dims.get("outer") or {}
    if outer:
        rows.append(
            (
                "Outer",
                "{} × {} × {} in".format(
                    num_or_dash(outer.get("length")),
                    num_or_dash(outer.get("width")),
                    num_or_dash(outer.get("height")),
                ),
            )
        )
    inner = dims.get("inner")
    if inner:
        rows.append(
            (
                dims.get("innerLabel") or "Inner",
                "{} × {} × {} in".format(
                    num_or_dash(inner.get("length")),
                    num_or_dash(inner.get("width")),
                    num_or_dash(inner.get("depth")),
                ),
            )
        )
    weight = dims.get("weightLbs")
    if weight:
        wmin = weight.get("min")
        wmax = weight.get("max")
        if wmin is not None and wmax is not None and wmin != wmax:
            rows.append(("Weight", "{:g}–{:g} lbs".format(wmin, wmax)))
        elif wmin is not None:
            rows.append(("Weight", "{:g} lbs".format(wmin)))
    if dims.get("drainDiameter"):
        rows.append(
            (
                "Drain",
                "{}\" {}".format(
                    num_or_dash(dims.get("drainDiameter")),
                    (dims.get("drainType") or "").lower(),
                ).strip(),
            )
        )
    if dims.get("mountType"):
        rows.append(("Mount", str(dims["mountType"]).replace("_", " ").title()))
    if dims.get("hasOverflow"):
        rows.append(("Overflow", "Yes"))
    return rows or [("Dimensions", "Available on request")]


def render(payload):
    styles = build_styles()
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=LETTER,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
        title="Trade Spec Sheet — {}".format(payload.get("code", "")),
        author="Backus Design Co",
    )

    story = []

    # ── Header bar ──
    header = Table(
        [
            [
                Paragraph("BACKUS DESIGN CO  ·  Trade Spec Sheet", styles["header_brand"]),
                Paragraph(
                    "Generated {}".format(payload.get("generatedAt", "")),
                    styles["header_meta"],
                ),
            ]
        ],
        colWidths=[5.0 * inch, 2.3 * inch],
    )
    header.setStyle(
        TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)])
    )
    story.append(header)
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=0.5, color=LINE))
    story.append(Spacer(1, 14))

    # ── Title block ──
    story.append(
        Paragraph(
            "{} · {}".format(payload.get("code", ""), payload.get("categoryLabel", "")),
            styles["sku_code"],
        )
    )
    story.append(Paragraph(payload.get("name", "—"), styles["sku_name"]))
    if payload.get("subtitle"):
        story.append(Paragraph(payload["subtitle"], styles["sku_sub"]))
    else:
        story.append(Spacer(1, 6))

    # ── Hero image (optional) ──
    hero_path = payload.get("heroImagePath")
    if hero_path and os.path.exists(hero_path):
        try:
            img = Image(hero_path)
            # Scale to a target width while preserving aspect ratio
            target_w = 4.5 * inch
            ratio = target_w / img.imageWidth
            img.drawWidth = target_w
            img.drawHeight = img.imageHeight * ratio
            # Cap height to keep page balanced
            if img.drawHeight > 3.0 * inch:
                cap = 3.0 * inch
                shrink = cap / img.drawHeight
                img.drawHeight = cap
                img.drawWidth = img.drawWidth * shrink
            story.append(img)
            story.append(Spacer(1, 14))
        except Exception:
            pass  # Bad image → skip silently

    # ── Two-column body: dims+finish on left, lead+price on right ──
    dims_rows = build_dimensions_rows(payload.get("dimensions"))
    finishes = payload.get("finishes") or {}
    finish_color_text = ""
    if finishes.get("colors"):
        family = finishes.get("family") or "Available"
        finish_color_text = "<b>{} palette ({} colors):</b><br/>{}".format(
            family,
            len(finishes["colors"]),
            "  ·  ".join(finishes["colors"]),
        )
    sealer_text = (
        "<b>Sealer:</b> {}".format(finishes.get("sealer", "Food-safe penetrating sealer · 4 finishes"))
    )

    pricing = payload.get("pricing") or {}
    lead_time = payload.get("leadTime") or "Lead time available on request"

    left_col = []
    left_col.append(Paragraph("DIMENSIONS", styles["section_h"]))
    left_col.append(kv_table(dims_rows, styles, col_widths=(1.0 * inch, 2.4 * inch)))
    left_col.append(Spacer(1, 12))
    left_col.append(Paragraph("FINISHES", styles["section_h"]))
    if finish_color_text:
        left_col.append(Paragraph(finish_color_text, styles["body"]))
        left_col.append(Spacer(1, 4))
    left_col.append(Paragraph(sealer_text, styles["body"]))

    right_col = []
    right_col.append(Paragraph("LEAD TIME", styles["section_h"]))
    right_col.append(Paragraph(lead_time, styles["body"]))
    right_col.append(Spacer(1, 14))
    right_col.append(
        Paragraph(
            "TRADE PRICING ({}% off)".format(int(pricing.get("tradePct", 15))),
            styles["section_h"],
        )
    )
    pricing_rows = [
        (
            "Retail",
            Paragraph(money_or_dash(pricing.get("retail")), styles["price_retail"]),
        ),
        (
            "Trade",
            Paragraph(money_or_dash(pricing.get("trade")), styles["price_trade"]),
        ),
    ]
    pricing_table = Table(
        [
            [
                Paragraph(label, styles["kv_label"]),
                value,
            ]
            for label, value in pricing_rows
        ],
        colWidths=[0.9 * inch, 2.0 * inch],
    )
    pricing_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LINEABOVE", (0, 0), (-1, 0), 0.5, LINE),
            ]
        )
    )
    right_col.append(pricing_table)
    right_col.append(Spacer(1, 6))
    right_col.append(
        Paragraph(
            "<i>Pricing valid through {}.</i>".format(payload.get("validThrough", "—")),
            styles["muted"],
        )
    )

    # Wrap each column in a frame so they align side-by-side.
    body_table = Table(
        [
            [
                KeepInFrame(3.5 * inch, 4.5 * inch, left_col, mode="shrink"),
                KeepInFrame(3.4 * inch, 4.5 * inch, right_col, mode="shrink"),
            ]
        ],
        colWidths=[3.7 * inch, 3.6 * inch],
    )
    body_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(body_table)
    story.append(Spacer(1, 18))

    # ── Care + warranty ──
    story.append(Paragraph("CARE & WARRANTY", styles["section_h"]))
    story.append(
        Paragraph(
            "Sealed glass-fiber-reinforced concrete (GFRC). Clean with mild soap and water — no abrasives or acids. "
            "Re-seal every 12–18 months for high-traffic surfaces. Lifetime structural warranty against manufacturing defects.",
            styles["body"],
        )
    )

    # ── Footer ──
    story.append(Spacer(1, 18))
    story.append(HRFlowable(width="100%", thickness=0.5, color=LINE))
    story.append(Spacer(1, 6))
    footer_lines = []
    if payload.get("productUrl"):
        footer_lines.append(payload["productUrl"])
    if payload.get("tradeContact"):
        footer_lines.append(payload["tradeContact"])
    if footer_lines:
        story.append(Paragraph("  ·  ".join(footer_lines), styles["footer"]))

    doc.build(story)
    return buf.getvalue()


def main():
    raw = sys.stdin.read()
    if not raw.strip():
        sys.stderr.write("render_trade_spec_sheet: empty payload on stdin\n")
        sys.exit(1)
    payload = json.loads(raw)
    pdf = render(payload)
    sys.stdout.buffer.write(pdf)


if __name__ == "__main__":
    main()
