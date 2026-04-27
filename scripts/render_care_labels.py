"""Render print-ready care kit labels (PDF).

Reads JSON spec from stdin, writes PDF bytes to stdout.

Spec format:
  {
    "mode": "sheet" | "single",
    "side": "front" | "back",
    "labels": [
      { "sku": "...", "name": "...", "tagline": "...", "size": "...",
        "shape": "rect" | "round",
        "instructions": ["...", "..."],
        "ingredients": "...",
        "qr_url": "https://..." }
    ]
  }

Sides:
  - "front": brand wordmark + product name + tagline + SKU/size (label v1).
  - "back": usage instructions, ingredients/cautions, website, QR code.
  Back labels render as rectangles even for round products — apply to the
  side of the tin or the bottom of the jar.

Modes:
  - "sheet": tiles the first label onto an Avery 5163-style sheet (10 labels
    per US Letter, 2" x 4"). Use to print a full sheet of one product.
  - "single": one label per page at actual size with crop marks. Use for
    proofing, mixed-product runs, or one-off prints.
"""

import json
import sys
from io import BytesIO

from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas


# Brand palette — matches storefront CSS vars.
INK = colors.HexColor("#1a1a1a")
INK_2 = colors.HexColor("#3a3936")
MUTED = colors.HexColor("#6b685f")
PAPER = colors.HexColor("#f2efe9")

# Avery 5163-equivalent sheet layout (rectangular labels, 2" x 4", 10/sheet).
SHEET_LABEL_W = 4.0 * inch
SHEET_LABEL_H = 2.0 * inch
SHEET_COLS = 2
SHEET_ROWS = 5
SHEET_LEFT_MARGIN = 0.156 * inch
SHEET_TOP_MARGIN = 0.5 * inch
SHEET_COL_GAP = 0.125 * inch

# Single-label page size (centered with crop marks).
SINGLE_LABEL_W = 3.0 * inch
SINGLE_LABEL_H = 4.0 * inch
ROUND_LABEL_DIA = 2.5 * inch


def draw_rect_label(c, x, y, w, h, *, sku, name, tagline, size):
    """Paint one rectangular label centered at (x, y) with given w/h."""
    # Cream background
    c.setFillColor(PAPER)
    c.setStrokeColor(MUTED)
    c.setLineWidth(0.4)
    c.rect(x, y, w, h, fill=1, stroke=1)

    # Wordmark (top)
    c.setFillColor(INK)
    c.setFont("Times-Bold", 9)
    c.drawCentredString(x + w / 2, y + h - 0.28 * inch, "BACKUSDESIGNCO.")
    c.setFont("Times-Italic", 6.5)
    c.setFillColor(MUTED)
    c.drawCentredString(x + w / 2, y + h - 0.42 * inch, "architectural concrete, cast by hand")

    # Top hairline rule
    c.setStrokeColor(INK)
    c.setLineWidth(0.35)
    rule_inset = 0.4 * inch
    c.line(x + rule_inset, y + h - 0.55 * inch, x + w - rule_inset, y + h - 0.55 * inch)

    # Product name — wrapped if needed.
    c.setFillColor(INK)
    name_lines = wrap_for_width(c, name, w - 0.4 * inch, "Times-Roman", 14)
    line_height = 17
    name_block_h = line_height * len(name_lines)
    name_top = y + h / 2 + name_block_h / 2 - 4
    for i, line in enumerate(name_lines):
        c.setFont("Times-Roman", 14)
        c.drawCentredString(x + w / 2, name_top - i * line_height, line)

    # Tagline — italic
    c.setFont("Times-Italic", 7.5)
    c.setFillColor(INK_2)
    tagline_y = name_top - name_block_h - 4
    tag_lines = wrap_for_width(c, tagline, w - 0.5 * inch, "Times-Italic", 7.5)
    for i, line in enumerate(tag_lines):
        c.drawCentredString(x + w / 2, tagline_y - i * 10, line)

    # Bottom hairline rule
    c.setStrokeColor(INK)
    c.setLineWidth(0.35)
    c.line(x + rule_inset, y + 0.42 * inch, x + w - rule_inset, y + 0.42 * inch)

    # SKU + size — mono caps
    c.setFont("Courier-Bold", 6.5)
    c.setFillColor(INK)
    c.drawCentredString(x + w / 2, y + 0.25 * inch, f"{sku}   ·   {size}")


def draw_round_label(c, cx, cy, dia, *, sku, name, tagline, size):
    """Round label centered at (cx, cy) with diameter `dia` — for tin/jar lids."""
    r = dia / 2
    # Cream fill + thin stroke
    c.setFillColor(PAPER)
    c.setStrokeColor(MUTED)
    c.setLineWidth(0.4)
    c.circle(cx, cy, r, fill=1, stroke=1)

    # Wordmark (top arc area, just plain horizontal text)
    c.setFillColor(INK)
    c.setFont("Times-Bold", 8)
    c.drawCentredString(cx, cy + r - 0.30 * inch, "BACKUSDESIGNCO.")

    # Product name
    c.setFont("Times-Roman", 12)
    name_lines = wrap_for_width(c, name, dia - 0.35 * inch, "Times-Roman", 12)
    name_top = cy + 0.18 * inch + (len(name_lines) - 1) * 7
    for i, line in enumerate(name_lines):
        c.drawCentredString(cx, name_top - i * 14, line)

    # Tagline
    c.setFont("Times-Italic", 6.5)
    c.setFillColor(INK_2)
    tag_lines = wrap_for_width(c, tagline, dia - 0.5 * inch, "Times-Italic", 6.5)
    tag_y = name_top - len(name_lines) * 14 - 4
    for i, line in enumerate(tag_lines):
        c.drawCentredString(cx, tag_y - i * 9, line)

    # Hairline divider
    c.setStrokeColor(INK)
    c.setLineWidth(0.3)
    c.line(cx - r + 0.30 * inch, cy - r + 0.40 * inch, cx + r - 0.30 * inch, cy - r + 0.40 * inch)

    # SKU + size
    c.setFont("Courier-Bold", 5.5)
    c.setFillColor(INK)
    c.drawCentredString(cx, cy - r + 0.24 * inch, f"{sku}  ·  {size}")


def draw_qr(c, x, y, size, url):
    """Draw a QR code into a square at (x, y) with the given side length."""
    qr = QrCodeWidget(url)
    bounds = qr.getBounds()
    qr_w = bounds[2] - bounds[0]
    qr_h = bounds[3] - bounds[1]
    drawing = Drawing(size, size, transform=[size / qr_w, 0, 0, size / qr_h, 0, 0])
    drawing.add(qr)
    renderPDF.draw(drawing, c, x, y)


def draw_back_label(c, x, y, w, h, *, sku, name, size, instructions, ingredients, qr_url):
    """Back label: usage steps, ingredients/cautions, website, QR code."""
    # Cream background
    c.setFillColor(PAPER)
    c.setStrokeColor(MUTED)
    c.setLineWidth(0.4)
    c.rect(x, y, w, h, fill=1, stroke=1)

    pad = 0.22 * inch
    inner_w = w - 2 * pad
    cursor_y = y + h - pad

    # Header: small SKU + size
    c.setFillColor(INK)
    c.setFont("Courier-Bold", 6)
    c.drawString(x + pad, cursor_y - 7, f"{sku}   ·   {size}")
    cursor_y -= 14

    # Hairline rule
    c.setStrokeColor(INK)
    c.setLineWidth(0.3)
    c.line(x + pad, cursor_y, x + w - pad, cursor_y)
    cursor_y -= 12

    # Section header: USAGE
    c.setFont("Helvetica-Bold", 6.5)
    c.setFillColor(INK)
    c.drawString(x + pad, cursor_y - 6, "USAGE")
    cursor_y -= 14

    # Instructions list (numbered)
    c.setFont("Times-Roman", 7.5)
    c.setFillColor(INK_2)
    for i, step in enumerate(instructions, start=1):
        lines = wrap_for_width(c, f"{i}. {step}", inner_w, "Times-Roman", 7.5)
        for j, line in enumerate(lines):
            font = "Times-Roman"
            c.setFont(font, 7.5)
            c.drawString(x + pad, cursor_y - 8, line)
            cursor_y -= 10
        cursor_y -= 1  # small gap between steps

    # Ingredients/cautions
    if ingredients:
        cursor_y -= 4
        c.setFont("Helvetica-Bold", 6.5)
        c.setFillColor(INK)
        c.drawString(x + pad, cursor_y - 6, "INGREDIENTS")
        cursor_y -= 13
        c.setFont("Times-Italic", 6.5)
        c.setFillColor(MUTED)
        ing_lines = wrap_for_width(c, ingredients, inner_w, "Times-Italic", 6.5)
        for line in ing_lines:
            c.drawString(x + pad, cursor_y - 7, line)
            cursor_y -= 9

    # Footer: brand + website on left, QR on right
    footer_top = y + 0.85 * inch
    c.setStrokeColor(INK)
    c.setLineWidth(0.3)
    c.line(x + pad, footer_top, x + w - pad, footer_top)

    # Brand wordmark
    c.setFont("Times-Bold", 8)
    c.setFillColor(INK)
    c.drawString(x + pad, footer_top - 12, "BACKUSDESIGNCO.")
    c.setFont("Times-Italic", 6)
    c.setFillColor(MUTED)
    c.drawString(x + pad, footer_top - 22, "architectural concrete, cast by hand")

    c.setFont("Courier", 6)
    c.setFillColor(INK)
    c.drawString(x + pad, footer_top - 36, "BACKUSDESIGNCO.COM")
    c.setFont("Times-Italic", 5.5)
    c.setFillColor(MUTED)
    c.drawString(x + pad, footer_top - 46, "Made by hand in Texas")

    # QR code on the right
    qr_size = 0.7 * inch
    qr_x = x + w - pad - qr_size
    qr_y = footer_top - qr_size - 4
    draw_qr(c, qr_x, qr_y, qr_size, qr_url)


def wrap_for_width(c, text, max_w, font, size):
    """Greedy word-wrap so text fits in max_w using the given font/size."""
    if not text:
        return [""]
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = (current + " " + word).strip()
        if c.stringWidth(candidate, font, size) <= max_w:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_crop_marks(c, x, y, w, h, length=0.18 * inch):
    """Tick marks at each corner of a label so the user can cut accurately."""
    c.setStrokeColor(MUTED)
    c.setLineWidth(0.3)
    for cx, cy in [(x, y), (x + w, y), (x, y + h), (x + w, y + h)]:
        c.line(cx - length, cy, cx, cy)
        c.line(cx, cy, cx, cy + length)


def _draw_label_box(c, x, y, w, h, label, side):
    """Dispatch to the right drawing function based on side and shape."""
    if side == "back":
        # Back labels are always rectangular (apply to side of tin / bottom of jar).
        draw_back_label(
            c, x, y, w, h,
            sku=label["sku"],
            name=label["name"],
            size=label.get("size", ""),
            instructions=label.get("instructions", []),
            ingredients=label.get("ingredients", ""),
            qr_url=label.get("qr_url", "https://backusdesignco.com"),
        )
        return

    # Front side
    if label.get("shape") == "round":
        cx = x + w / 2
        cy = y + h / 2
        dia = min(w, h)
        draw_round_label(
            c, cx, cy, dia,
            sku=label["sku"],
            name=label["name"],
            tagline=label.get("tagline", ""),
            size=label.get("size", ""),
        )
    else:
        draw_rect_label(
            c, x, y, w, h,
            sku=label["sku"],
            name=label["name"],
            tagline=label.get("tagline", ""),
            size=label.get("size", ""),
        )


def render_sheet_mode(c, label, side):
    """Tile the same label across an Avery 5163 sheet."""
    page_w, page_h = LETTER
    for row in range(SHEET_ROWS):
        for col in range(SHEET_COLS):
            x = SHEET_LEFT_MARGIN + col * (SHEET_LABEL_W + SHEET_COL_GAP)
            y = page_h - SHEET_TOP_MARGIN - (row + 1) * SHEET_LABEL_H
            _draw_label_box(c, x, y, SHEET_LABEL_W, SHEET_LABEL_H, label, side)
    c.showPage()


def render_single_mode(c, label, side):
    """One label centered on a US Letter page with crop marks."""
    page_w, page_h = LETTER
    is_round_front = side == "front" and label.get("shape") == "round"
    if is_round_front:
        cx, cy = page_w / 2, page_h / 2
        draw_round_label(
            c, cx, cy, ROUND_LABEL_DIA,
            sku=label["sku"],
            name=label["name"],
            tagline=label.get("tagline", ""),
            size=label.get("size", ""),
        )
        x = cx - ROUND_LABEL_DIA / 2
        y = cy - ROUND_LABEL_DIA / 2
        draw_crop_marks(c, x, y, ROUND_LABEL_DIA, ROUND_LABEL_DIA)
    else:
        x = (page_w - SINGLE_LABEL_W) / 2
        y = (page_h - SINGLE_LABEL_H) / 2
        _draw_label_box(c, x, y, SINGLE_LABEL_W, SINGLE_LABEL_H, label, side)
        draw_crop_marks(c, x, y, SINGLE_LABEL_W, SINGLE_LABEL_H)

    # Footer caption
    c.setFont("Helvetica", 7)
    c.setFillColor(MUTED)
    c.drawCentredString(
        page_w / 2,
        0.4 * inch,
        f"{label['sku']} · {label.get('size', '')} · cut along crop marks",
    )
    c.showPage()


def main():
    payload = json.load(sys.stdin)
    mode = payload.get("mode", "single")
    side = payload.get("side", "front")
    labels = payload.get("labels", [])
    if not labels:
        sys.stderr.write("No labels provided.\n")
        sys.exit(1)

    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=LETTER)

    if mode == "sheet":
        for label in labels:
            render_sheet_mode(c, label, side)
    else:
        for label in labels:
            render_single_mode(c, label, side)

    c.save()
    sys.stdout.buffer.write(buf.getvalue())


if __name__ == "__main__":
    main()
