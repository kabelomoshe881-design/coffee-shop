# -*- coding: utf-8 -*-
"""
Build the two submission archives.

    python submission/make_zips.py

  BIWA2110-Ground-and-Grain-Source.zip   runnable code and docs, no report
  BIWA2110-Ground-and-Grain-Package.zip  the whole handover, report included
"""

import os
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

EXCLUDE_DIRS = {
    ".git", "node_modules", "dist", "build", "coverage", ".vite", ".cache",
    ".idea", ".vscode", "__pycache__", ".pytest_cache", "venv", ".venv",
}
EXCLUDE_SUFFIXES = (".zip", ".log", ".tmp")
EXCLUDE_FILES = {".env", ".DS_Store", "Thumbs.db"}
# local runtime artefacts
EXCLUDE_RELATIVE = {"server/data/db.json"}


def _skip_in_submission(rel):
    """Keep editor duplicates and stray exports out of the handover archive."""
    if not rel.startswith("submission/"):
        return False
    name = rel.rsplit("/", 1)[-1]
    return " - Copy" in name or name == "BIWA2110-Ground-and-Grain-Report.pdf"

SOURCE_ZIP = os.path.join(HERE, "BIWA2110-Ground-and-Grain-Source.zip")
PACKAGE_ZIP = os.path.join(HERE, "BIWA2110-Ground-and-Grain-Package.zip")


def walk(include_submission):
    for dirpath, dirnames, filenames in os.walk(ROOT):
        rel_dir = os.path.relpath(dirpath, ROOT).replace("\\", "/")
        if rel_dir == ".":
            rel_dir = ""

        dirnames[:] = sorted(
            d for d in dirnames
            if d not in EXCLUDE_DIRS
            and not (d == "submission" and not include_submission)
        )

        for name in sorted(filenames):
            if name in EXCLUDE_FILES or name.endswith(EXCLUDE_SUFFIXES) or ".bak" in name:
                continue
            if name.startswith("~$"):
                continue
            rel = (rel_dir + "/" + name).lstrip("/")
            if rel in EXCLUDE_RELATIVE:
                continue
            if _skip_in_submission(rel):
                continue
            if rel.startswith("submission/") and name.endswith(".zip"):
                continue
            yield os.path.join(dirpath, name), rel


def build(path, prefix, include_submission):
    count = 0
    total = 0
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for full, rel in walk(include_submission):
            if os.path.abspath(full) in (os.path.abspath(SOURCE_ZIP), os.path.abspath(PACKAGE_ZIP)):
                continue
            z.write(full, prefix + "/" + rel)
            count += 1
            total += os.path.getsize(full)
    print("%-46s %4d files  %6.1f MB raw  %5.1f MB zipped" % (
        os.path.basename(path), count, total / 1e6, os.path.getsize(path) / 1e6))


build(SOURCE_ZIP, "coffee-shop", include_submission=False)
build(PACKAGE_ZIP, "BIWA2110-Ground-and-Grain", include_submission=True)
