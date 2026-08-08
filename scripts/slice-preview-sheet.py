#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Slice the ChatGPT 4x4 cat sheet into the 16 preview asset filenames."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PREVIEWS = ROOT / "public" / "assets" / "art" / "previews"
SOURCE_DIR = PREVIEWS / "_source"
SIZE = 256

# Rows: style × hat
ROWS = [
    ("plain", "no-hat"),
    ("plain", "hat"),
    ("fairytale", "no-hat"),
    ("fairytale", "hat"),
]

# Columns: composition × sharpness
COLS = [
    ("offset", "soft"),
    ("center", "soft"),
    ("offset", "sharp"),
    ("center", "sharp"),
]


def find_sheet() -> Path:
    matches = sorted(PREVIEWS.glob("ChatGPT*.png")) + sorted(SOURCE_DIR.glob("ChatGPT*.png"))
    if not matches:
        raise FileNotFoundError("ChatGPT sheet PNG not found in previews/")
    return matches[0]


def trim_near_white(im: Image.Image, threshold: int = 245, pad: int = 2) -> Image.Image:
    """Crop outer near-white grid gutters."""
    rgb = im.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    assert px is not None

    def is_border(x: int, y: int) -> bool:
        r, g, b = px[x, y]
        return r >= threshold and g >= threshold and b >= threshold

    left = 0
    while left < w and all(is_border(left, y) for y in range(h)):
        left += 1
    right = w - 1
    while right > left and all(is_border(right, y) for y in range(h)):
        right -= 1
    top = 0
    while top < h and all(is_border(x, top) for x in range(w)):
        top += 1
    bottom = h - 1
    while bottom > top and all(is_border(x, bottom) for x in range(w)):
        bottom -= 1

    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(w - 1, right + pad)
    bottom = min(h - 1, bottom + pad)
    return rgb.crop((left, top, right + 1, bottom + 1))


def process_cell(cell: Image.Image, sharpness: str) -> Image.Image:
    trimmed = trim_near_white(cell)
    out = trimmed.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    # Soft variants get a light blur so soft/sharp remains readable in-game.
    if sharpness == "soft":
        out = out.filter(ImageFilter.GaussianBlur(0.9))
    return out


def main() -> None:
    sheet_path = find_sheet()
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    archived = SOURCE_DIR / sheet_path.name
    if sheet_path.parent != SOURCE_DIR:
        shutil.copy2(sheet_path, archived)
        sheet_path.unlink()
        sheet_path = archived

    sheet = Image.open(sheet_path).convert("RGB")
    w, h = sheet.size
    cw, ch = w // 4, h // 4
    print(f"sheet {sheet_path.name} {w}x{h} cell {cw}x{ch}")

    # Remove previous mapped assets (keep README/manifest/source).
    for old in PREVIEWS.glob("cat-*.png"):
        old.unlink()

    assets = []
    for r, (style, hat) in enumerate(ROWS):
        for c, (composition, sharpness) in enumerate(COLS):
            key = f"cat-{style}-{hat}-{composition}-{sharpness}"
            # Inset 1px to avoid shared grid seams.
            box = (c * cw + 1, r * ch + 1, (c + 1) * cw - 1, (r + 1) * ch - 1)
            cell = sheet.crop(box)
            out = process_cell(cell, sharpness)
            dest = PREVIEWS / f"{key}.png"
            out.save(dest, "PNG")
            assets.append({"key": key, "file": dest.name, "row": r, "col": c})
            print("wrote", dest.relative_to(ROOT))

    manifest = {
        "count": 16,
        "size": SIZE,
        "source": str(sheet_path.relative_to(ROOT)),
        "mapping": {
            "rows": [{"index": i, "style": s, "hat": h} for i, (s, h) in enumerate(ROWS)],
            "cols": [{"index": i, "composition": c, "sharpness": sh} for i, (c, sh) in enumerate(COLS)],
        },
        "note": "QC stamp + quality band remain CSS overlays.",
        "assets": assets,
    }
    (PREVIEWS / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("done", len(assets))


if __name__ == "__main__":
    main()
