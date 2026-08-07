#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate / refresh the 16 preview photo placeholders.

Replace these PNGs with final art using the same filenames.
QC stamp and quality (lo/mid/hi) are applied in CSS, not as separate files.
"""
from __future__ import annotations

import json
import pathlib

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "art" / "previews"
SIZE = 256

STYLES = ("plain", "fairytale")
HATS = ("hat", "no-hat")
COMPOSITIONS = ("offset", "center")
SHARPNESSES = ("soft", "sharp")

PALETTE = {
    "plain": ((126, 184, 208), (110, 154, 85), (210, 170, 110)),
    "fairytale": ((34, 70, 90), (47, 106, 104), (127, 152, 104)),
}


def keys() -> list[str]:
    return [
        f"cat-{style}-{hat}-{composition}-{sharpness}"
        for style in STYLES
        for hat in HATS
        for composition in COMPOSITIONS
        for sharpness in SHARPNESSES
    ]


def draw_placeholder(key: str) -> Image.Image:
    _, style, hat, composition, sharpness = key.split("-", 4)
    sky, ground, cat = PALETTE[style]
    img = Image.new("RGB", (SIZE, SIZE), sky)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, int(SIZE * 0.62), SIZE, SIZE), fill=ground)

    # Cat blob — offset vs center
    cx = int(SIZE * (0.32 if composition == "offset" else 0.5))
    cy = int(SIZE * 0.58)
    body = (cx - 36, cy - 28, cx + 36, cy + 40)
    draw.ellipse(body, fill=cat)
    draw.ellipse((cx - 28, cy - 52, cx + 28, cy - 8), fill=cat)
    # Ears
    draw.polygon([(cx - 24, cy - 40), (cx - 10, cy - 62), (cx - 4, cy - 36)], fill=cat)
    draw.polygon([(cx + 4, cy - 36), (cx + 10, cy - 62), (cx + 24, cy - 40)], fill=cat)
    # Eyes
    draw.ellipse((cx - 14, cy - 36, cx - 6, cy - 28), fill=(40, 40, 30))
    draw.ellipse((cx + 6, cy - 36, cx + 14, cy - 28), fill=(40, 40, 30))
    if hat == "hat":
        draw.rectangle((cx - 26, cy - 58, cx + 26, cy - 48), fill=(180, 60, 60))
        draw.rectangle((cx - 14, cy - 78, cx + 14, cy - 58), fill=(180, 60, 60))

    if sharpness == "soft":
        img = img.filter(ImageFilter.GaussianBlur(1.6))

    # Label strip for placeholder recognition
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, SIZE - 44, SIZE, SIZE), fill=(30, 24, 18))
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc", 13)
    except OSError:
        font = ImageFont.load_default()
    label = f"{style}/{hat}/{composition}/{sharpness}"
    draw.text((8, SIZE - 32), label, fill=(255, 236, 200), font=font)
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "count": 16,
        "size": SIZE,
        "note": "Replace placeholders with final art. Keep filenames. QC + quality band are CSS overlays.",
        "assets": [],
    }
    for key in keys():
        path = OUT / f"{key}.png"
        draw_placeholder(key).save(path, "PNG")
        manifest["assets"].append({"key": key, "file": path.name})
        print("wrote", path.relative_to(ROOT))
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("manifest", OUT / "manifest.json")


if __name__ == "__main__":
    main()
