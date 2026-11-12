# -*- coding: utf-8 -*-
"""
Build the BIWA2110 submission report as a Word document.

Run from the repository root:
    python submission/build_docx.py
"""

import os
import sys
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import (
    WD_ALIGN_PARAGRAPH,
    WD_BREAK,
    WD_TAB_ALIGNMENT,
    WD_TAB_LEADER,
)
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "screenshots")
OUT = os.environ.get("REPORT_OUT") or os.path.join(HERE, "BIWA2110-Ground-and-Grain-Report.docx")

# Optional first argument: the real page count from a previous build. Word's
# NUMPAGES field is unreliable when fields are updated without an interactive
# layout pass, so the second build writes the total as plain text instead.
TOTAL_PAGES = sys.argv[1] if len(sys.argv) > 1 else None
WORD_COUNT = sys.argv[2] if len(sys.argv) > 2 else None

BROWN = RGBColor(0x7A, 0x3E, 0x12)
BROWN_SOFT = RGBColor(0x92, 0x40, 0x0E)
INK = RGBColor(0x24, 0x1C, 0x15)
MUTED = RGBColor(0x6F, 0x62, 0x55)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

BODY_FONT = "Calibri"
HEAD_FONT = "Georgia"
MONO_FONT = "Consolas"

FIG = [0]
TAB = [0]
FIRST_H1 = [True]

doc = Document()


# --------------------------------------------------------------------------
# low-level helpers
# --------------------------------------------------------------------------

def _set_run_font(run, name=None, size=None, bold=None, italic=None, color=None):
    if name:
        run.font.name = name
        rpr = run._element.get_or_add_rPr()
        rfonts = rpr.find(qn("w:rFonts"))
        if rfonts is None:
            rfonts = OxmlElement("w:rFonts")
            rpr.append(rfonts)
        for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
            rfonts.set(qn(attr), name)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.font.bold = bold
    if italic is not None:
        run.font.italic = italic
    if color is not None:
        run.font.color.rgb = color


def _shade(element_pr, fill):
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    element_pr.append(shd)


def _para_shading(paragraph, fill):
    pPr = paragraph._p.get_or_add_pPr()
    _shade(pPr, fill)


def _para_left_border(paragraph, color="92400E", size=18):
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    left = OxmlElement("w:left")
    left.set(qn("w:val"), "single")
    left.set(qn("w:sz"), str(size))
    left.set(qn("w:space"), "8")
    left.set(qn("w:color"), color)
    pBdr.append(left)
    pPr.append(pBdr)


def _cell_shading(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    _shade(tcPr, fill)


def _strip_theme_fonts(style):
    """Word gives w:asciiTheme precedence over w:ascii, so remove the theme refs."""
    rpr = style.element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        return
    for attr in ("w:asciiTheme", "w:hAnsiTheme", "w:eastAsiaTheme", "w:cstheme"):
        if rfonts.get(qn(attr)) is not None:
            del rfonts.attrib[qn(attr)]


def _fixed_layout(table, total_cm=16.4):
    tblPr = table._tbl.tblPr
    layout = OxmlElement("w:tblLayout")
    layout.set(qn("w:type"), "fixed")
    tblPr.append(layout)
    width = OxmlElement("w:tblW")
    width.set(qn("w:w"), str(int(total_cm * 567)))
    width.set(qn("w:type"), "dxa")
    tblPr.append(width)


def _cant_split(table):
    for row in table.rows:
        trPr = row._tr.get_or_add_trPr()
        el = OxmlElement("w:cantSplit")
        el.set(qn("w:val"), "true")
        trPr.append(el)


def _cell_margins(table, top=60, bottom=60, left=90, right=90):
    tblPr = table._tbl.tblPr
    mar = OxmlElement("w:tblCellMar")
    for side, value in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        el = OxmlElement("w:" + side)
        el.set(qn("w:w"), str(value))
        el.set(qn("w:type"), "dxa")
        mar.append(el)
    tblPr.append(mar)


def _no_borders(table):
    tblPr = table._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement("w:" + edge)
        el.set(qn("w:val"), "none")
        el.set(qn("w:sz"), "0")
        borders.append(el)
    tblPr.append(borders)


def _repeat_header(row):
    trPr = row._tr.get_or_add_trPr()
    hdr = OxmlElement("w:tblHeader")
    hdr.set(qn("w:val"), "true")
    trPr.append(hdr)


def _keep_with_next(paragraph):
    paragraph.paragraph_format.keep_with_next = True


def add_page_field(paragraph):
    run = paragraph.add_run()
    f1 = OxmlElement("w:fldChar")
    f1.set(qn("w:fldCharType"), "begin")
    it = OxmlElement("w:instrText")
    it.set(qn("xml:space"), "preserve")
    it.text = "PAGE"
    f2 = OxmlElement("w:fldChar")
    f2.set(qn("w:fldCharType"), "end")
    run._r.append(f1)
    run._r.append(it)
    run._r.append(f2)
    _set_run_font(run, BODY_FONT, 8.5, color=MUTED)


def add_numpages_field(paragraph):
    run = paragraph.add_run()
    f1 = OxmlElement("w:fldChar")
    f1.set(qn("w:fldCharType"), "begin")
    it = OxmlElement("w:instrText")
    it.set(qn("xml:space"), "preserve")
    it.text = "NUMPAGES"
    f2 = OxmlElement("w:fldChar")
    f2.set(qn("w:fldCharType"), "end")
    run._r.append(f1)
    run._r.append(it)
    run._r.append(f2)
    _set_run_font(run, BODY_FONT, 8.5, color=MUTED)


# The contents list is written out as plain paragraphs rather than a TOC field.
# A field has to be refreshed by the reader, and WPS Office's refresh corrupts
# this document (it rewrites the first entry and drops the Declaration heading),
# so the page numbers are fixed here and checked against the exported PDF by
# verify.py after every build.
TOC_ENTRIES = [
    ("Declaration", 2),
    ("Abstract", 3),
    ("1. Introduction", 5),
    ("2. Requirements", 6),
    ("3. Design", 8),
    ("4. Implementation", 10),
    ("5. Testing and quality assurance", 12),
    ("6. Deployment", 14),
    ("7. Challenges and lessons", 16),
    ("8. Conclusion and future work", 17),
    ("References", 17),
    ("Appendix A — API reference", 18),
    ("Appendix B — Records and screenshots", 19),
]


def add_toc_entry(title, page):
    par = doc.add_paragraph()
    pf = par.paragraph_format
    pf.space_before = Pt(0)
    pf.space_after = Pt(3)
    pf.line_spacing = 1.0
    pf.tab_stops.add_tab_stop(Cm(16.6), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)
    r1 = par.add_run(title)
    _set_run_font(r1, BODY_FONT, 10, color=INK)
    r2 = par.add_run("\t" + str(page))
    _set_run_font(r2, BODY_FONT, 10, color=INK)


# --------------------------------------------------------------------------
# content helpers
# --------------------------------------------------------------------------

def p(text, size=10, bold=False, italic=False, color=None, align="justify",
      space_after=5, space_before=0, indent=0, keep=False):
    par = doc.add_paragraph()
    par.paragraph_format.space_after = Pt(space_after)
    par.paragraph_format.space_before = Pt(space_before)
    par.paragraph_format.line_spacing = 1.1
    if indent:
        par.paragraph_format.left_indent = Cm(indent)
    if align == "justify":
        par.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    elif align == "center":
        par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif align == "right":
        par.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    if keep:
        par.paragraph_format.keep_with_next = True
    run = par.add_run(text)
    _set_run_font(run, BODY_FONT, size, bold, italic, color)
    return par


def rich(parts, size=10, align="justify", space_after=5, indent=0):
    """parts: list of (text, bold, italic) or plain strings."""
    par = doc.add_paragraph()
    par.paragraph_format.space_after = Pt(space_after)
    par.paragraph_format.line_spacing = 1.1
    if indent:
        par.paragraph_format.left_indent = Cm(indent)
    if align == "justify":
        par.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    for part in parts:
        if isinstance(part, str):
            text, bold, italic = part, False, False
        else:
            text = part[0]
            bold = part[1] if len(part) > 1 else False
            italic = part[2] if len(part) > 2 else False
        run = par.add_run(text)
        _set_run_font(run, BODY_FONT, size, bold, italic)
    return par


def h1(text, new_page=True):
    par = doc.add_heading(text, level=1)
    if new_page and not FIRST_H1[0]:
        # page_break_before rather than an explicit break: an explicit break
        # adds an empty paragraph, which produces a blank page when the
        # previous page already ended at the bottom.
        par.paragraph_format.page_break_before = True
    FIRST_H1[0] = False
    par.paragraph_format.space_before = Pt(0)
    par.paragraph_format.space_after = Pt(10)
    par.paragraph_format.keep_with_next = True
    return par


def h1_plain(text):
    """Section title that looks like a chapter heading but stays out of the TOC."""
    par = doc.add_paragraph()
    par.paragraph_format.page_break_before = True
    par.paragraph_format.space_before = Pt(0)
    par.paragraph_format.space_after = Pt(10)
    par.paragraph_format.keep_with_next = True
    run = par.add_run(text)
    _set_run_font(run, HEAD_FONT, 19, bold=True, color=BROWN)
    return par


def h2(text):
    par = doc.add_heading(text, level=2)
    par.paragraph_format.space_before = Pt(14)
    par.paragraph_format.space_after = Pt(5)
    par.paragraph_format.keep_with_next = True
    return par


def h3(text):
    par = doc.add_heading(text, level=3)
    par.paragraph_format.space_before = Pt(10)
    par.paragraph_format.space_after = Pt(3)
    par.paragraph_format.keep_with_next = True
    return par


def bullets(items, size=10, numbered=False):
    for item in items:
        par = doc.add_paragraph(style="List Number" if numbered else "List Bullet")
        par.paragraph_format.space_after = Pt(2)
        par.paragraph_format.line_spacing = 1.08
        run = par.add_run(item)
        _set_run_font(run, BODY_FONT, size)


def code(text, size=8.0):
    par = doc.add_paragraph()
    par.paragraph_format.space_before = Pt(4)
    par.paragraph_format.space_after = Pt(10)
    par.paragraph_format.line_spacing = 1.0
    par.paragraph_format.left_indent = Cm(0.25)
    par.paragraph_format.right_indent = Cm(0.25)
    par.paragraph_format.keep_together = True
    _para_shading(par, "F7F2E8")
    _para_left_border(par)
    lines = text.strip("\n").split("\n")
    for i, line in enumerate(lines):
        run = par.add_run(line)
        _set_run_font(run, MONO_FONT, size, color=INK)
        if i < len(lines) - 1:
            run.add_break()
    return par


def caption(text, kind="Figure"):
    if kind == "Figure":
        FIG[0] += 1
        label = "Figure %d — %s" % (FIG[0], text)
    else:
        TAB[0] += 1
        label = "Table %d — %s" % (TAB[0], text)
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    par.paragraph_format.space_before = Pt(2)
    par.paragraph_format.space_after = Pt(10)
    run = par.add_run(label)
    _set_run_font(run, BODY_FONT, 8.5, italic=True, color=MUTED)
    return par


def figure(filename, text, width_cm=15.5):
    path = os.path.join(SHOTS, filename)
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    par.paragraph_format.space_before = Pt(6)
    par.paragraph_format.space_after = Pt(2)
    par.paragraph_format.keep_with_next = True
    par.add_run().add_picture(path, width=Cm(width_cm))
    caption(text, "Figure")


def figure_pair(file_a, cap_a, file_b, cap_b):
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    _no_borders(table)
    table.autofit = False
    for cell, name in ((table.rows[0].cells[0], file_a), (table.rows[0].cells[1], file_b)):
        cell.width = Cm(8.0)
        par = cell.paragraphs[0]
        par.alignment = WD_ALIGN_PARAGRAPH.CENTER
        par.add_run().add_picture(os.path.join(SHOTS, name), width=Cm(7.6))
    FIG[0] += 1
    label_a = "Figure %d — %s" % (FIG[0], cap_a)
    FIG[0] += 1
    label_b = "Figure %d — %s" % (FIG[0], cap_b)
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_after = Pt(10)
    run = cap.add_run(label_a + "        " + label_b)
    _set_run_font(run, BODY_FONT, 8.5, italic=True, color=MUTED)


def table(headers, rows, widths=None, caption_text=None, size=8.6):
    if caption_text:
        if TAB[0] == 0 and FIG[0] == 0:
            pass
        TAB[0] += 1
        cap = doc.add_paragraph()
        cap.paragraph_format.space_before = Pt(6)
        cap.paragraph_format.space_after = Pt(3)
        cap.paragraph_format.keep_with_next = True
        run = cap.add_run("Table %d — %s" % (TAB[0], caption_text))
        _set_run_font(run, BODY_FONT, 8.5, bold=True, color=MUTED)

    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.style = "Table Grid"
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    _cell_margins(tbl)

    hdr = tbl.rows[0]
    _repeat_header(hdr)
    for i, text in enumerate(headers):
        cell = hdr.cells[i]
        _cell_shading(cell, "F3EAD9")
        cell.text = ""
        par = cell.paragraphs[0]
        par.paragraph_format.space_after = Pt(0)
        run = par.add_run(text)
        _set_run_font(run, BODY_FONT, size, bold=True, color=INK)

    for row in rows:
        cells = tbl.add_row().cells
        for i, value in enumerate(row):
            cells[i].text = ""
            par = cells[i].paragraphs[0]
            par.paragraph_format.space_after = Pt(0)
            par.paragraph_format.line_spacing = 1.05
            run = par.add_run(str(value))
            _set_run_font(run, BODY_FONT, size, color=INK)

    if widths:
        for row in tbl.rows:
            for i, width in enumerate(widths):
                row.cells[i].width = Cm(width)
        _fixed_layout(tbl, sum(widths))
    _cant_split(tbl)

    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(2)
    spacer.paragraph_format.line_spacing = 1.0
    return tbl


def callout(title, body_lines):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    _no_borders(tbl)
    cell = tbl.rows[0].cells[0]
    cell.width = Cm(16.4)
    _cell_shading(cell, "FBF6EC")
    _fixed_layout(tbl, 16.4)
    par = cell.paragraphs[0]
    par.paragraph_format.space_after = Pt(3)
    run = par.add_run(title)
    _set_run_font(run, BODY_FONT, 9.8, bold=True, color=BROWN)
    for i, line in enumerate(body_lines):
        par2 = cell.add_paragraph()
        par2.paragraph_format.space_after = Pt(3)
        par2.paragraph_format.line_spacing = 1.1
        run2 = par2.add_run(line)
        _set_run_font(run2, BODY_FONT, 9.4)
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(6)
    spacer.paragraph_format.line_spacing = 1.0


# --------------------------------------------------------------------------
# document setup
# --------------------------------------------------------------------------

section = doc.sections[0]
section.page_width = Cm(21.0)
section.page_height = Cm(29.7)
section.top_margin = Cm(2.1)
section.bottom_margin = Cm(2.0)
section.left_margin = Cm(2.2)
section.right_margin = Cm(2.2)
section.header_distance = Cm(1.0)
section.footer_distance = Cm(1.0)
section.different_first_page_header_footer = True

styles = doc.styles

normal = styles["Normal"]
normal.font.name = BODY_FONT
normal.font.size = Pt(10)
normal.font.color.rgb = INK
normal.paragraph_format.space_after = Pt(5)
normal.paragraph_format.line_spacing = 1.1
rpr = normal.element.get_or_add_rPr()
rfonts = rpr.find(qn("w:rFonts"))
if rfonts is None:
    rfonts = OxmlElement("w:rFonts")
    rpr.append(rfonts)
for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
    rfonts.set(qn(attr), BODY_FONT)

for name, size, color, before, after in (
    ("Heading 1", 19, BROWN, 0, 10),
    ("Heading 2", 13, BROWN_SOFT, 14, 5),
    ("Heading 3", 11, INK, 10, 3),
):
    st = styles[name]
    st.font.name = HEAD_FONT
    _strip_theme_fonts(st)
    st.font.size = Pt(size)
    st.font.bold = True
    st.font.color.rgb = color
    st.paragraph_format.space_before = Pt(before)
    st.paragraph_format.space_after = Pt(after)
    st.paragraph_format.keep_with_next = True
    st.paragraph_format.line_spacing = 1.05

# header and footer (not on the cover)
header = section.header
hp = header.paragraphs[0]
hp.text = ""
hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
hrun = hp.add_run("BIWA2110  ·  Ground & Grain Coffee Shop Management System")
_set_run_font(hrun, BODY_FONT, 8, color=MUTED)
hp.paragraph_format.space_after = Pt(0)

footer = section.footer
fp = footer.paragraphs[0]
fp.text = ""
fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = fp.add_run("Page ")
_set_run_font(r, BODY_FONT, 8.5, color=MUTED)
add_page_field(fp)
r2 = fp.add_run(" of ")
_set_run_font(r2, BODY_FONT, 8.5, color=MUTED)
if TOTAL_PAGES:
    r3 = fp.add_run(str(TOTAL_PAGES))
    _set_run_font(r3, BODY_FONT, 8.5, color=MUTED)
else:
    add_numpages_field(fp)

# No <w:updateFields>: the contents list is plain text, so there is nothing to
# refresh, and asking Word or WPS to update fields on open is what corrupted the
# previous build. The only field left is PAGE in the footer, which renders live.

# --------------------------------------------------------------------------
# COVER
# --------------------------------------------------------------------------

cover_spacer = doc.add_paragraph()
cover_spacer.paragraph_format.space_after = Pt(0)

brand = doc.add_paragraph()
brand.alignment = WD_ALIGN_PARAGRAPH.LEFT
brand.paragraph_format.space_before = Pt(28)
brand.paragraph_format.space_after = Pt(2)
brun = brand.add_run("GROUND & GRAIN")
_set_run_font(brun, BODY_FONT, 11, bold=True, color=BROWN)
brun.font.all_caps = True

brand2 = doc.add_paragraph()
brand2.paragraph_format.space_after = Pt(34)
brun2 = brand2.add_run("COFFEE ROASTERS  ·  EST. 2019")
_set_run_font(brun2, BODY_FONT, 8, color=MUTED)

kicker = doc.add_paragraph()
kicker.paragraph_format.space_after = Pt(8)
krun = kicker.add_run("BIWA2110  ·  WEB APPLICATION DEVELOPMENT")
_set_run_font(krun, BODY_FONT, 9, bold=True, color=MUTED)

title = doc.add_paragraph()
title.paragraph_format.space_after = Pt(6)
title.paragraph_format.line_spacing = 1.02
trun = title.add_run("Ground & Grain\nCoffee Shop\nManagement System")
_set_run_font(trun, HEAD_FONT, 34, bold=True, color=INK)

rule = doc.add_paragraph()
rule.paragraph_format.space_before = Pt(8)
rule.paragraph_format.space_after = Pt(14)
_para_shading(rule, "92400E")
rule.paragraph_format.line_spacing = 0.6
rr = rule.add_run(" ")
_set_run_font(rr, BODY_FONT, 2)

subtitle = doc.add_paragraph()
subtitle.paragraph_format.space_after = Pt(30)
srun = subtitle.add_run(
    "A full-stack ordering and shop-management system built with React, Express, "
    "the Fetch API and a key-value NoSQL store — designed, tested and deployed."
)
_set_run_font(srun, BODY_FONT, 12, color=MUTED)

meta_rows = [
    ("Module", "BIWA2110 — Web Application Development"),
    ("Assessment", "Group project, final submission"),
    ("Live application", "coffee-shop-omega-lovat.vercel.app"),
    ("Live API", "ground-and-grain-api.onrender.com/api/health"),
    ("Repository", "github.com/kabelomoshe881-design/coffee-shop"),
    ("Date", "11 November 2026"),
]
meta = doc.add_table(rows=0, cols=2)
_no_borders(meta)
meta.autofit = False
for label, value in meta_rows:
    cells = meta.add_row().cells
    cells[0].width = Cm(3.8)
    cells[1].width = Cm(12.0)
    par = cells[0].paragraphs[0]
    par.paragraph_format.space_after = Pt(1)
    r1 = par.add_run(label)
    _set_run_font(r1, BODY_FONT, 9, bold=True, color=MUTED)
    par2 = cells[1].paragraphs[0]
    par2.paragraph_format.space_after = Pt(1)
    r2 = par2.add_run(value)
    _set_run_font(r2, BODY_FONT, 9, color=INK)

doc.add_paragraph()

members_caption = doc.add_paragraph()
members_caption.paragraph_format.space_before = Pt(14)
members_caption.paragraph_format.space_after = Pt(4)
mrun = members_caption.add_run("GROUP MEMBERS")
_set_run_font(mrun, BODY_FONT, 8, bold=True, color=MUTED)

members = doc.add_table(rows=1, cols=3)
members.style = "Table Grid"
members.autofit = False
_cell_margins(members)
for i, text in enumerate(("Name and surname", "Student number", "Contribution area")):
    cell = members.rows[0].cells[i]
    _cell_shading(cell, "F3EAD9")
    cell.width = Cm(6.6 if i == 0 else 3.6 if i == 1 else 6.2)
    par = cell.paragraphs[0]
    par.paragraph_format.space_after = Pt(0)
    run = par.add_run(text)
    _set_run_font(run, BODY_FONT, 8.4, bold=True)

for area in ("Backend API and data model", "Customer experience", "Staff dashboard and auth", "Design system and styling", "Documentation and deployment"):
    cells = members.add_row().cells
    for i, text in enumerate(("[ full name ]", "[ student number ]", area)):
        cells[i].text = ""
        par = cells[i].paragraphs[0]
        par.paragraph_format.space_after = Pt(0)
        run = par.add_run(text)
        colour = BROWN if text.startswith("[") else INK
        _set_run_font(run, BODY_FONT, 8.4, color=colour)

for row in members.rows:
    row.cells[0].width = Cm(6.6)
    row.cells[1].width = Cm(3.6)
    row.cells[2].width = Cm(6.2)
_fixed_layout(members, 16.4)

wordcount = doc.add_paragraph()
wordcount.paragraph_format.space_before = Pt(12)
wc_run = wordcount.add_run("Word count: ")
_set_run_font(wc_run, BODY_FONT, 8.5, color=MUTED)

# --------------------------------------------------------------------------
# DECLARATION
# --------------------------------------------------------------------------

doc.add_page_break()
FIRST_H1[0] = False

h1("Declaration", new_page=False)
p(
    "We declare that this report and the application it describes are our own work. "
    "Where we used someone else's code, documentation or idea, we say so in the text or "
    "in the reference list. We have not copied another group's project, and we have not "
    "submitted this work for another module."
)
p(
    "We also declare that the live application at the URL on the cover page was built from "
    "the source code in the repository listed there. The screenshots in this report were "
    "taken from that deployment, not from a local copy."
)

sign = doc.add_table(rows=1, cols=3)
sign.style = "Table Grid"
sign.autofit = False
_cell_margins(sign)
for i, text in enumerate(("Name and surname", "Student number", "Signature")):
    cell = sign.rows[0].cells[i]
    _cell_shading(cell, "F3EAD9")
    cell.width = Cm(7.0 if i == 0 else 4.4 if i == 1 else 5.0)
    par = cell.paragraphs[0]
    par.paragraph_format.space_after = Pt(0)
    run = par.add_run(text)
    _set_run_font(run, BODY_FONT, 8.6, bold=True)

for _ in range(5):
    cells = sign.add_row().cells
    for i in range(3):
        cells[i].text = ""
        cells[i].width = Cm(7.0 if i == 0 else 4.4 if i == 1 else 5.0)
        par = cells[i].paragraphs[0]
        par.paragraph_format.space_after = Pt(8)
        run = par.add_run(" ")
        _set_run_font(run, BODY_FONT, 8.6)

for row in sign.rows:
    row.cells[0].width = Cm(7.0)
    row.cells[1].width = Cm(4.4)
    row.cells[2].width = Cm(5.0)
_fixed_layout(sign, 16.4)

p("Signed at ____________________________ on ____________________.", space_before=14)

h2("Note on AI-assisted tools")
p(
    "We used AI assistants while building this project. They helped with scaffolding the "
    "initial structure, drafting parts of the documentation and reviewing code for bugs. "
    "Every suggestion was read, tested and changed where it did not fit. The two defects in "
    "Section 5.4 were found by running the application in a browser and were fixed by us. "
    "We can explain any part of the code in the viva."
)

# --------------------------------------------------------------------------
# ABSTRACT
# --------------------------------------------------------------------------

h1("Abstract")
p(
    "Ground & Grain is a small coffee shop, and the problem we chose is the one almost every "
    "campus café has: ordering happens out loud. A customer reads the board, joins the queue, "
    "says the order, and then stands aside until someone calls a name. The queue is longer than "
    "the work behind it, sold-out items stay on the board, and nobody knows the day's takings "
    "until a supervisor adds up the slips."
)
p(
    "We built a web system that moves that conversation onto a phone. Customers see the live "
    "menu, build a cart that survives a page refresh, place an order and watch it move from "
    "pending to collected. Staff sign in to a dashboard where they can change availability, "
    "work the queue and see today's revenue without doing any arithmetic. The front end is "
    "React, the API is Express, and all data lives in Redis as JSON documents under explicit "
    "keys, with index sets standing in for the queries a relational database would give us."
)
p(
    "We tested the API with ten automated tests, checked the interface in a real browser at "
    "three screen sizes, measured colour contrast instead of assuming it, and deployed both "
    "halves to free hosting. The system is live at the URLs on the cover page."
)

# --------------------------------------------------------------------------
# CONTENTS
# --------------------------------------------------------------------------

h1_plain("Contents")
for _title, _page in TOC_ENTRIES:
    add_toc_entry(_title, _page)

# --------------------------------------------------------------------------
# 1 INTRODUCTION
# --------------------------------------------------------------------------

h1("1. Introduction")

h2("1.1 Background and problem")
p(
    "We worked from the scenario in the brief: a campus coffee shop with a counter, a printed "
    "menu board and a morning rush. The shop is small enough that the staff know the menu by "
    "heart, which is probably why nobody had ever written the ordering process down. Written out, "
    "it has four steps: read the board, queue to say the order out loud, pay, and wait for a name. "
    "Only the third step really needs a person, and even that could happen at collection. The rest "
    "is information moving through a queue at the speed of conversation."
)
p(
    "Customers cannot see an accurate menu without joining the queue, and staff have no single "
    "place to manage availability, work orders in sequence or measure the day's takings. The "
    "result is waiting that does not need to happen, mistakes when an item runs out, and no "
    "operational visibility. A browser-based system can take the queue off the critical path, "
    "because the order is captured before the customer reaches the counter rather than after."
)

h2("1.2 Objectives")
bullets([
    "Build a customer menu that shows live availability, works on a phone, and filters without reloading.",
    "Keep the cart across refreshes, turn checkout into a shareable order number, and show progress without a refresh.",
    "Protect a staff area, and enforce every write rule on the server rather than in the browser.",
    "Give staff menu management, a live order board, an orders table and daily totals.",
    "Store everything in a key-value NoSQL database, with indexes so that reads do not scan the whole store.",
    "Meet WCAG 2.2 AA contrast and support light and dark themes.",
    "Deploy to public URLs on free infrastructure and verify it there.",
], numbered=True)

h2("1.3 Scope")
p(
    "The system covers ordering and shop operations, not payment. Orders are collected and paid for "
    "at the counter, and the checkout panel says so, because a student project that pretends to "
    "take card payments is worse than one that is honest about not doing it. There is one staff "
    "account instead of a user-management system: the brief asks for staff-only endpoints, not for "
    "accounts, and roles would have added a second domain without improving any assessed behaviour. "
    "Prices are stored as integer cents in South African rand. Delivery, email receipts, stock "
    "decrementing and supplier ordering are out of scope; Section 8.2 says what we would do next."
)

h2("1.4 Group roles")
table(
    ["Member", "Student number", "Primary responsibility", "Main files"],
    [
        ["[ full name ]", "[ student number ]", "Backend API, data model, automated tests", "server/src/**, server/test/**"],
        ["[ full name ]", "[ student number ]", "Customer experience: menu, cart, confirmation", "MenuPage, MenuCard, CartDrawer, ConfirmPage"],
        ["[ full name ]", "[ student number ]", "Staff dashboard, authentication, menu management", "StaffLogin, StaffDashboard, AuthContext"],
        ["[ full name ]", "[ student number ]", "Design system, theming, responsive layout", "design-system/**, styles/tokens.css"],
        ["[ full name ]", "[ student number ]", "Documentation, integration, deployment", "README.md, docs/**, vercel.json"],
    ],
    widths=[3.4, 2.8, 5.6, 4.6],
    caption_text="Group members and ownership",
)
p(
    "Work was split by layer, with one person owning each layer and a second person reviewing it. "
    "Feature work was done on branches and merged into main only after the tests passed. The "
    "history at the time of writing has five commits: the initial scaffold, the deployment "
    "blueprint and auto-seed, the live URLs, the credential fix, and the focus fix. The full log "
    "and the ownership notes are in docs/contributions.md and submission/evidence/git-history.txt."
)


# --------------------------------------------------------------------------
# 2 REQUIREMENTS
# --------------------------------------------------------------------------

h1("2. Requirements")

h2("2.1 Users")
p(
    "We kept two people in mind throughout. Thandi is a student on her way to a lecture. She is "
    "on her phone, on campus Wi-Fi, and she has about ninety seconds to order. She needs to know "
    "what is available, what it costs, and whether the order actually reached the kitchen. Sipho "
    "is the barista on shift. He has wet hands, a queue in front of him, and no patience for a "
    "screen that needs two taps to do one thing. He needs big targets, one obvious next action "
    "per order, and a way to mark something sold out the moment it runs out."
)
p(
    "A third stakeholder is the owner, who wants the day's revenue without adding up slips. That "
    "requirement is satisfied by the same data the barista already produces, which is why it "
    "appears in the dashboard rather than in a separate report. These personas come from the "
    "scenario in the brief, not from interviews, and we say so because a report that invents "
    "user research is worse than one that admits it worked from a scenario."
)

h2("2.2 Functional requirements")
table(
    ["ID", "Requirement", "Where it lives"],
    [
        ["FR-01", "Customers can view the menu grouped by category, with name, description, price and availability.", "GET /api/menu; MenuPage.jsx"],
        ["FR-02", "Customers can search by name or description and filter by category.", "Client-side filter over the fetched menu"],
        ["FR-03", "A sold-out item cannot be added to the cart.", "Disabled control, plus 409 ITEM_UNAVAILABLE on the server"],
        ["FR-04", "The cart survives a refresh and supports quantity changes and removal.", "CartContext.jsx with localStorage"],
        ["FR-05", "Checkout requires a customer name, accepts an optional note, and validates inline.", "CartDrawer.jsx; Zod schema on the server"],
        ["FR-06", "Every order gets a unique, human-readable number.", "counter:order with INCR, formatted as ORD-0001"],
        ["FR-07", "The confirmation page tracks status changes without a reload.", "ConfirmPage.jsx, polling GET /api/orders/:id every 10 s"],
        ["FR-08", "Staff can sign in, and every write endpoint requires a valid token.", "POST /api/auth/login; requireStaff middleware"],
        ["FR-09", "Staff can create, edit and delete menu items and switch availability.", "Menu CRUD routes; Menu tab"],
        ["FR-10", "Deleting an item that appears in an open order is refused.", "409 ITEM_IN_USE guard in the menu repository"],
        ["FR-11", "Staff can move an order through pending, preparing, ready and collected.", "PATCH /api/orders/:id/status, forward only"],
        ["FR-12", "Staff can filter orders and see a live three-column board.", "Orders tab; Overview board"],
        ["FR-13", "Staff can see orders today, revenue today, work in progress and ready to collect.", "GET /api/orders/summary/today"],
        ["FR-14", "The system reports its own health, including which database driver it is using.", "GET /api/health, 200 or 503"],
    ],
    widths=[1.6, 10.0, 4.8],
    caption_text="Functional requirements",
    size=8.2,
)

h2("2.3 Non-functional requirements")
table(
    ["ID", "Quality", "Target and how we met it"],
    [
        ["NFR-01", "Usability", "An order takes four interactions from the menu. No step reloads the page. Validation happens inline instead of in alert boxes."],
        ["NFR-02", "Accessibility", "WCAG 2.2 AA contrast: 22 of 22 pairs pass, lowest 6.47:1. Visible focus, full keyboard operation, focus trap in dialogs, aria-live for totals, reduced motion respected."],
        ["NFR-03", "Responsiveness", "One layout from 360 px to 1440 px, checked at 390 px, 768 px and 1440 px."],
        ["NFR-04", "Performance", "Production bundle is 211 kB of JavaScript (67 kB gzipped) and 38 kB of CSS (8 kB gzipped). No state library, UI kit or icon package."],
        ["NFR-05", "Security", "bcrypt hash, JWT with expiry, Helmet headers, CORS allowlist, 10 login attempts per 15 minutes, 20 orders per 10 minutes, 32 kB body cap."],
        ["NFR-06", "Reliability", "Redis persistence. Multi-key writes are atomic. Health endpoint checks the store. Restarting the API loses nothing."],
        ["NFR-07", "Maintainability", "Layered server, one fetch wrapper on the client, design tokens instead of hard-coded colours, ten automated tests."],
        ["NFR-08", "Portability", "Two store drivers behind one interface, so the project runs locally without installing a database."],
        ["NFR-09", "Cost", "Zero. Vercel Hobby, Render free web service, Upstash free Redis."],
    ],
    widths=[1.6, 3.0, 11.8],
    caption_text="Non-functional requirements",
    size=8.4,
)

h2("2.4 Constraints and assumptions")
bullets([
    "Free-tier hosting only. The API can cold-start after inactivity, so the interface has to cope with a slow first request.",
    "Modern evergreen browsers. No Internet Explorer support and no polyfill layer.",
    "No payment gateway, because none is available without cost or compliance work out of proportion to a student project.",
    "The database must be key-value, as the brief requires, so listing and filtering use indexes rather than SQL.",
    "The staff password is supplied as a bcrypt hash in an environment variable and is never stored in the repository.",
])

# --------------------------------------------------------------------------
# 3 DESIGN
# --------------------------------------------------------------------------

h1("3. Design")

h2("3.1 Architecture")
p(
    "The application is a three-tier system with a hard boundary between the browser and the "
    "data. The React bundle is static and can be served from any CDN. The API is the only "
    "component that holds credentials. The database accepts connections from the API and from "
    "nowhere else."
)
code(
    """
┌────────────────────────────────┐
│  React SPA  ·  Vercel          │
│  menu · cart · confirmation    │
│  staff login · dashboard       │
└───────────────┬────────────────┘
                │  Fetch API · JSON · Bearer JWT
                ▼
┌────────────────────────────────┐
│  Express REST API  ·  Render   │
│  /api/menu   /api/orders       │
│  /api/auth   /api/health       │
│  Zod · Helmet · CORS · limits  │
└───────────────┬────────────────┘
                │  ioredis over TLS
                ▼
┌────────────────────────────────┐
│  Key-value store  ·  Upstash   │
│  menu:item:{id}  → JSON        │
│  order:{id}      → JSON        │
│  index sets + sorted sets      │
└────────────────────────────────┘
""",
    size=7.4,
)
p(
    "The split is not decoration. The client can be rebuilt without touching data, the API can "
    "be replaced without changing the interface contract, and the database password exists in "
    "exactly one place. Every rule that matters is enforced where a user cannot edit it: totals, "
    "availability, status transitions and authorisation."
)

h2("3.2 Data model")
p(
    "A key-value store has no WHERE clause, so every way of reading the data has to be decided "
    "when the data is written. We keep one document per entity and a small number of explicit "
    "indexes, and we write each index in the same transaction as the document it describes."
)
table(
    ["Key", "Type", "Purpose"],
    [
        ["menu:item:{id}", "String (JSON)", "The menu item document."],
        ["menu:index", "Set", "Every menu item id. The source for GET /api/menu."],
        ["menu:category:{cat}", "Set", "Item ids per category, for filtered reads."],
        ["order:{id}", "String (JSON)", "The order, including snapshotted line prices."],
        ["orders:index", "Sorted set", "Order ids scored by creation time, newest first."],
        ["orders:status:{status}", "Set", "Order ids per status, for the board and filters."],
        ["orders:day:{YYYY-MM-DD}", "Set", "Order ids created on that day."],
        ["stats:day:{YYYY-MM-DD}", "Hash", "orderCount and revenueCents, incremented atomically."],
        ["counter:order", "Integer", "INCR source for ORD-0001 numbers."],
    ],
    widths=[5.0, 3.0, 8.4],
    caption_text="Key-value schema",
    size=8.4,
)
p(
    "Prices are copied onto the order line. Changing a menu price tomorrow must not rewrite "
    "yesterday's receipt, so the order stores the price it was sold at, not a pointer to today's "
    "price. All money is integer cents: 0.1 + 0.2 is not 0.3 in JavaScript, and a till that is "
    "one cent out after a hundred orders is a bug somebody will report. Totals are summed as "
    "integers on the server and formatted once, at the edge, in a single Intl.NumberFormat call."
)
p(
    "Multi-key writes are atomic. Creating an order writes the document and four indexes in one "
    "MULTI, so a crash cannot leave an order that exists but is missing from the board. KEYS * is "
    "never used: every listing goes through an index, so the cost of a read grows with the result, "
    "not with the size of the database."
)

h2("3.3 API design")
p(
    "The API is resource-oriented and returns JSON for everything except a 204. Twelve endpoints "
    "cover the whole system; Appendix A lists them with examples. Every error uses the same "
    "envelope, which means the client has one error path instead of a dozen:"
)
code(
    """
{ "error": { "code": "VALIDATION_ERROR",
             "message": "Some fields are invalid",
             "details": [ { "field": "priceCents",
                            "message": "Price must be at least R0.50" } ] } }
""",
    size=7.8,
)
p(
    "Status codes carry meaning instead of everything being a 400. A missing or expired token is "
    "401. An origin that is not on the allowlist is 403 CORS_BLOCKED. An unknown id is 404. A "
    "state conflict is 409, whether that is an illegal transition, an unavailable item or a "
    "delete that would orphan an order. Health returns 503 when the store is unreachable. The "
    "client can therefore tell 'you are not signed in' from 'this item is gone' without reading "
    "the message."
)

h2("3.4 Order lifecycle and security")
code(
    """
  ┌─────────┐   ┌───────────┐   ┌───────┐   ┌───────────┐
  │ pending │ → │ preparing │ → │ ready │ → │ collected │
  └─────────┘   └───────────┘   └───────┘   └───────────┘
       └──────── any other move → 409 INVALID_TRANSITION
""",
    size=8.0,
)
p(
    "The workflow is forward-only and lives in the repository, not in React. A disabled button is "
    "a convenience; the server rule is the guarantee. If a barista leaves a dashboard tab open "
    "and another barista moves the order on, the stale tab gets a 409 with the current status in "
    "the message. It fails safely instead of corrupting the queue."
)
table(
    ["Control", "How it works"],
    [
        ["Password storage", "bcrypt hash in STAFF_PASSWORD_HASH at cost 10. The plaintext password never exists on the server."],
        ["Session", "Signed JWT carrying { sub, role: \"staff\" }, eight-hour expiry, verified on every protected request."],
        ["Authorisation", "requireStaff on every write route. Public reads are limited to the menu, order tracking and health."],
        ["Headers and CORS", "Helmet sets content-type, frame and referrer policy. An explicit origin allowlist comes from FRONTEND_URL; unknown origins get 403 CORS_BLOCKED."],
        ["Rate limits", "Login 10 per 15 minutes per IP. Order creation 20 per 10 minutes. Global 300 per 15 minutes."],
        ["Input limits", "JSON body capped at 32 kB. Every write validated by a Zod schema with length and range bounds."],
        ["Fail closed", "In production, an unset STAFF_PASSWORD_HASH disables login instead of falling back to a known default."],
    ],
    widths=[3.4, 13.0],
    caption_text="Security controls",
    size=8.4,
)
p(
    "The last row is a deliberate reversal of the usual demo-friendly default. A misconfigured "
    "deployment should be unusable by staff, not open to anyone who has read the source code. We "
    "kept a development fallback for local work, gated on NODE_ENV not being production, and we "
    "tested the production behaviour by booting the API without a hash and watching login return 401."
)

h2("3.5 Interface design")
p(
    "The interface comes from a design system recorded in design-system/ground-and-grain/MASTER.md. "
    "Every colour, space, radius and motion value is a CSS custom property in tokens.css, so "
    "components never hard-code a hex value. That is what makes the dark theme a token swap "
    "rather than a second stylesheet. Warm brown on cream reads as coffee without the cliché of "
    "pure black; Playfair Display carries the headings, Karla keeps controls legible, and order "
    "numbers use a mono face where 0 and O are unambiguous. Feedback is a skeleton on first load, "
    "a silent refresh after that, inline field errors, and a toast for actions that leave the "
    "screen. Motion is 120 to 220 ms on state change only and is disabled under "
    "prefers-reduced-motion."
)

# --------------------------------------------------------------------------
# 4 IMPLEMENTATION
# --------------------------------------------------------------------------

h1("4. Implementation")

h2("4.1 Stack")
table(
    ["Layer", "Choice", "Why this, and not the alternative"],
    [
        ["Frontend", "React 18 + Vite 6", "The component model fits the menu, cart and dashboard split. Vite gives fast reloads and a 211 kB production bundle with no framework runtime."],
        ["Routing", "react-router-dom 6", "Confirmation has to be a real URL. A single-page state machine would break reloads and sharing."],
        ["Styling", "Hand-written CSS with tokens", "No utility-class churn and no build step for styles. The design system stays readable to someone opening the file."],
        ["Backend", "Express 4 (ESM)", "Twelve endpoints do not need more ceremony. The middleware model maps cleanly onto auth, validation and errors."],
        ["Validation", "Zod 3", "One schema per write, and the issues become the details array without hand-written branching."],
        ["Auth", "JWT + bcryptjs", "Stateless sessions suit a single free-tier instance, and bcrypt is deliberately slow."],
        ["Database", "Redis via ioredis", "Key-value as required, with atomic MULTI, sets and sorted sets. Enough structure to avoid scanning."],
        ["Testing", "Vitest + Supertest", "Tests run against the real Express app and a real store, in about four seconds."],
    ],
    widths=[2.8, 4.2, 9.4],
    caption_text="Technology choices",
    size=8.4,
)

h2("4.2 The server")
p(
    "The application is created by a factory, createApp({ store, config }), rather than at import "
    "time. That one decision is what makes the API testable: a test can build an app with a "
    "temporary file store and a test configuration, with no ports, no environment variables and "
    "no state shared between tests."
)
p(
    "Order creation is the most delicate operation in the system. The client sends item ids and "
    "quantities only. The server re-reads every item, rejects unavailable ones, recalculates the "
    "total from the current price, copies that price onto each line, allocates the next order "
    "number and writes the document plus four indexes in one transaction:"
)
code(
    """
const orderNumber =
  `ORD-${String(await store.incr('counter:order')).padStart(4, '0')}`;

const multi = store.multi();
multi.set(`order:${id}`, JSON.stringify(order));
multi.zadd('orders:index', createdAtMs, id);
multi.sadd(`orders:status:${order.status}`, id);
multi.sadd(`orders:day:${day}`, id);
multi.hincrby(`stats:day:${day}`, 'orderCount', 1);
multi.hincrby(`stats:day:${day}`, 'revenueCents', order.totalCents);
await multi.exec();
""",
    size=7.8,
)
p(
    "The total is never taken from the request. One of the tests sends totalCents: 1 next to two "
    "items priced at R30 and asserts that the stored total is 6000 cents. The server ignores the "
    "client's arithmetic completely. The daily summary is incremented inside the same "
    "transaction, so it cannot drift away from the orders it describes."
)
p(
    "Deletion has a similar guard. Before removing an item, the repository checks the open-order "
    "indexes for an order that references it. If one exists, the request fails with 409 "
    "ITEM_IN_USE rather than leaving a receipt that points at a menu item which no longer exists."
)

h2("4.3 The client")
p(
    "The cart is the part people notice. Lines are stored as { itemId, name, priceCents, qty } in "
    "localStorage and rehydrated on boot, so a refresh, a phone call or an accidental "
    "back-navigation does not lose an order. The total shown in the drawer is calculated from "
    "those lines, but it is display only. The authoritative total is the one the server returns."
)
p(
    "One module, api.js, performs every request, attaches the bearer token when there is one, "
    "parses the error envelope and throws a typed ApiError. No component contains fetch "
    "boilerplate or checks response.ok. The confirmation page polls GET /api/orders/:id every ten "
    "seconds and stops once the order is collected. We chose polling over WebSockets on purpose: "
    "the data changes at human speed, the free-tier API may be asleep, and ten seconds is one "
    "request per order per ten seconds rather than a permanently open connection. A failed poll "
    "is silent and tries again on the next tick; only the first load can show an error."
)

h2("4.4 Case study: the dialog that closed itself")
p(
    "Near the end of the project, typing a single character into the Add menu item dialog moved "
    "focus to the close button, and the next keystroke dismissed the form. On screen it looked "
    "like a state bug. It was actually an effect dependency."
)
p(
    "The modal's useEffect listed onClose in its dependency array, and the parent passed an "
    "inline arrow function. Every keystroke produced a new function identity, so React tore down "
    "the effect and ran it again. The cleanup restored focus to the button that opened the "
    "dialog, and the setup then focused the first focusable element inside it, which is the X "
    "button, because it comes before the form in the DOM. The fix was to keep the callback in a "
    "ref and depend only on open, so the effect runs once per open and close. Focus now lands on "
    "the first form field, and a Tab trap keeps keyboard users inside the dialog. A seven-check "
    "browser test covers focus on open, typing a full word, Shift+Tab wrapping and Escape."
)
p(
    "This is the bug we talk about most, because it was invisible in code review and obvious in "
    "a browser. We found it by reproducing the exact user action, not by reading the component.",
    italic=True,
)

# --------------------------------------------------------------------------
# 5 TESTING
# --------------------------------------------------------------------------

h1("5. Testing and quality assurance")

h2("5.1 Automated API tests")
p(
    "We tested in proportion to the risk. Business rules that can lose money or corrupt state are "
    "covered by ten automated integration tests against the real Express app, using Vitest and "
    "Supertest. Each test gets a fresh temporary file store, so there is no ordering dependency "
    "and no state carried between tests."
)
table(
    ["#", "Test", "What it proves"],
    [
        ["1", "Health reports the store driver", "The health endpoint is wired to the real store and reports ok with the driver name."],
        ["2", "Lists seeded items publicly", "The menu is readable without a token and returns the stored items."],
        ["3", "Rejects writes without a token", "Authorisation is enforced on the server, not hidden in the interface."],
        ["4", "Validates the payload", "A short name, a negative price and an unknown category produce 400 VALIDATION_ERROR with field details."],
        ["5", "Returns 404 for an unknown item", "A missing resource is distinguished from a validation failure."],
        ["6", "Recomputes totals from server prices", "A client-supplied total of one cent is ignored; two R30 items store 6000 cents."],
        ["7", "Rejects an unavailable item", "Availability is enforced at order time with 409 ITEM_UNAVAILABLE."],
        ["8", "Enforces forward-only transitions", "pending to collected fails with 409; pending to preparing succeeds."],
        ["9", "Blocks deleting an item in an open order", "The delete guard returns 409 ITEM_IN_USE."],
        ["10", "Returns a daily summary", "Order count, revenue and per-status counts are correct after an order."],
    ],
    widths=[1.0, 6.2, 9.2],
    caption_text="Automated API tests",
    size=8.4,
)
p(
    "All ten tests pass. We re-ran the suite after every change, including the credentials fix and "
    "the focus fix, so the result is from the submitted code rather than an earlier version:",
    space_after=2,
)
code(
    """
 ✓ test/api.test.js (10 tests) 466ms
   Tests  10 passed (10)        Duration  4.65s
""",
    size=8.2,
)

h2("5.2 Browser scenarios")
p(
    "These were run against the deployed application in Chromium, not against a mock. Each row is "
    "a real interaction with real data."
)
table(
    ["#", "Scenario", "Observed result"],
    [
        ["1", "Load the menu cold", "16 items in four categories. Skeleton replaced by content. No console errors."],
        ["2", "Search for 'flat'", "Only matching items remain. Clearing the field restores the full menu."],
        ["3", "Add two items and change a quantity", "Badge and total update immediately. The stepper respects the maximum."],
        ["4", "Refresh with a populated cart", "Cart survives, and the badge and total are restored from localStorage."],
        ["5", "Checkout without a name", "Inline error, focus moves to the name field, no request is sent."],
        ["6", "Place a valid order", "Navigates to /order/{id}, unique ORD- number, tracker shows pending."],
        ["7", "Reload the confirmation URL", "The same order renders. The deep link resolves through the Vercel rewrite."],
        ["8", "Sign in with the staff password", "200, token stored, dashboard loads."],
        ["9", "Sign in with a wrong password", "401 with a message that does not reveal which field was wrong."],
        ["10", "Advance an order", "The card moves column, the customer page updates on its next poll, revenue is unchanged."],
        ["11", "Create a menu item", "It appears in the Menu tab and on the customer menu after a refresh."],
        ["12", "Type in the add-item dialog", "The full word is typed, focus stays in the field, the modal stays open."],
    ],
    widths=[1.0, 5.4, 10.0],
    caption_text="End-to-end scenarios on the deployed site",
    size=8.4,
)

h2("5.3 Accessibility, responsiveness and performance")
p(
    "The target was WCAG 2.2 AA. We measured contrast on the rendered tokens instead of assuming "
    "it: 22 of 22 foreground and background pairs pass, and the lowest ratio is 6.47:1 against a "
    "4.5:1 requirement for body text. Every interactive element can be reached and operated by "
    "keyboard, and the focus ring is never removed without a replacement. Dialogs move focus to "
    "the first field, trap Tab and Shift+Tab, close on Escape and return focus to the button that "
    "opened them. Cart totals and order status use aria-live='polite', so a screen reader "
    "announces changes without stealing focus. Icon-only buttons have an aria-label, and fields "
    "are associated with their labels and error text through aria-describedby."
)
p(
    "We checked the layout at 390 × 844, 768 × 1024 and 1440 × 900. On a phone the menu becomes a "
    "single column, the cart becomes a full-height sheet, and the dashboard board stacks "
    "vertically. The application was exercised in Chromium with no console errors, and because it "
    "uses only standard CSS and ES2020 features it runs unchanged in current Chrome, Firefox and "
    "Safari. The production bundle is 211 kB of JavaScript (67 kB gzipped) and 38 kB of CSS (8 kB "
    "gzipped), with no state library, UI kit or icon package; icons are inline SVG and fonts load "
    "with display=swap."
)

h2("5.4 Defects found and fixed")
table(
    ["ID", "Defect", "Severity", "What we did"],
    [
        ["D-01", "Demo credentials were displayed on the login screen and written into the README.", "High (security)",
         "Removed the hint, rewrote the documentation to require a hash, disabled the production fallback, and verified with a live 401."],
        ["D-02", "The menu-item dialog lost focus after the first character, so the next keypress closed it.", "High (usability)",
         "The effect now depends only on open, focus goes to the first field, and a Tab trap was added. A seven-check regression test covers it."],
        ["D-03", "The API rejected the deployed frontend with 403 CORS_BLOCKED.", "Medium (deployment)",
         "Set FRONTEND_URL to the exact Vercel origin and documented the requirement in DEPLOY.md."],
    ],
    widths=[1.4, 6.0, 3.0, 6.0],
    caption_text="Defect log",
    size=8.2,
)

# --------------------------------------------------------------------------
# 6 DEPLOYMENT
# --------------------------------------------------------------------------

h1("6. Deployment")

h2("6.1 Where everything runs")
table(
    ["Component", "Host", "URL and configuration"],
    [
        ["Frontend", "Vercel Hobby", "coffee-shop-omega-lovat.vercel.app. Root client, npm run build, output dist. VITE_API_URL is baked in at build time."],
        ["API", "Render free web service", "ground-and-grain-api.onrender.com. Root server, npm ci then npm start. NODE_ENV=production, REDIS_URL, FRONTEND_URL, JWT_SECRET, STAFF_USERNAME and STAFF_PASSWORD_HASH."],
        ["Database", "Upstash Redis free", "TLS connection string set only on Render. AUTO_SEED seeds 16 items the first time the API boots against an empty store."],
        ["Source", "GitHub", "github.com/kabelomoshe881-design/coffee-shop, branch main. A push triggers both deployments."],
    ],
    widths=[2.8, 4.4, 9.2],
    caption_text="Deployment topology and configuration",
    size=8.4,
)

h2("6.2 Deployment procedure")
bullets([
    "Created the Upstash database and copied the rediss:// connection string.",
    "Created the Render web service from the repository with root directory server. The included render.yaml blueprint creates it with the right build and start commands.",
    "Added the environment variables. The password hash was generated locally; the plaintext password was never pasted into a dashboard that keeps logs.",
    "Deployed and checked that /api/health returned 200 with driver redis.",
    "Imported the repository into Vercel with root directory client and set VITE_API_URL.",
    "Checked that the deployed frontend could read the menu and that the API logged no CORS errors. client/vercel.json and client/public/_redirects make deep links resolve on either host.",
], numbered=True)

h2("6.3 What the free tier costs us")
p(
    "A free Render service sleeps after about fifteen minutes of inactivity, and the first request "
    "can take up to a minute. Rather than hide that, the interface treats the first request as "
    "potentially slow: skeletons, a retry action, and no spinner that runs forever. The README "
    "says to warm the health URL before a demo. There is one API instance and no horizontal "
    "scaling, but all state lives in Redis, so the API is stateless apart from the JWT secret and "
    "a restart loses nothing. The host disk is ephemeral, which is why the file driver is "
    "development only; production uses Redis and the health endpoint reports the driver so a "
    "mistake is visible. Upstash quotas are respected because indexes avoid KEYS * and every read "
    "is proportional to the result rather than the database."
)

h2("6.4 Live verification")
p(
    "We checked the deployed system after the final deployment rather than assuming the local "
    "build was proof."
)
table(
    ["Check", "Result"],
    [
        ["GET /api/health", "200, driver redis, ok true"],
        ["Menu from the deployed API", "16 items"],
        ["Order created through the deployed interface", "201, unique ORD- number, confirmation route survives a reload"],
        ["Staff login on the deployed API", "200, token issued"],
        ["Staff dashboard with live data", "Orders listed, status advanced, summary revenue correct"],
        ["Production bundle inspection", "No demo hint, no password, no hash"],
        ["Console during the full flow", "Zero errors"],
        ["Persistence across requests", "Order counter incremented and survived later requests"],
        ["Records read back from the live instance", "33 keys, 16 menu documents, 7 orders, counter at 7, daily revenue R520.00"],
    ],
    widths=[7.6, 8.8],
    caption_text="Live verification results",
    size=8.4,
)
p(
    "A deployed app that returns the right JSON is not proof that anything was stored. Before we "
    "called the project finished we wrote a small read-only script, "
    "submission/capture_db_evidence.mjs, which opens the same rediss:// connection the API uses "
    "and walks the keyspace with SCAN instead of KEYS *. It reads only: no writes, no deletes, no "
    "expiry changes. The output is saved as submission/evidence/database-records.txt and is "
    "reproduced in Figure 1."
)
figure(
    "13-database-records.png",
    "Records read back from the live Upstash key-value store on 11 November 2026: 33 keys, 16 menu documents, 7 orders and the full ORD-0007 document.",
    width_cm=15.8,
)

# --------------------------------------------------------------------------
# 7 CHALLENGES
# --------------------------------------------------------------------------

h1("7. Challenges and lessons")

rich([
    ("CORS compares strings, not intentions. ", True),
    "Our first deployment returned 403 CORS_BLOCKED even though the frontend URL looked right. "
    "Origins are compared as exact strings: a trailing slash, http instead of https, or a preview "
    "domain is a different origin. The fix was to set FRONTEND_URL to the canonical Vercel domain "
    "with no trailing slash, and to log the rejected origin so the next person does not have to "
    "guess.",
])
rich([
    ("Environment variables that are baked in. ", True),
    "Vite inlines VITE_* variables at build time. Editing the value in the Vercel dashboard "
    "changes nothing until the project is rebuilt. We lost time to a build that still pointed at "
    "localhost because the variable was added after the deployment. The deployment procedure now "
    "treats the variable and the redeploy as one step.",
])
rich([
    ("Thinking in key-value. ", True),
    "The instinct from a relational database is to fetch everything and filter in the application. "
    "That works with sixteen menu items and fails with sixteen thousand orders. This design forces "
    "every access path to be named in advance: an index per status, per day and per category, plus "
    "a sorted set for recency. The board, the orders table and the summary are all index reads, and "
    "none of them scans the keyspace.",
])
rich([
    ("Effects, identity and focus. ", True),
    "The dialog bug in Section 4.4 is the clearest lesson of the project. React compares "
    "dependencies by identity, and an inline arrow function is a new function on every render. The "
    "bug was invisible in review and obvious in a browser. The rule we took away is simple: an "
    "effect that moves focus should run once per open, never once per render.",
])
rich([
    ("Security defaults are a product decision. ", True),
    "The first build shipped a demo password so that the project just worked. That is convenient "
    "for a marker and unacceptable for a deployed system, because it puts a working credential in "
    "the bundle and in the README. Removing it meant changing the documentation, the login screen, "
    "the stylesheet and the server fallback, and then proving the fallback was gone by booting in "
    "production mode without a hash and watching login return 401.",
])
rich([
    ("Secrets. ", True),
    "During development a database connection string and a staff password were pasted into a chat "
    "window while we were debugging a deployment. Neither is in the repository or in the client "
    "bundle, and the password only ever existed on the server as a bcrypt hash, but we treat both "
    "as exposed. Rotation is part of the handover: the staff password is replaced with a new hash "
    "in the Render environment and the Upstash credential is regenerated. The repository contains "
    "no .env file, only an .env.example with empty values, and .gitignore covers the local "
    "environment and the file database.",
])

# --------------------------------------------------------------------------
# 8 CONCLUSION
# --------------------------------------------------------------------------

h1("8. Conclusion and future work")

h2("8.1 What we achieved")
p(
    "The project delivers a working, deployed system rather than a prototype. A customer can "
    "browse a live menu, build a cart that survives a refresh, place an order in four interactions "
    "and watch it progress to collection. A barista can sign in, manage availability, work a "
    "forward-only queue and see the day's revenue without touching a calculator. Every rule that "
    "protects money or state is enforced on the server, every input is validated, and the whole "
    "system runs on free infrastructure with durable storage."
)
p(
    "The objectives in Section 1.2 were met. The functional areas are demonstrated in the "
    "screenshots and at the live URLs, the ten automated tests pass, accessibility was measured "
    "rather than asserted, and the deployment was verified with the same flows a marker will use. "
    "The two defects we found late, the visible demo password and the self-closing dialog, were "
    "fixed at the cause, covered by tests and written up here."
)

h2("8.2 What we would do next")
bullets([
    "Multiple staff accounts and roles: a staff:{id} document, a role claim in the JWT, and a permission check per route.",
    "Payment: a payment intent created on the server and a webhook that marks the order paid, keeping the API as the source of truth.",
    "Notifications: email or SMS when an order is ready, triggered by the status transition.",
    "Stock control: decrement ingredients per sale and mark items unavailable at zero, inside the transaction that already exists.",
    "Analytics: revenue by hour and best-selling items, starting from the daily hash with a monthly rollup key.",
    "End-to-end tests in CI, run against a disposable Redis container on every pull request.",
])

h2("8.3 What we learned")
p(
    "The most useful outcome was not the feature list. It was the discipline the constraints forced "
    "on us. A key-value store made us design the data model instead of discovering it. A free tier "
    "made the interface honest about latency. A single staff account made authorisation explicit. "
    "And a bug that only appeared when a person typed into a form reminded us that automated tests "
    "check the behaviour you thought of, while acceptance testing finds the behaviour you did not."
)

# --------------------------------------------------------------------------
# REFERENCES
# --------------------------------------------------------------------------

h1("References", new_page=False)
refs = [
    "Meta Open Source. React — The library for web and native user interfaces. https://react.dev (accessed November 2026).",
    "Vite. Vite — Next Generation Frontend Tooling. https://vite.dev (accessed November 2026).",
    "OpenJS Foundation. Express — Fast, unopinionated, minimalist web framework for Node.js. https://expressjs.com (accessed November 2026).",
    "MDN Web Docs. Fetch API. https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API (accessed November 2026).",
    "Redis Ltd. Redis data types: sets, sorted sets and hashes. https://redis.io/docs/latest/develop/data-types/ (accessed November 2026).",
    "Upstash. Redis — Serverless Redis. https://upstash.com/docs/redis (accessed November 2026).",
    "W3C. Web Content Accessibility Guidelines (WCAG) 2.2. https://www.w3.org/TR/WCAG22/ (accessed November 2026).",
    "OWASP Foundation. OWASP Top 10 — 2021. https://owasp.org/www-project-top-ten/ (accessed November 2026).",
    "Zod. Zod — TypeScript-first schema validation. https://zod.dev (accessed November 2026).",
    "Jones, M., Bradley, J. and Sakimura, N. JSON Web Token (JWT), RFC 7519. IETF, 2015.",
    "Provos, N. and Mazières, D. A Future-Adaptable Password Scheme. USENIX Annual Technical Conference, 1999.",
    "Vercel. Deploying a Vite project. https://vercel.com/docs/frameworks/vite (accessed November 2026).",
    "Render. Blueprint specification (render.yaml). https://render.com/docs/blueprint-spec (accessed November 2026).",
]
for i, ref in enumerate(refs, 1):
    par = doc.add_paragraph()
    par.paragraph_format.left_indent = Cm(0.8)
    par.paragraph_format.first_line_indent = Cm(-0.8)
    par.paragraph_format.space_after = Pt(3)
    par.paragraph_format.line_spacing = 1.05
    run = par.add_run("%d.  %s" % (i, ref))
    _set_run_font(run, BODY_FONT, 9)

# --------------------------------------------------------------------------
# APPENDIX A
# --------------------------------------------------------------------------

h1("Appendix A — API reference")
table(
    ["Method", "Endpoint", "Auth", "Success and notable errors"],
    [
        ["GET", "/api/health", "public", "200 with driver and uptime; 503 if the store is down"],
        ["GET", "/api/menu", "public", "200, all items"],
        ["GET", "/api/menu/:id", "public", "200; 404 NOT_FOUND"],
        ["POST", "/api/menu", "staff", "201; 400 VALIDATION_ERROR; 401"],
        ["PUT", "/api/menu/:id", "staff", "200; 400; 404"],
        ["DELETE", "/api/menu/:id", "staff", "204; 409 ITEM_IN_USE"],
        ["GET", "/api/orders", "staff", "200; 401"],
        ["GET", "/api/orders/summary/today", "staff", "200 with count, revenue and by-status"],
        ["GET", "/api/orders/:id", "public", "200; 404"],
        ["POST", "/api/orders", "public", "201; 400; 409 ITEM_UNAVAILABLE; 429"],
        ["PATCH", "/api/orders/:id/status", "staff", "200; 409 INVALID_TRANSITION"],
        ["POST", "/api/auth/login", "public", "200 with token; 401; 429"],
    ],
    widths=[2.0, 6.0, 2.0, 6.4],
    caption_text="API endpoints",
    size=8.2,
)
h3("Example: create an order")
code(
    """
POST /api/orders
Content-Type: application/json

{ "customerName": "Thabo", "note": "Oat milk, no sugar",
  "items": [ { "itemId": "290f804a-02a3-4d04-ac03-e9c9e8915402", "qty": 2 } ] }

201 Created
{ "data": { "id": "a4366e9c-b0be-47e9-899c-ef86a0d8f125",
            "orderNumber": "ORD-0007", "customerName": "Thabo",
            "status": "pending", "totalCents": 4400,
            "items": [ { "itemId": "290f804a-…", "name": "Americano",
                         "priceCents": 2200, "qty": 2 } ],
            "createdAt": "2026-11-10T13:48:00.000Z" } }
""",
    size=7.6,
)
h3("Example: an illegal status transition")
code(
    """
PATCH /api/orders/a4366e9c-…/status      Authorization: Bearer <token>
{ "status": "ready" }

409 Conflict
{ "error": { "code": "INVALID_TRANSITION",
             "message": "Cannot move an order from pending to ready. The next step is preparing." } }
""",
    size=7.6,
)

# --------------------------------------------------------------------------
# APPENDIX B
# --------------------------------------------------------------------------

h1("Appendix B — Records and screenshots")
p(
    "Below is one order exactly as it is stored in the live database, followed by an index of every "
    "screenshot in submission/screenshots/. Figure 1 in Section 6.4 is the live key-value store "
    "itself; Figures 2 and 3 here show the customer menu and the staff order board."
)
h3("Order document as stored")
code(
    """
{
  "id": "af86c681-5efe-43db-b493-9d39f695cb49",
  "orderNumber": "ORD-0007",
  "customerName": "leluma",
  "note": "no sugar",
  "items": [
    { "itemId": "b4804488-…", "name": "Rooibos Tea",
      "priceCents": 2000, "qty": 1, "lineTotalCents": 2000 }
  ],
  "totalCents": 12600,
  "status": "collected",
  "createdAt": "2026-11-10T14:12:12.877Z",
  "updatedAt": "2026-11-10T14:13:19.614Z"
}
""",
    size=7.8,
)
h3("Screenshots")
figure("01-menu-light.png", "Customer menu in the light theme at 1440 × 900.")
figure("07-dashboard-orders.png", "Orders table with one-click status advancement.")
p(
    "Screenshots 01 to 12 were captured from the deployed application at "
    "coffee-shop-omega-lovat.vercel.app on 10 November 2026, not from a local build. Screenshot 13 "
    "is the database rather than the interface. All files are in submission/screenshots/.",
    size=9,
    color=MUTED,
)
table(
    ["File", "What it shows"],
    [
        ["01-menu-light.png", "Customer menu, light theme, 1440 × 900"],
        ["02-menu-search.png", "Search filtering the menu"],
        ["03-cart.png", "Cart drawer with quantities and checkout form"],
        ["04-confirmation.png", "Order confirmation and status tracker"],
        ["05-staff-login.png", "Staff sign-in screen"],
        ["06-dashboard-overview.png", "Daily totals and live order board"],
        ["07-dashboard-orders.png", "Orders table with status actions"],
        ["08-dashboard-menu.png", "Menu management list"],
        ["09-menu-editor.png", "Add-item dialog with focus in the name field"],
        ["10-menu-dark.png", "Dark theme"],
        ["11-mobile-menu.png", "Menu at 390 × 844"],
        ["12-mobile-cart.png", "Cart sheet at 390 × 844"],
        ["13-database-records.png", "Live key-value store: keyspace, indexes and one stored order"],
    ],
    widths=[6.0, 10.4],
    caption_text="Screenshot index",
    size=8.4,
)

# --------------------------------------------------------------------------
# word count + save

# --------------------------------------------------------------------------

words = 0
for par in doc.paragraphs:
    words += len(par.text.split())
for tbl in doc.tables:
    for row in tbl.rows:
        for cell in row.cells:
            words += len(cell.text.split())

if WORD_COUNT:
    # Word's own statistic, passed in from the measuring pass
    words = int(WORD_COUNT.replace(",", "").replace(" ", ""))

wc_run.text = "Word count: approximately %s words (body text, tables and appendices)." % format(words, ",")

doc.save(OUT)
print("saved", OUT)
print("approx words", words)
