# -*- coding: utf-8 -*-
"""
Post-process the Word-saved report:
  * fix the cached NUMPAGES field result so non-Word viewers show the right total
  * re-add <w:updateFields> (Word removes it when it saves) so Word refreshes the TOC on open
"""
import re
import shutil
import zipfile
import os

PATH = r"C:\Users\HP\projects\coffee-shop\submission\BIWA2110-Ground-and-Grain-Report.docx"
PAGES = 34
TMP = PATH + ".tmp"

with zipfile.ZipFile(PATH, "r") as zin:
    items = [(i, zin.read(i.filename)) for i in zin.infolist()]

out = []
changed = []

for info, data in items:
    name = info.filename
    if re.match(r"word/(header|footer)\d*\.xml$", name):
        text = data.decode("utf-8")
        new, n = re.subn(
            r'(<w:instrText[^>]*>NUMPAGES</w:instrText>.*?w:fldCharType="separate".*?<w:t[^>]*>)([^<]*)(</w:t>)',
            lambda m: m.group(1) + str(PAGES) + m.group(3),
            text,
            flags=re.S,
        )
        if n:
            changed.append("%s NUMPAGES x%d" % (name, n))
        data = new.encode("utf-8")

    elif name == "word/settings.xml":
        text = data.decode("utf-8")
        if "updateFields" not in text:
            tag = '<w:updateFields w:val="true"/>'
            if "<w:compat>" in text:
                text = text.replace("<w:compat>", tag + "<w:compat>", 1)
            else:
                text = text.replace("</w:settings>", tag + "</w:settings>", 1)
            changed.append("settings.xml updateFields added")
        data = text.encode("utf-8")

    out.append((info, data))

with zipfile.ZipFile(TMP, "w", zipfile.ZIP_DEFLATED) as zout:
    for info, data in out:
        zi = zipfile.ZipInfo(info.filename, date_time=info.date_time)
        zi.compress_type = zipfile.ZIP_DEFLATED
        zi.external_attr = info.external_attr
        zout.writestr(zi, data)

shutil.move(TMP, PATH)
print("\n".join(changed) or "nothing changed")
print("size", os.path.getsize(PATH))
