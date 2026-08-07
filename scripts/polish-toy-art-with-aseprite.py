#!/usr/bin/env python3
"""Polish toy factory art: richer station/chip detail + multi-frame sheets.

Creates source PNGs, then relies on scripts/export-with-aseprite-mcp.mjs
(aseprite-mcp package handlers) for .ase convert + sprite sheet export.

Does NOT touch PlayerAnim Cat_* assets.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "assets" / "art"
SRC = Path(__file__).resolve().parents[1] / "public" / "assets" / "aseprite-src"

OUTLINE = (62, 42, 30, 255)
SHADOW = (120, 78, 48, 255)
CARD_D = (176, 122, 74, 255)
CARD = (214, 168, 112, 255)
CARD_L = (236, 204, 152, 255)
CREAM = (255, 244, 220, 255)
WHITE = (255, 255, 255, 255)
INK = (48, 36, 28, 255)
RED = (220, 84, 84, 255)
YELLOW = (247, 208, 71, 255)
TEAL = (72, 186, 164, 255)
BLUE = (96, 156, 220, 255)
LAVENDER = (180, 140, 220, 255)
GREEN = (96, 186, 110, 255)
PINK = (240, 150, 170, 255)
ORANGE = (236, 150, 80, 255)
GRAY = (150, 140, 130, 255)
DARK = (80, 70, 62, 255)
TRANS = (0, 0, 0, 0)


def img(w: int, h: int) -> Image.Image:
    return Image.new("RGBA", (w, h), TRANS)


def put(im: Image.Image, x: int, y: int, color, w: int = 1, h: int = 1) -> None:
    px = im.load()
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            if 0 <= xx < im.width and 0 <= yy < im.height:
                px[xx, yy] = color


def outline_box(im: Image.Image, x: int, y: int, w: int, h: int, fill) -> None:
    put(im, x, y, fill, w, h)
    put(im, x, y, OUTLINE, w, 1)
    put(im, x, y + h - 1, OUTLINE, w, 1)
    put(im, x, y, OUTLINE, 1, h)
    put(im, x + w - 1, y, OUTLINE, 1, h)
    if w > 3 and h > 3:
        put(im, x + 1, y + 1, CARD_L, w - 2, 1)


def save(path: Path, im: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    print("wrote", path)


def hsheet(frames: list[Image.Image]) -> Image.Image:
    w, h = frames[0].size
    sheet = img(w * len(frames), h)
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * w, 0))
    return sheet


# ---- enhanced stations ----

def machine(im: Image.Image, accent, rivets=True) -> None:
    outline_box(im, 2, 10, 44, 34, CARD)
    put(im, 2, 10, CARD_L, 44, 5)
    put(im, 2, 39, CARD_D, 44, 5)
    put(im, 6, 44, OUTLINE, 6, 2)
    put(im, 36, 44, OUTLINE, 6, 2)
    # panel screen
    put(im, 8, 18, DARK, 18, 12)
    put(im, 10, 20, accent, 14, 8)
    put(im, 12, 22, CREAM, 4, 2)
    # chunky button
    put(im, 34, 16, accent, 8, 8)
    put(im, 36, 18, CREAM, 3, 3)
    put(im, 34, 16, OUTLINE, 8, 1)
    # lamp
    put(im, 8, 12, accent, 5, 5)
    put(im, 9, 13, CREAM, 2, 2)
    if rivets:
        for x, y in ((4, 12), (43, 12), (4, 40), (43, 40)):
            put(im, x, y, SHADOW, 2, 2)


def make_stations() -> None:
    # input empty/filled
    for filled in (False, True):
        im = img(48, 48)
        machine(im, BLUE)
        outline_box(im, 12, 2, 24, 10, CARD_D)
        put(im, 14, 4, DARK, 20, 6)
        if filled:
            put(im, 16, 1, CREAM, 14, 9)
            put(im, 18, 3, INK, 10, 1)
            put(im, 18, 5, INK, 8, 1)
            put(im, 18, 7, BLUE, 6, 1)
            put(im, 26, 1, CARD_L, 4, 3)
        # feed rollers
        put(im, 14, 32, GRAY, 4, 4)
        put(im, 30, 32, GRAY, 4, 4)
        name = "station_input_filled.png" if filled else "station_input.png"
        save(ROOT / "stations" / name, im)

    # slot empty
    im = img(48, 48)
    machine(im, YELLOW)
    put(im, 12, 18, DARK, 24, 20)
    put(im, 14, 20, SHADOW, 20, 16)
    put(im, 16, 22, CARD_D, 16, 12)
    put(im, 18, 24, DARK, 12, 8)
    put(im, 20, 26, INK, 8, 1)
    put(im, 22, 14, YELLOW, 4, 4)  # guide rails
    save(ROOT / "stations" / "station_slot_empty.png", im)
    save(ROOT / "stations" / "station_slot.png", im.copy())

    # produce states
    for state, accent, window in (
        ("idle", ORANGE, DARK),
        ("busy", RED, YELLOW),
        ("done", GREEN, TEAL),
    ):
        im = img(48, 48)
        machine(im, accent)
        put(im, 10, 18, SHADOW, 28, 22)
        put(im, 12, 20, window, 24, 16)
        put(im, 14, 22, CREAM if state != "idle" else CARD_L, 20, 10)
        put(im, 16, 34, GRAY, 16, 3)  # handle
        if state == "busy":
            put(im, 20, 2, CREAM, 5, 5)
            put(im, 28, 0, WHITE, 4, 4)
            put(im, 18, 24, YELLOW, 2, 2)
            put(im, 28, 26, ORANGE, 2, 2)
        if state == "done":
            put(im, 20, 24, GREEN, 8, 6)
            put(im, 22, 26, CREAM, 4, 2)
        save(ROOT / "stations" / f"station_produce_{state}.png", im)
    save(ROOT / "stations" / "station_produce.png", Image.open(ROOT / "stations/station_produce_idle.png"))

    # output
    for ready in (False, True):
        im = img(48, 48)
        machine(im, GREEN)
        put(im, 10, 20, DARK, 28, 18)
        put(im, 12, 22, CREAM, 24, 14)
        put(im, 14, 36, GRAY, 20, 3)  # tray lip
        if ready:
            put(im, 14, 16, WHITE, 20, 18)
            put(im, 16, 18, TEAL, 16, 10)
            put(im, 18, 20, CREAM, 5, 4)
            put(im, 26, 24, YELLOW, 3, 3)
            put(im, 18, 30, GRAY, 12, 2)
        else:
            put(im, 16, 26, GRAY, 16, 4)
        name = "station_output_ready.png" if ready else "station_output_empty.png"
        save(ROOT / "stations" / name, im)
    save(ROOT / "stations" / "station_output.png", Image.open(ROOT / "stations/station_output_empty.png"))

    # shelf
    im = img(48, 40)
    outline_box(im, 2, 8, 44, 28, CARD_D)
    put(im, 2, 4, CARD, 44, 6)
    put(im, 4, 12, DARK, 40, 8)
    put(im, 4, 24, DARK, 40, 8)
    put(im, 6, 14, SHADOW, 8, 4)
    put(im, 20, 14, SHADOW, 8, 4)
    put(im, 34, 14, SHADOW, 8, 4)
    save(ROOT / "stations" / "station_module_shelf.png", im)


# ---- enhanced chips ----

MODULE_COLORS = {
    "image_maker": (BLUE, "photo"),
    "style_processor": (LAVENDER, "brush"),
    "ban_list": (RED, "ban"),
    "composition_planner": (TEAL, "frame"),
    "sharpener": (YELLOW, "spark"),
    "quality_checker": (GREEN, "check"),
}


def chip_icon(im: Image.Image, kind: str, ox: int = 9, oy: int = 11) -> None:
    if kind == "photo":
        put(im, ox, oy, CREAM, 14, 12)
        put(im, ox + 2, oy + 2, BLUE, 10, 7)
        put(im, ox + 9, oy + 1, YELLOW, 3, 3)
        put(im, ox + 3, oy + 10, INK, 8, 1)
    elif kind == "brush":
        put(im, ox + 2, oy, LAVENDER, 4, 12)
        put(im, ox, oy + 10, PINK, 10, 4)
        put(im, ox + 9, oy + 2, YELLOW, 4, 4)
        put(im, ox + 10, oy + 3, CREAM, 2, 2)
    elif kind == "ban":
        put(im, ox + 1, oy + 1, RED, 12, 12)
        put(im, ox + 1, oy + 1, OUTLINE, 12, 1)
        put(im, ox + 3, oy + 6, CREAM, 8, 2)
        put(im, ox + 6, oy + 3, CREAM, 2, 8)
    elif kind == "frame":
        put(im, ox, oy, TEAL, 14, 14)
        put(im, ox + 2, oy + 2, DARK, 10, 10)
        put(im, ox + 4, oy + 4, CREAM, 6, 6)
        put(im, ox + 6, oy + 6, TEAL, 2, 2)
    elif kind == "spark":
        put(im, ox + 6, oy, YELLOW, 2, 14)
        put(im, ox, oy + 6, YELLOW, 14, 2)
        put(im, ox + 2, oy + 2, CREAM, 3, 3)
        put(im, ox + 9, oy + 9, CREAM, 3, 3)
        put(im, ox + 9, oy + 2, WHITE, 2, 2)
    elif kind == "check":
        put(im, ox + 2, oy, GREEN, 10, 12)
        put(im, ox + 4, oy + 2, CREAM, 6, 5)
        put(im, ox + 3, oy + 9, CREAM, 8, 2)
        put(im, ox + 5, oy + 4, INK, 2, 2)


def make_modules() -> None:
    for name, (color, icon) in MODULE_COLORS.items():
        im = img(32, 32)
        outline_box(im, 3, 4, 26, 24, color)
        put(im, 5, 6, CREAM, 22, 5)
        put(im, 5, 11, CARD_L, 22, 14)
        # side contacts
        put(im, 1, 10, GRAY, 2, 3)
        put(im, 1, 16, GRAY, 2, 3)
        put(im, 29, 10, GRAY, 2, 3)
        put(im, 29, 16, GRAY, 2, 3)
        put(im, 13, 1, color, 6, 4)
        put(im, 13, 1, OUTLINE, 6, 1)
        chip_icon(im, icon)
        save(ROOT / "modules" / f"module_{name}.png", im)
    im = img(32, 32)
    outline_box(im, 3, 4, 26, 24, GRAY)
    put(im, 12, 10, YELLOW, 8, 10)
    put(im, 14, 7, YELLOW, 4, 5)
    put(im, 15, 14, DARK, 2, 3)
    save(ROOT / "modules" / "module_locked.png", im)


# ---- customers 2-frame idle ----

def animal_frame(kind: str, blink: bool) -> Image.Image:
    im = img(32, 40)
    bodies = {
        "rabbit": (CREAM, PINK),
        "dog": (ORANGE, CARD_D),
        "hamster": (CARD_L, ORANGE),
        "duck": (YELLOW, ORANGE),
    }
    body, accent = bodies[kind]
    put(im, 8, 16, body, 16, 16)
    put(im, 8, 16, OUTLINE, 16, 1)
    put(im, 8, 31, OUTLINE, 16, 1)
    put(im, 8, 16, OUTLINE, 1, 16)
    put(im, 23, 16, OUTLINE, 1, 16)
    put(im, 10, 8, body, 12, 12)
    put(im, 10, 8, OUTLINE, 12, 1)
    put(im, 10, 8, OUTLINE, 1, 12)
    put(im, 21, 8, OUTLINE, 1, 12)
    if blink:
        put(im, 13, 14, INK, 2, 1)
        put(im, 18, 14, INK, 2, 1)
    else:
        put(im, 13, 13, INK, 2, 2)
        put(im, 18, 13, INK, 2, 2)
        put(im, 13, 13, WHITE, 1, 1)
        put(im, 18, 13, WHITE, 1, 1)
    put(im, 15, 17, accent, 3, 2)
    put(im, 10, 32, accent, 4, 4)
    put(im, 18, 32, accent, 4, 4)
    if kind == "rabbit":
        put(im, 11, 1, body, 3, 9)
        put(im, 18, 1, body, 3, 9)
        put(im, 12, 2, accent, 1, 6)
        put(im, 19, 2, accent, 1, 6)
    elif kind == "dog":
        put(im, 8, 10, body, 4, 6)
        put(im, 20, 10, body, 4, 6)
        put(im, 22, 20, body, 6, 3)
    elif kind == "hamster":
        put(im, 9, 14, PINK, 3, 3)
        put(im, 20, 14, PINK, 3, 3)
    elif kind == "duck":
        put(im, 14, 18, accent, 8, 3)
        put(im, 20, 10, body, 6, 4)
    # subtle bob on blink frame
    if blink:
        shifted = img(32, 40)
        shifted.paste(im, (0, 1))
        return shifted
    return im


def make_customers() -> None:
    for kind in ("rabbit", "dog", "hamster", "duck"):
        f0 = animal_frame(kind, False)
        f1 = animal_frame(kind, True)
        # keep single-frame fallback
        save(ROOT / "customers" / f"customer_{kind}.png", f0)
        # source frames for aseprite
        save(SRC / "customers" / f"{kind}_idle_0.png", f0)
        save(SRC / "customers" / f"{kind}_idle_1.png", f1)
        sheet = hsheet([f0, f1])
        save(ROOT / "customers" / f"customer_{kind}_idle.png", sheet)
        save(SRC / "customers" / f"{kind}_idle_sheet.png", sheet)


# ---- produce particle sheet (4 frames) ----

def particle_frame(i: int) -> Image.Image:
    im = img(16, 16)
    sparks = [
        [(7, 7, YELLOW, 2, 2)],
        [(7, 3, YELLOW, 2, 2), (3, 7, ORANGE, 2, 2), (11, 7, CREAM, 2, 2), (7, 11, WHITE, 2, 2)],
        [(2, 2, YELLOW, 2, 2), (12, 2, ORANGE, 2, 2), (2, 12, CREAM, 2, 2), (12, 12, WHITE, 2, 2), (7, 7, YELLOW, 2, 2)],
        [(0, 7, ORANGE, 2, 2), (14, 7, YELLOW, 2, 2), (7, 0, CREAM, 2, 2), (7, 14, WHITE, 2, 2)],
    ]
    for x, y, c, w, h in sparks[i]:
        put(im, x, y, c, w, h)
    return im


def make_particles() -> None:
    frames = [particle_frame(i) for i in range(4)]
    for i, fr in enumerate(frames):
        save(SRC / "effects" / f"produce_spark_{i}.png", fr)
    sheet = hsheet(frames)
    save(ROOT / "effects" / "produce_spark_sheet.png", sheet)
    save(ROOT / "effects" / "produce_spark.png", frames[1])  # static fallback


# ---- counter bell (idle + ring) ----

def bell_frame(ring: int) -> Image.Image:
    im = img(16, 16)
    put(im, 4, 4, YELLOW, 8, 7)
    put(im, 5, 3, YELLOW, 6, 2)
    put(im, 6, 2, OUTLINE, 4, 1)
    put(im, 7, 10, OUTLINE, 2, 3)
    put(im, 6, 12, OUTLINE, 4, 2)
    put(im, 5, 5, CREAM, 2, 2)
    if ring == 1:
        put(im, 1, 5, ORANGE, 2, 2)
        put(im, 13, 5, ORANGE, 2, 2)
    if ring == 2:
        put(im, 0, 3, YELLOW, 2, 2)
        put(im, 14, 3, YELLOW, 2, 2)
        put(im, 0, 8, CREAM, 2, 2)
        put(im, 14, 8, CREAM, 2, 2)
    return im


def make_bell() -> None:
    frames = [bell_frame(0), bell_frame(1), bell_frame(2), bell_frame(1)]
    for i, fr in enumerate(frames):
        save(SRC / "effects" / f"counter_bell_{i}.png", fr)
    sheet = hsheet(frames)
    save(ROOT / "effects" / "counter_bell_sheet.png", sheet)
    save(ROOT / "environment" / "counter_bell.png", frames[0])


def main() -> None:
    make_stations()
    make_modules()
    make_customers()
    make_particles()
    make_bell()
    print("polish source ready")


if __name__ == "__main__":
    main()
