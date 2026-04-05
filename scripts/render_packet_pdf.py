import json
import os
import sys
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Image, ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer

LOGO_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "rb-studio-logo.png")


def build_styles():
    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name="PacketTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=28,
            textColor=colors.HexColor("#1f2937"),
            alignment=TA_CENTER,
            spaceAfter=18,
        )
    )
    styles.add(
        ParagraphStyle(
            name="PacketMeta",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#4b5563"),
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="PacketSectionHeading",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=20,
            textColor=colors.HexColor("#111827"),
            spaceBefore=10,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="PacketSubheading",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#1f2937"),
            spaceBefore=8,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="PacketBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=colors.black,
            spaceAfter=8,
        )
    )

    return styles


def lines_to_paragraphs(text, style):
    parts = []
    for block in text.split("\n"):
        cleaned = block.strip()
        if cleaned:
            parts.append(Paragraph(cleaned.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), style))
        else:
            parts.append(Spacer(1, 0.08 * inch))
    return parts


def bullet_list(items, style):
    flow_items = [
        ListItem(
            Paragraph(str(item).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), style)
        )
        for item in items
    ]
    return ListFlowable(flow_items, bulletType="bullet", start="circle", leftIndent=16)


def build_pdf(payload):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        rightMargin=0.65 * inch,
        leftMargin=0.65 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title=payload.get("title", "Packet Export"),
    )
    styles = build_styles()
    story = []

    # Logo
    if os.path.exists(LOGO_PATH):
        try:
            logo = Image(LOGO_PATH, width=1.2 * inch, height=0.4 * inch)
            logo.hAlign = "CENTER"
            story.append(logo)
            story.append(Spacer(1, 0.15 * inch))
        except Exception:
            pass

    story.append(Paragraph(payload.get("title", "Packet Export"), styles["PacketTitle"]))
    story.append(
        Paragraph(
            f"SKU: {payload['sku']['code']} - {payload['sku']['name']} | "
            f"Status: {payload.get('status', '')} | "
            f"Version: v{payload.get('version', '')} | "
            f"Created: {payload.get('createdAt', '')}",
            styles["PacketMeta"],
        )
    )
    story.append(Spacer(1, 0.12 * inch))

    drawing_map = {}
    for drawing in payload.get("technicalDrawings", []):
        section_key = drawing.get("sectionKey")
        file_path = drawing.get("filePath")
        if section_key and file_path:
            drawing_map[section_key] = file_path

    for section in payload.get("sections", []):
        order = str(section.get("sectionOrder", ""))
        name = str(section.get("name", "Untitled"))
        section_key = str(section.get("sectionKey", ""))
        story.append(Paragraph(f"{order.zfill(2)}. {name}", styles["PacketSectionHeading"]))

        if section_key in drawing_map:
            try:
                img_path = drawing_map[section_key]
                img = Image(img_path, width=6.0 * inch, height=6.0 * inch)
                img.hAlign = "CENTER"
                story.append(img)
                story.append(Spacer(1, 0.15 * inch))
            except Exception:
                pass

        story.extend(lines_to_paragraphs(str(section.get("content", "")), styles["PacketBody"]))
        story.append(Spacer(1, 0.08 * inch))

    rules = payload.get("rulesApplied", [])
    if rules:
        story.append(Paragraph("Rules Applied", styles["PacketSectionHeading"]))
        for rule in rules:
            title = str(rule.get("title") or rule.get("code") or "Rule")
            priority = str(rule.get("priority", "?"))
            story.append(Paragraph(f"[P{priority}] {title}", styles["PacketSubheading"]))
            story.extend(lines_to_paragraphs(str(rule.get("ruleText") or rule.get("text") or ""), styles["PacketBody"]))

    qc_templates = payload.get("qcTemplatesApplied", [])
    if qc_templates:
        story.append(Paragraph("QC Templates Applied", styles["PacketSectionHeading"]))
        for template in qc_templates:
            story.append(Paragraph(str(template.get("name", "QC Template")), styles["PacketSubheading"]))
            category = str(template.get("category", "")).strip()
            if category:
              story.append(Paragraph(f"Category: {category}", styles["PacketMeta"]))
            checklist = template.get("checklist") or []
            if checklist:
                story.append(bullet_list(checklist, styles["PacketBody"]))
                story.append(Spacer(1, 0.05 * inch))

    sources = payload.get("sourceReferences", {})
    story.append(Paragraph("Source References", styles["PacketSectionHeading"]))
    source_lines = [
        f"GeneratedOutput ID: {payload.get('outputId', '')}",
    ]
    primary = sources.get("primaryBuildPacketTemplate")
    if primary:
        source_lines.append(
            f"Primary Packet Template: {primary.get('packetKey', '')}/{primary.get('sectionKey', '')} - {primary.get('name', '')}"
        )
    section_sources = sources.get("buildPacketSections") or []
    for section in section_sources:
        source_lines.append(
            f"Section {section.get('sectionOrder', '')}: {section.get('sectionKey', '')}"
            + (f" - {section.get('templateName', '')}" if section.get("templateName") else "")
        )

    story.extend(lines_to_paragraphs("\n".join(source_lines), styles["PacketBody"]))

    def add_page_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#6b7280"))
        canvas.drawString(0.65 * inch, 0.45 * inch, "RB Studio  |  CONFIDENTIAL - INTERNAL USE ONLY")
        canvas.drawRightString(LETTER[0] - 0.65 * inch, 0.45 * inch, f"Page {doc.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=add_page_footer, onLaterPages=add_page_footer)
    return buffer.getvalue()


def main():
    payload = json.load(sys.stdin)
    pdf_bytes = build_pdf(payload)
    sys.stdout.buffer.write(pdf_bytes)


if __name__ == "__main__":
    main()
