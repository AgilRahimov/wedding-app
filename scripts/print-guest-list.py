"""
Print-friendly A4 guest list (large type) for reviewing on paper.

Usage (from the wedding-app folder):
    node scripts/export-print-data.js                       # dumps guests to print-data.json
    python3 scripts/print-guest-list.py print-data.json "../Guest list for review.pdf"

Layout: one row per invited party, grouped by group. Each row has a tick box,
the party name, who else is in the party (+1s / children), the family's note
from the spreadsheet, and a blank column for handwritten remarks.
"""
import json
import sys
from collections import OrderedDict

from reportlab.graphics.shapes import Drawing, Rect
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

FONT_DIR = "/System/Library/Fonts/Supplemental/"
pdfmetrics.registerFont(TTFont("Body", FONT_DIR + "Arial.ttf"))
pdfmetrics.registerFont(TTFont("BodyBold", FONT_DIR + "Arial Bold.ttf"))

NAME_SIZE = 16   # large: this is what gets read
SUB_SIZE = 12    # members / notes
HEAD_SIZE = 20   # group headings

data_path, out_path = sys.argv[1], sys.argv[2]
with open(data_path, encoding="utf-8") as f:
    parties = json.load(f)

groups: "OrderedDict[str, list]" = OrderedDict()
for p in parties:
    groups.setdefault(p["group"], []).append(p)

GREY = colors.HexColor("#555555")
RULE = colors.HexColor("#bbbbbb")
name_style = ParagraphStyle("name", fontName="BodyBold", fontSize=NAME_SIZE, leading=NAME_SIZE + 4)
sub_style = ParagraphStyle("sub", fontName="Body", fontSize=SUB_SIZE, leading=SUB_SIZE + 3, textColor=GREY)
head_style = ParagraphStyle("head", fontName="BodyBold", fontSize=HEAD_SIZE, leading=HEAD_SIZE + 4, spaceBefore=8, spaceAfter=4)
colhead_style = ParagraphStyle("colhead", fontName="Body", fontSize=10, leading=12, textColor=GREY)
title_style = ParagraphStyle("title", fontName="BodyBold", fontSize=26, leading=30)
meta_style = ParagraphStyle("meta", fontName="Body", fontSize=12, leading=15, textColor=GREY)
toc_style = ParagraphStyle("toc", fontName="Body", fontSize=13, leading=17)


def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def tick_box():
    d = Drawing(6 * mm, 6 * mm)
    d.add(Rect(0.5, 0.5, 5.5 * mm, 5.5 * mm, strokeColor=colors.black, strokeWidth=0.8, fillColor=None))
    return d


def describe_members(p):
    """Named companions and/or '+N', so party size is visible at a glance."""
    others = [m for m in p["members"] if m["isPlusOne"] or m["isChild"]]
    if not others:
        return ""
    named = [m["name"] + (" (child)" if m["isChild"] else "") for m in others if not m["name"].startswith("+1")]
    unnamed = len(others) - len(named)
    parts = []
    if named:
        parts.append(", ".join(esc(n) for n in named))
    if unnamed:
        parts.append(f"+{unnamed}")
    return " · ".join(parts)


def rsvp_word(p):
    statuses = {m["rsvp"] for m in p["members"]}
    if statuses == {"yes"}:
        return "<font color='#1a7f4b'>coming</font>"
    if statuses == {"no"}:
        return "<font color='#b3261e'>not coming</font>"
    if "yes" in statuses or "no" in statuses:
        return "<font color='#8a6d00'>partly answered</font>"
    return ""


# ---- Page 1: title + contents ----
story = []
total_people = sum(len(p["members"]) for p in parties)
story.append(Paragraph("Guest list", title_style))
story.append(Spacer(1, 4))
story.append(Paragraph(f"{len(parties)} invited parties · {total_people} people · grouped as in the spreadsheet", meta_style))
story.append(Spacer(1, 12))

toc_items = [(g, len(ps), sum(len(p["members"]) for p in ps)) for g, ps in groups.items()]
half = (len(toc_items) + 1) // 2
toc_rows = []
for i in range(half):
    left = toc_items[i]
    right = toc_items[i + half] if i + half < len(toc_items) else None
    row = [Paragraph(esc(left[0]), toc_style), Paragraph(f"{left[1]} · {left[2]} ppl", toc_style)]
    row += [Paragraph(esc(right[0]), toc_style), Paragraph(f"{right[1]} · {right[2]} ppl", toc_style)] if right else ["", ""]
    toc_rows.append(row)
toc = Table(toc_rows, colWidths=[55 * mm, 30 * mm, 55 * mm, 30 * mm])
toc.setStyle(TableStyle([
    ("LINEBELOW", (0, 0), (-1, -1), 0.3, colors.HexColor("#dddddd")),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ("TOPPADDING", (0, 0), (-1, -1), 3),
]))
story.append(toc)
story.append(Spacer(1, 12))
story.append(Paragraph(
    "How to read: each line is one invited party. Under the name: who comes with them "
    "(“+1” = companion not yet named). “Note” is the remark from the spreadsheet. "
    "The empty box on the left is for ticking; the last column is for your remarks. "
    "Where a reply is already known it says “coming” / “not coming”.",
    meta_style))
story.append(PageBreak())

# ---- Group tables ----
COL_W = [10 * mm, 76 * mm, 50 * mm, 44 * mm]  # box, name+members, note, remarks
BASE_STYLE = [
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LINEBELOW", (0, 0), (-1, -1), 0.4, RULE),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 2),
]
HEADER_ROW = ["", Paragraph("Guest / party", colhead_style), Paragraph("Note", colhead_style), Paragraph("Remarks", colhead_style)]


def make_table(heading, rows):
    # Row 0 = group heading, row 1 = column labels; both repeat if the group
    # ever spills onto a second sheet, so no page is ever without its group name.
    data = [[heading, "", "", ""], HEADER_ROW] + rows
    t = Table(data, colWidths=COL_W, repeatRows=2)
    # Big groups get slightly tighter rows so they still fit on one sheet.
    pad = 6 if len(rows) <= 15 else 3
    style = list(BASE_STYLE) + [
        ("TOPPADDING", (0, 2), (-1, -1), pad),
        ("BOTTOMPADDING", (0, 2), (-1, -1), pad),
        ("SPAN", (0, 0), (-1, 0)),
        ("LINEBELOW", (0, 0), (-1, 0), 0, colors.white),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 0),
        ("LINEBELOW", (0, 1), (-1, 1), 0.8, colors.black),
        ("TOPPADDING", (0, 1), (-1, 1), 2),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 2),
    ]
    t.setStyle(TableStyle(style))
    return t


for g, ps in groups.items():
    people = sum(len(p["members"]) for p in ps)
    heading = Paragraph(
        f"{esc(g)} <font size={SUB_SIZE} color='#666666'>— {len(ps)} parties · {people} people</font>",
        head_style,
    )
    rows = []
    for p in ps:
        rs = rsvp_word(p)
        name_cell = [Paragraph(esc(p["name"]) + (f"   <font size={SUB_SIZE}>{rs}</font>" if rs else ""), name_style)]
        members = describe_members(p)
        if members:
            name_cell.append(Paragraph(members, sub_style))
        rows.append([tick_box(), name_cell, Paragraph(esc(p["notes"]), sub_style), ""])

    # One group per page: each group starts on a fresh sheet so pages can be
    # handed around separately. A very large group may still run onto a second
    # sheet, in which case the header row repeats there.
    story.append(make_table(heading, rows))
    story.append(PageBreak())


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Body", 10)
    canvas.setFillColor(colors.HexColor("#777777"))
    canvas.drawRightString(A4[0] - 15 * mm, 10 * mm, f"Page {doc.page}")
    canvas.drawString(15 * mm, 10 * mm, "Guest list — for review")
    canvas.restoreState()


doc = SimpleDocTemplate(
    out_path, pagesize=A4,
    leftMargin=15 * mm, rightMargin=15 * mm, topMargin=15 * mm, bottomMargin=18 * mm,
    title="Guest list",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("wrote", out_path)
