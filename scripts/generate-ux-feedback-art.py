#!/usr/bin/env python3
"""Generate readable UX feedback pixel art for Meowdel.

Toy-factory palette. Does NOT touch player character assets.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "assets" / "art"

OUTLINE = (62, 42, 30, 255)
CREAM = (255, 244, 220, 255)
WHITE = (255, 255, 255, 255)
INK = (48, 36, 28, 255)
RED = (220, 84, 84, 255)
YELLOW = (247, 208, 71, 255)
TEAL = (72, 186, 164, 255)
GREEN = (96, 186, 110, 255)
PINK = (240, 150, 170, 255)
ORANGE = (236, 150, 80, 255)
BLUE = (96, 156, 220, 255)
CARD = (214, 168, 112, 255)
CARD_L = (236, 204, 152, 255)
DARK = (80, 70, 62, 255)
GRAY = (150, 140, 130, 255)
TRANS = (0, 0, 0, 0)


def img(w: int, h: int) -> Image.Image:
    return Image.new("RGBA", (w, h), TRANS)


def put(im: Image.Image, x: int, y: int, color, w: int = 1, h: int = 1) -> None:
    px = im.load()
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            if 0 <= xx < im.width and 0 <= yy < im.height:
                px[xx, yy] = color


def rect(im: Image.Image, x: int, y: int, w: int, h: int, fill, outline=OUTLINE) -> None:
    put(im, x, y, fill, w, h)
    put(im, x, y, outline, w, 1)
    put(im, x, y + h - 1, outline, w, 1)
    put(im, x, y, outline, 1, h)
    put(im, x + w - 1, y, outline, 1, h)


def save(rel: str, im: Image.Image) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    print("wrote", path.relative_to(ROOT.parent.parent.parent))


def make_keycap_z() -> None:
    im = img(18, 18)
    rect(im, 1, 1, 16, 15, CARD_L)
    put(im, 2, 2, CREAM, 14, 11)
    put(im, 1, 14, CARD, 16, 2)
    # Z glyph
    put(im, 5, 4, INK, 8, 2)
    put(im, 10, 6, INK, 2, 2)
    put(im, 8, 8, INK, 2, 2)
    put(im, 6, 10, INK, 2, 2)
    put(im, 5, 12, INK, 8, 2)
    save("ui/keycap_z.png", im)


def make_guide_arrow() -> None:
    im = img(16, 16)
    # soft downward chevron / arrow for world guide
    put(im, 7, 1, YELLOW, 2, 8)
    put(im, 6, 2, OUTLINE, 4, 1)
    put(im, 4, 8, YELLOW, 8, 2)
    put(im, 5, 10, YELLOW, 6, 2)
    put(im, 6, 12, YELLOW, 4, 2)
    put(im, 7, 14, YELLOW, 2, 1)
    put(im, 3, 8, OUTLINE, 1, 2)
    put(im, 12, 8, OUTLINE, 1, 2)
    put(im, 7, 15, OUTLINE, 2, 1)
    save("ui/guide_arrow.png", im)


def make_soft_glow() -> None:
    im = img(32, 32)
    # soft elliptical glow under approach targets
    for y in range(32):
        for x in range(32):
            dx = (x - 15.5) / 14
            dy = (y - 15.5) / 10
            d = dx * dx + dy * dy
            if d <= 1:
                a = int(90 * (1 - d))
                put(im, x, y, (247, 208, 71, a))
    save("ui/soft_glow.png", im)


def make_slot_available() -> None:
    im = img(32, 32)
    # dashed/soft outline for mountable empty slot
    c = TEAL
    for i in range(0, 28, 4):
        put(im, 2 + i, 2, c, 2, 2)
        put(im, 2 + i, 28, c, 2, 2)
        put(im, 2, 2 + i, c, 2, 2)
        put(im, 28, 2 + i, c, 2, 2)
    put(im, 12, 12, (72, 186, 164, 70), 8, 8)
    save("ui/slot_available.png", im)


def make_status_lamps() -> None:
    for name, fill in [
        ("status_lamp_off", GRAY),
        ("status_lamp_on", GREEN),
        ("status_lamp_ready", YELLOW),
        ("status_lamp_warn", ORANGE),
        ("status_lamp_busy", BLUE),
    ]:
        im = img(8, 8)
        put(im, 2, 2, OUTLINE, 4, 4)
        put(im, 3, 3, fill, 2, 2)
        put(im, 3, 2, WHITE, 1, 1)
        save(f"ui/{name}.png", im)


def make_customer_sweat() -> None:
    im = img(8, 10)
    put(im, 3, 1, BLUE, 2, 5)
    put(im, 2, 5, BLUE, 4, 2)
    put(im, 3, 7, BLUE, 2, 2)
    put(im, 4, 1, WHITE, 1, 2)
    save("ui/customer_sweat.png", im)


def make_order_icon_small() -> None:
    im = img(12, 12)
    rect(im, 2, 1, 8, 10, CREAM)
    put(im, 4, 3, INK, 4, 1)
    put(im, 4, 5, INK, 4, 1)
    put(im, 4, 7, INK, 3, 1)
    save("ui/order_icon_small.png", im)


def make_fx(name: str, drawer) -> None:
    im = img(16, 16)
    drawer(im)
    save(f"effects/{name}.png", im)


def draw_pickup(im: Image.Image) -> None:
    put(im, 7, 2, YELLOW, 2, 2)
    put(im, 3, 6, YELLOW, 2, 2)
    put(im, 11, 6, YELLOW, 2, 2)
    put(im, 5, 10, CREAM, 6, 2)
    put(im, 7, 8, WHITE, 2, 2)


def draw_insert(im: Image.Image) -> None:
    put(im, 6, 2, TEAL, 4, 8)
    put(im, 4, 8, TEAL, 8, 3)
    put(im, 7, 3, WHITE, 2, 4)


def draw_complete(im: Image.Image) -> None:
    put(im, 2, 7, YELLOW, 12, 2)
    put(im, 7, 2, YELLOW, 2, 12)
    put(im, 4, 4, ORANGE, 2, 2)
    put(im, 10, 4, ORANGE, 2, 2)
    put(im, 4, 10, ORANGE, 2, 2)
    put(im, 10, 10, ORANGE, 2, 2)
    put(im, 7, 7, WHITE, 2, 2)


def draw_success(im: Image.Image) -> None:
    # heart + spark
    put(im, 3, 4, PINK, 3, 3)
    put(im, 8, 4, PINK, 3, 3)
    put(im, 4, 7, PINK, 6, 3)
    put(im, 5, 10, PINK, 4, 2)
    put(im, 6, 12, PINK, 2, 1)
    put(im, 12, 2, YELLOW, 2, 2)


def draw_error(im: Image.Image) -> None:
    put(im, 3, 3, RED, 3, 3)
    put(im, 10, 3, RED, 3, 3)
    put(im, 6, 6, RED, 4, 4)
    put(im, 3, 10, RED, 3, 3)
    put(im, 10, 10, RED, 3, 3)
    put(im, 4, 4, WHITE, 1, 1)
    put(im, 11, 4, WHITE, 1, 1)


def draw_ready(im: Image.Image) -> None:
    put(im, 2, 6, (247, 208, 71, 120), 12, 4)
    put(im, 4, 4, YELLOW, 8, 2)
    put(im, 4, 10, YELLOW, 8, 2)
    put(im, 6, 5, WHITE, 4, 6)


def draw_sparkle(im: Image.Image) -> None:
    put(im, 7, 1, WHITE, 2, 4)
    put(im, 5, 3, WHITE, 6, 2)
    put(im, 2, 7, YELLOW, 2, 2)
    put(im, 12, 7, YELLOW, 2, 2)
    put(im, 7, 11, WHITE, 2, 3)


def make_floor_flow() -> None:
    im = img(24, 8)
    put(im, 0, 3, (96, 156, 220, 110), 18, 2)
    put(im, 16, 1, (96, 156, 220, 140), 2, 6)
    put(im, 18, 2, (96, 156, 220, 140), 2, 4)
    put(im, 20, 3, (96, 156, 220, 140), 3, 2)
    save("environment/floor_flow.png", im)


def improve_items() -> None:
    # Paper order slip silhouette
    order = img(16, 16)
    put(order, 3, 12, (0, 0, 0, 50), 10, 2)
    rect(order, 3, 1, 10, 12, CREAM)
    put(order, 11, 1, CARD_L, 2, 3)  # folded corner
    put(order, 5, 4, INK, 6, 1)
    put(order, 5, 6, INK, 6, 1)
    put(order, 5, 8, INK, 4, 1)
    put(order, 5, 10, TEAL, 3, 1)
    save("items/item_order.png", order)

    # Polaroid product silhouette
    product = img(16, 16)
    put(product, 2, 13, (0, 0, 0, 55), 12, 2)
    rect(product, 2, 1, 12, 13, WHITE)
    put(product, 3, 2, BLUE, 10, 8)
    put(product, 4, 3, TEAL, 4, 3)
    put(product, 9, 5, YELLOW, 3, 3)
    put(product, 4, 11, INK, 5, 1)
    put(product, 10, 11, PINK, 2, 1)
    save("items/item_product.png", product)

    # Soft blob shadow
    shadow = img(16, 8)
    for y in range(8):
        for x in range(16):
            dx = (x - 7.5) / 7
            dy = (y - 3.5) / 3
            d = dx * dx + dy * dy
            if d <= 1:
                a = int(90 * (1 - d))
                put(shadow, x, y, (40, 28, 18, a))
    save("items/item_shadow.png", shadow)


def improve_interact_hint() -> None:
    # Keep legacy key but prefer keycap_z in scene; refresh as Z keycap alias
    im = img(16, 16)
    rect(im, 1, 2, 14, 12, CARD_L)
    put(im, 2, 3, CREAM, 12, 8)
    put(im, 5, 5, INK, 6, 1)
    put(im, 9, 6, INK, 2, 1)
    put(im, 7, 7, INK, 2, 1)
    put(im, 5, 8, INK, 2, 1)
    put(im, 5, 9, INK, 6, 1)
    save("ui/interact_hint.png", im)


def main() -> None:
    make_keycap_z()
    make_guide_arrow()
    make_soft_glow()
    make_slot_available()
    make_status_lamps()
    make_customer_sweat()
    make_order_icon_small()
    make_floor_flow()
    improve_items()
    improve_interact_hint()
    make_fx("fx_pickup", draw_pickup)
    make_fx("fx_insert", draw_insert)
    make_fx("fx_complete", draw_complete)
    make_fx("fx_success", draw_success)
    make_fx("fx_error", draw_error)
    make_fx("fx_ready", draw_ready)
    make_fx("fx_sparkle", draw_sparkle)
    print("UX feedback art generation complete.")


if __name__ == "__main__":
    main()
