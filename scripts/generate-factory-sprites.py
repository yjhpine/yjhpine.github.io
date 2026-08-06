#!/usr/bin/env python3
"""Generate cardboard-box factory sprites matching player cat palette.

Player cat sprites under public/assets/characters/PlayerAnim are REFERENCE ONLY.
Do not modify those files from this script.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[1] / "public" / "assets" / "factory"

# Palette sampled from Cat_Idle.png + cardboard accents
W = (255, 255, 255, 255)
ORANGE = (217, 160, 102, 255)
DARK = (44, 43, 50, 255)
GRAY = (55, 55, 55, 255)
LIGHT = (205, 205, 205, 255)
BOX_L = (220, 180, 130, 255)
BOX = (196, 148, 98, 255)
BOX_D = (150, 105, 65, 255)
INSET = (28, 36, 48, 255)
FLOOR = (18, 52, 78, 255)
FLOOR_H = (28, 74, 104, 255)
FLOOR_L = (45, 100, 130, 255)
WALL = (16, 44, 68, 255)
WALL_D = (12, 36, 58, 255)
TEAL = (90, 170, 160, 255)
GREEN = (90, 170, 110, 255)
GOLD = (247, 208, 71, 255)
TRANS = (0, 0, 0, 0)


def img(w: int, h: int) -> Image.Image:
    return Image.new("RGBA", (w, h), TRANS)


def put(im: Image.Image, x: int, y: int, color, w: int = 1, h: int = 1) -> None:
    px = im.load()
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            if 0 <= xx < im.width and 0 <= yy < im.height:
                px[xx, yy] = color


def box_frame(im: Image.Image, x: int, y: int, w: int, h: int) -> None:
    put(im, x, y, BOX_L, w, max(1, h // 2))
    put(im, x, y + h // 2, BOX, w, h - h // 2)
    put(im, x, y + h - 2, BOX_D, w, 2)
    put(im, x, y, DARK, w, 1)
    put(im, x, y + h - 1, DARK, w, 1)
    put(im, x, y, DARK, 1, h)
    put(im, x + w - 1, y, DARK, 1, h)


def tiny_cat(im: Image.Image, cx: int, cy: int) -> None:
    # Minimal white cat face inspired by player sheet (not a copy of frames).
    put(im, cx - 3, cy - 4, W, 7, 8)
    put(im, cx - 3, cy - 5, W, 2, 2)  # left ear
    put(im, cx + 2, cy - 5, W, 2, 2)  # right ear
    put(im, cx + 3, cy - 5, ORANGE, 1, 1)
    put(im, cx - 2, cy - 1, DARK, 1, 1)
    put(im, cx + 1, cy - 1, DARK, 1, 1)
    put(im, cx + 4, cy + 2, W, 2, 1)  # tail tip


def save(name: str, im: Image.Image) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    im.save(path)
    print("wrote", path)


def make_floor() -> None:
    im = img(32, 32)
    for y in range(0, 32, 8):
        for x in range(0, 32, 8):
            put(im, x, y, FLOOR, 8, 8)
            put(im, x, y, FLOOR_H, 8, 1)
            put(im, x, y, FLOOR_H, 1, 8)
            put(im, x + 1, y + 1, FLOOR_L, 1, 1)
            put(im, x + 2, y + 2, FLOOR_H, 1, 1)
            put(im, x + 3, y + 3, FLOOR_L, 1, 1)
    save("floor-tile.png", im)


def make_wall() -> None:
    im = img(64, 32)
    put(im, 0, 0, WALL_D, 64, 32)
    put(im, 0, 0, WALL, 64, 18)
    for i, ox in enumerate((4, 24, 44)):
        box_frame(im, ox, 8, 16, 18)
        put(im, ox + 2, 10, INSET, 12, 10)
        tiny_cat(im, ox + 8, 16 + (i % 2))
    save("wall-boxes.png", im)


def make_conveyor() -> None:
    im = img(48, 24)
    put(im, 0, 0, (20, 40, 58, 255), 48, 24)
    for x in range(0, 48, 8):
        put(im, x, 4, BOX_L, 6, 4)
        put(im, x, 10, BOX, 6, 6)
        put(im, x, 16, BOX_D, 6, 4)
        put(im, x + 6, 4, DARK, 2, 16)
    save("conveyor.png", im)


def make_counter() -> None:
    im = img(64, 28)
    put(im, 0, 8, (18, 50, 74, 255), 64, 20)
    box_frame(im, 0, 0, 64, 14)
    for x in (10, 30, 50):
        put(im, x, 4, W, 4, 3)
        put(im, x + 1, 5, DARK, 1, 1)
    save("counter.png", im)


def make_station(name: str, accent) -> None:
    im = img(48, 40)
    box_frame(im, 2, 6, 44, 30)
    put(im, 20, 2, BOX_L, 8, 5)
    put(im, 20, 2, DARK, 8, 1)
    put(im, 8, 12, INSET, 32, 18)
    put(im, 14, 14, accent, 20, 12)
    put(im, 16, 16, INSET, 16, 8)
    tiny_cat(im, 24, 28)
    save(name, im)


def make_module(name: str, mark) -> None:
    im = img(32, 32)
    box_frame(im, 2, 4, 28, 26)
    put(im, 10, 1, TEAL, 12, 4)
    put(im, 12, 2, DARK, 8, 2)
    put(im, 5, 8, INSET, 22, 16)
    tiny_cat(im, 16, 16)
    # Distinctive mark pixels
    for x, y, c in mark:
        put(im, x, y, c, 1, 1)
    save(name, im)


def make_locked() -> None:
    im = img(32, 32)
    box_frame(im, 2, 4, 28, 26)
    put(im, 5, 8, GRAY, 22, 16)
    put(im, 14, 12, GOLD, 4, 6)
    put(im, 13, 10, GOLD, 6, 2)
    put(im, 15, 14, DARK, 2, 2)
    save("module-locked.png", im)


def make_customer() -> None:
    im = img(32, 40)
    box_frame(im, 4, 12, 24, 24)
    put(im, 6, 14, INSET, 20, 14)
    tiny_cat(im, 16, 22)
    # Order paper
    put(im, 12, 4, W, 8, 10)
    put(im, 13, 6, DARK, 6, 1)
    put(im, 13, 8, DARK, 5, 1)
    put(im, 13, 10, DARK, 4, 1)
    save("customer.png", im)


def make_shadow() -> None:
    im = img(16, 8)
    put(im, 2, 2, (0, 0, 0, 90), 12, 4)
    put(im, 4, 1, (0, 0, 0, 60), 8, 1)
    put(im, 4, 6, (0, 0, 0, 60), 8, 1)
    save("drop-shadow.png", im)


def main() -> None:
    make_floor()
    make_wall()
    make_conveyor()
    make_counter()
    make_station("station-input.png", (90, 140, 200, 255))
    make_station("station-slot.png", GOLD)
    make_station("station-produce.png", ORANGE)
    make_station("station-output.png", GREEN)
    make_module("module-image-maker.png", [(8, 9, ORANGE), (23, 9, ORANGE)])
    make_module("module-style-processor.png", [(8, 9, TEAL), (23, 20, TEAL)])
    make_module("module-ban-list.png", [(8, 9, (220, 80, 80, 255)), (23, 9, (220, 80, 80, 255))])
    make_module("module-composition-planner.png", [(8, 20, LIGHT), (23, 9, LIGHT)])
    make_module("module-sharpener.png", [(8, 9, GOLD), (23, 20, GOLD)])
    make_module("module-quality-checker.png", [(8, 9, GREEN), (23, 9, GREEN)])
    make_locked()
    make_customer()
    make_shadow()


if __name__ == "__main__":
    main()
