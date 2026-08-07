#!/usr/bin/env python3
"""Generate cozy detailed pixel art for AI Factory.

Richer silhouettes + shading than the minimal toy placeholders.
Does NOT touch public/assets/characters/PlayerAnim.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "assets" / "art"

OUTLINE = (58, 38, 28, 255)
SHADOW = (110, 72, 46, 255)
CARD_D = (168, 112, 68, 255)
CARD = (210, 158, 104, 255)
CARD_L = (236, 198, 148, 255)
CREAM = (255, 244, 220, 255)
WHITE = (255, 255, 255, 255)
INK = (42, 30, 24, 255)
RED = (220, 78, 78, 255)
YELLOW = (247, 204, 64, 255)
TEAL = (64, 186, 168, 255)
BLUE = (88, 152, 224, 255)
LAVENDER = (176, 132, 220, 255)
GREEN = (88, 186, 108, 255)
PINK = (240, 148, 168, 255)
ORANGE = (236, 146, 74, 255)
GRAY = (148, 138, 128, 255)
DARK = (72, 62, 54, 255)
FLOOR = (228, 192, 140, 255)
FLOOR_D = (204, 164, 112, 255)
FLOOR_L = (244, 220, 176, 255)
METAL = (168, 176, 184, 255)
METAL_L = (210, 216, 222, 255)
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


def shade_box(im: Image.Image, x: int, y: int, w: int, h: int, mid, light, dark) -> None:
    put(im, x, y, mid, w, h)
    put(im, x, y, light, w, 2)
    put(im, x, y, light, 2, h)
    put(im, x, y + h - 2, dark, w, 2)
    put(im, x + w - 2, y, dark, 2, h)
    put(im, x, y, OUTLINE, w, 1)
    put(im, x, y + h - 1, OUTLINE, w, 1)
    put(im, x, y, OUTLINE, 1, h)
    put(im, x + w - 1, y, OUTLINE, 1, h)


def save(rel: str, im: Image.Image) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    print("wrote", path.relative_to(ROOT.parent.parent.parent))


def hsheet(frames: list[Image.Image]) -> Image.Image:
    w, h = frames[0].size
    sheet = img(w * len(frames), h)
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * w, 0))
    return sheet


# ---------- environment ----------

def make_floor_tile() -> None:
    im = img(32, 32)
    put(im, 0, 0, FLOOR, 32, 32)
    for y in range(0, 32, 8):
        for x in range(0, 32, 8):
            put(im, x, y, FLOOR_D, 8, 1)
            put(im, x, y, FLOOR_D, 1, 8)
            put(im, x + 1, y + 1, FLOOR_L, 3, 1)
            put(im, x + 1, y + 2, FLOOR_L, 1, 1)
    for x, y in ((4, 11), (17, 6), (23, 19), (9, 23), (26, 13), (13, 28)):
        put(im, x, y, FLOOR_D, 1, 1)
    save("environment/floor_tile.png", im)


def make_floor_dash() -> None:
    # horizontal dashed yellow guide
    im = img(24, 8)
    for x in (1, 7, 13, 19):
        put(im, x, 3, YELLOW, 4, 2)
        put(im, x, 3, OUTLINE, 4, 1)
        put(im, x, 4, ORANGE, 4, 1)
    save("environment/floor_dash.png", im)
    # arrow tip segment
    im = img(16, 12)
    put(im, 1, 5, YELLOW, 8, 2)
    put(im, 8, 3, YELLOW, 3, 6)
    put(im, 10, 4, YELLOW, 3, 4)
    put(im, 12, 5, YELLOW, 3, 2)
    put(im, 1, 5, OUTLINE, 8, 1)
    save("environment/floor_flow.png", im)


def make_wall_rim() -> None:
    im = img(32, 16)
    put(im, 0, 0, CARD_D, 32, 16)
    put(im, 0, 0, CARD_L, 32, 5)
    put(im, 0, 5, CARD, 32, 7)
    put(im, 0, 12, SHADOW, 32, 4)
    put(im, 0, 0, OUTLINE, 32, 1)
    put(im, 0, 15, OUTLINE, 32, 1)
    for x in range(4, 32, 10):
        put(im, x, 2, CREAM, 2, 2)
    save("environment/wall_rim.png", im)


def make_counter_desk() -> None:
    im = img(64, 28)
    shade_box(im, 0, 8, 64, 20, CARD_D, CARD, SHADOW)
    put(im, 0, 0, CARD, 64, 12)
    put(im, 0, 0, CARD_L, 64, 3)
    put(im, 0, 0, OUTLINE, 64, 1)
    put(im, 0, 11, OUTLINE, 64, 1)
    put(im, 48, 1, YELLOW, 10, 7)
    put(im, 50, 0, YELLOW, 6, 2)
    put(im, 52, 3, OUTLINE, 2, 3)
    put(im, 10, 3, CREAM, 20, 5)
    put(im, 12, 4, INK, 14, 1)
    put(im, 12, 6, INK, 10, 1)
    save("environment/counter_desk.png", im)


def make_conveyor() -> None:
    im = img(48, 24)
    put(im, 0, 0, DARK, 48, 24)
    put(im, 0, 0, OUTLINE, 48, 1)
    put(im, 0, 23, OUTLINE, 48, 1)
    put(im, 0, 1, METAL, 48, 2)
    put(im, 0, 21, METAL, 48, 2)
    for x in range(2, 46, 10):
        put(im, x, 4, TEAL, 8, 16)
        put(im, x + 1, 5, CARD_L, 6, 3)
        put(im, x + 1, 15, SHADOW, 6, 3)
        put(im, x + 8, 4, OUTLINE, 1, 16)
    save("environment/conveyor_belt.png", im)


def make_decor() -> None:
    im = img(24, 16)
    put(im, 2, 6, METAL, 20, 5)
    put(im, 2, 6, METAL_L, 20, 2)
    put(im, 2, 6, OUTLINE, 20, 1)
    put(im, 2, 10, OUTLINE, 20, 1)
    put(im, 18, 1, METAL, 5, 10)
    put(im, 18, 1, OUTLINE, 5, 1)
    save("environment/decor_pipe.png", im)

    im = img(24, 20)
    shade_box(im, 2, 4, 20, 14, ORANGE, YELLOW, SHADOW)
    put(im, 4, 8, CREAM, 16, 2)
    put(im, 8, 1, ORANGE, 8, 4)
    put(im, 8, 1, OUTLINE, 8, 1)
    save("environment/decor_crate.png", im)

    im = img(16, 16)
    put(im, 2, 2, YELLOW, 12, 12)
    put(im, 2, 2, OUTLINE, 12, 12)
    put(im, 3, 3, YELLOW, 10, 10)
    put(im, 7, 5, INK, 2, 5)
    put(im, 7, 11, INK, 2, 2)
    save("environment/decor_sticker.png", im)


# ---------- stations ----------

def machine_body(im: Image.Image, accent, w: int = 48, h: int = 48) -> None:
    shade_box(im, 2, 12, w - 4, h - 16, CARD, CARD_L, CARD_D)
    put(im, 6, h - 4, OUTLINE, 6, 2)
    put(im, w - 12, h - 4, OUTLINE, 6, 2)
    # panel rivets
    put(im, 5, 15, SHADOW, 1, 1)
    put(im, w - 6, 15, SHADOW, 1, 1)
    # lamp
    put(im, 7, 15, OUTLINE, 6, 6)
    put(im, 8, 16, accent, 4, 4)
    put(im, 8, 16, WHITE, 1, 1)
    # button
    put(im, w - 14, 17, OUTLINE, 8, 8)
    put(im, w - 13, 18, accent, 6, 6)
    put(im, w - 12, 19, CREAM, 2, 2)
    # side vent
    for yy in range(24, 38, 3):
        put(im, 4, yy, SHADOW, 3, 1)


def make_station_input() -> None:
    for filled in (False, True):
        im = img(48, 48)
        machine_body(im, BLUE if not filled else GREEN)
        # toaster slot housing
        shade_box(im, 12, 2, 24, 12, CARD_D, CARD, SHADOW)
        put(im, 14, 5, DARK, 20, 6)
        if filled:
            put(im, 16, 1, CREAM, 14, 10)
            put(im, 16, 1, OUTLINE, 14, 1)
            put(im, 18, 3, INK, 10, 1)
            put(im, 18, 5, INK, 8, 1)
            put(im, 18, 7, BLUE, 6, 1)
            put(im, 20, 0, METAL, 4, 2)  # clip
        else:
            put(im, 16, 6, METAL, 16, 2)
        # screen
        put(im, 12, 22, DARK, 22, 14)
        put(im, 14, 24, TEAL if filled else METAL, 18, 10)
        put(im, 16, 26, CREAM if filled else GRAY, 8, 2)
        name = "station_input_filled.png" if filled else "station_input.png"
        save(f"stations/{name}", im)


def make_station_slot() -> None:
    im = img(48, 48)
    machine_body(im, YELLOW)
    put(im, 11, 18, DARK, 26, 22)
    put(im, 13, 20, SHADOW, 22, 18)
    put(im, 15, 22, CARD_D, 18, 14)
    put(im, 17, 24, DARK, 14, 10)
    # empty well rails
    put(im, 15, 22, METAL, 18, 1)
    put(im, 15, 35, METAL, 18, 1)
    save("stations/station_slot_empty.png", im)
    save("stations/station_slot.png", im.copy())


def make_station_produce() -> None:
    for state, accent, window in (
        ("idle", ORANGE, DARK),
        ("busy", BLUE, YELLOW),
        ("done", GREEN, TEAL),
    ):
        im = img(48, 48)
        machine_body(im, accent)
        put(im, 9, 18, SHADOW, 30, 24)
        put(im, 11, 20, window, 26, 18)
        put(im, 13, 22, CREAM if state != "idle" else CARD_L, 22, 12)
        if state == "busy":
            put(im, 15, 24, YELLOW, 18, 3)
            put(im, 15, 28, ORANGE, 12, 3)
            put(im, 22, 2, CREAM, 4, 4)
            put(im, 28, 0, WHITE, 3, 3)
            put(im, 18, 1, WHITE, 2, 2)
        if state == "done":
            put(im, 16, 24, GREEN, 16, 8)
            put(im, 18, 26, WHITE, 12, 2)
            put(im, 20, 29, WHITE, 8, 2)
        save(f"stations/station_produce_{state}.png", im)
    save("stations/station_produce.png", Image.open(ROOT / "stations/station_produce_idle.png"))


def make_station_output() -> None:
    for ready in (False, True):
        im = img(48, 48)
        machine_body(im, YELLOW if ready else GREEN)
        put(im, 9, 20, DARK, 30, 20)
        put(im, 11, 22, CREAM, 26, 16)
        if ready:
            put(im, 13, 14, WHITE, 22, 20)
            put(im, 13, 14, OUTLINE, 22, 1)
            put(im, 15, 16, BLUE, 18, 12)
            put(im, 17, 18, TEAL, 8, 5)
            put(im, 26, 22, YELLOW, 4, 4)
            put(im, 17, 30, INK, 10, 1)
            # sparkle marks
            put(im, 8, 12, YELLOW, 2, 2)
            put(im, 38, 16, WHITE, 2, 2)
        else:
            put(im, 16, 28, GRAY, 16, 4)
            put(im, 18, 26, METAL, 12, 2)
        name = "station_output_ready.png" if ready else "station_output_empty.png"
        save(f"stations/{name}", im)
    save("stations/station_output.png", Image.open(ROOT / "stations/station_output_empty.png"))


def make_module_shelf() -> None:
    im = img(48, 40)
    shade_box(im, 2, 8, 44, 28, CARD_D, CARD, SHADOW)
    put(im, 4, 12, DARK, 40, 9)
    put(im, 4, 25, DARK, 40, 9)
    put(im, 2, 3, CARD, 44, 7)
    put(im, 2, 3, CARD_L, 44, 2)
    put(im, 2, 3, OUTLINE, 44, 1)
    save("stations/station_module_shelf.png", im)


# ---------- modules ----------

MODULE_COLORS = {
    "image_maker": (GREEN, "photo"),
    "style_processor": (BLUE, "brush"),
    "ban_list": (RED, "ban"),
    "composition_planner": (TEAL, "frame"),
    "sharpener": (YELLOW, "spark"),
    "quality_checker": (LAVENDER, "check"),
}


def draw_chip_icon(im: Image.Image, kind: str, ox: int = 10, oy: int = 12) -> None:
    if kind == "photo":
        put(im, ox, oy, CREAM, 12, 10)
        put(im, ox, oy, OUTLINE, 12, 1)
        put(im, ox + 2, oy + 2, BLUE, 8, 6)
        put(im, ox + 3, oy + 6, GREEN, 5, 2)
        put(im, ox + 8, oy + 3, YELLOW, 2, 2)
    elif kind == "brush":
        put(im, ox + 8, oy, BLUE, 3, 8)
        put(im, ox + 2, oy + 7, PINK, 9, 4)
        put(im, ox + 1, oy + 8, YELLOW, 3, 2)
        put(im, ox + 9, oy + 1, WHITE, 1, 3)
    elif kind == "ban":
        put(im, ox + 1, oy + 1, RED, 10, 10)
        put(im, ox + 2, oy + 2, CREAM, 8, 8)
        put(im, ox + 3, oy + 5, RED, 6, 2)
        put(im, ox + 1, oy + 1, OUTLINE, 10, 1)
    elif kind == "frame":
        put(im, ox, oy, TEAL, 12, 12)
        put(im, ox + 2, oy + 2, DARK, 8, 8)
        put(im, ox + 4, oy + 4, CREAM, 4, 4)
        put(im, ox, oy, OUTLINE, 12, 1)
    elif kind == "spark":
        put(im, ox + 5, oy, YELLOW, 2, 12)
        put(im, ox, oy + 5, YELLOW, 12, 2)
        put(im, ox + 2, oy + 2, WHITE, 2, 2)
        put(im, ox + 8, oy + 8, WHITE, 2, 2)
        put(im, ox + 8, oy + 2, CREAM, 2, 2)
    elif kind == "check":
        put(im, ox + 1, oy, LAVENDER, 10, 4)
        put(im, ox + 3, oy + 3, METAL_L, 8, 8)
        put(im, ox + 5, oy + 5, GREEN, 5, 2)
        put(im, ox + 8, oy + 7, GREEN, 2, 3)


def make_modules() -> None:
    for name, (color, icon) in MODULE_COLORS.items():
        im = img(32, 32)
        # thick cartridge silhouette
        shade_box(im, 4, 5, 24, 24, color, CREAM, SHADOW)
        put(im, 6, 7, CREAM, 20, 5)
        put(im, 6, 12, CARD_L, 20, 14)
        put(im, 6, 12, (255, 255, 255, 40), 20, 2)
        draw_chip_icon(im, icon, 10, 13)
        # edge contacts
        for yy in (14, 18, 22):
            put(im, 2, yy, METAL, 3, 2)
        put(im, 12, 2, color, 8, 4)
        put(im, 14, 1, OUTLINE, 4, 1)
        save(f"modules/module_{name}.png", im)

    im = img(32, 32)
    shade_box(im, 4, 5, 24, 24, GRAY, METAL_L, DARK)
    put(im, 12, 11, YELLOW, 8, 10)
    put(im, 14, 8, YELLOW, 4, 5)
    put(im, 15, 15, DARK, 2, 3)
    save("modules/module_locked.png", im)


# ---------- items ----------

def make_items() -> None:
    # clipped order sheet
    im = img(32, 32)
    put(im, 7, 26, (0, 0, 0, 55), 18, 3)
    shade_box(im, 6, 4, 20, 24, CREAM, WHITE, CARD_L)
    put(im, 22, 4, CARD_L, 4, 5)
    put(im, 9, 9, INK, 14, 1)
    put(im, 9, 13, INK, 12, 1)
    put(im, 9, 17, INK, 10, 1)
    put(im, 9, 21, TEAL, 8, 2)
    # metal clip
    put(im, 12, 1, METAL, 8, 5)
    put(im, 13, 2, METAL_L, 6, 2)
    put(im, 14, 0, OUTLINE, 4, 1)
    save("items/item_order.png", im)

    # framed landscape / polaroid
    im = img(32, 32)
    put(im, 6, 27, (0, 0, 0, 60), 20, 3)
    shade_box(im, 5, 2, 22, 26, WHITE, CREAM, GRAY)
    put(im, 7, 4, BLUE, 18, 14)
    put(im, 7, 12, GREEN, 18, 6)
    put(im, 9, 6, WHITE, 5, 4)
    put(im, 18, 10, YELLOW, 4, 4)
    put(im, 9, 22, INK, 10, 1)
    put(im, 20, 22, PINK, 3, 1)
    # frame rim
    put(im, 5, 2, CARD_D, 22, 1)
    put(im, 5, 2, CARD_D, 1, 26)
    put(im, 26, 2, CARD_D, 1, 26)
    save("items/item_product.png", im)

    # soft blob shadow
    shadow = img(16, 8)
    for y in range(8):
        for x in range(16):
            dx = (x - 7.5) / 7.2
            dy = (y - 3.5) / 3.0
            d = dx * dx + dy * dy
            if d <= 1:
                a = int(95 * (1 - d))
                put(shadow, x, y, (40, 28, 18, a))
    save("items/item_shadow.png", shadow)


# ---------- customers ----------

def animal_base(im: Image.Image, body, accent, anxious: bool = False) -> None:
    put(im, 8, 16, body, 16, 16)
    put(im, 8, 16, OUTLINE, 16, 1)
    put(im, 8, 31, OUTLINE, 16, 1)
    put(im, 8, 16, OUTLINE, 1, 16)
    put(im, 23, 16, OUTLINE, 1, 16)
    put(im, 9, 17, WHITE, 4, 2)
    put(im, 10, 8, body, 12, 12)
    put(im, 10, 8, OUTLINE, 12, 1)
    put(im, 10, 8, OUTLINE, 1, 12)
    put(im, 21, 8, OUTLINE, 1, 12)
    put(im, 11, 9, WHITE, 3, 2)
    if anxious:
        put(im, 12, 12, INK, 3, 2)
        put(im, 18, 12, INK, 3, 2)
        put(im, 14, 17, RED, 4, 2)
        put(im, 8, 10, BLUE, 2, 3)  # sweat
    else:
        put(im, 13, 13, INK, 2, 2)
        put(im, 18, 13, INK, 2, 2)
        put(im, 15, 17, accent, 3, 2)
    put(im, 10, 32, accent, 4, 4)
    put(im, 18, 32, accent, 4, 4)


def customer_frame(kind: str, bob: int = 0, anxious: bool = False) -> Image.Image:
    im = img(32, 40)
    if kind == "rabbit":
        animal_base(im, CREAM, PINK, anxious)
        put(im, 11, 1 + bob, CREAM, 3, 9)
        put(im, 18, 1 + bob, CREAM, 3, 9)
        put(im, 12, 2 + bob, PINK, 1, 6)
        put(im, 19, 2 + bob, PINK, 1, 6)
    elif kind == "dog":
        animal_base(im, ORANGE, CARD_D, anxious)
        put(im, 7, 10 + bob, ORANGE, 4, 7)
        put(im, 21, 10 + bob, ORANGE, 4, 7)
        put(im, 23, 20, ORANGE, 6, 3)
    elif kind == "hamster":
        animal_base(im, CARD_L, ORANGE, anxious)
        put(im, 9, 14, PINK, 3, 3)
        put(im, 20, 14, PINK, 3, 3)
        put(im, 14, 3 + bob, CARD_L, 4, 5)
    else:
        animal_base(im, YELLOW, ORANGE, anxious)
        put(im, 14, 18, ORANGE, 8, 3)
        put(im, 21, 9 + bob, YELLOW, 6, 5)
    return im


def make_customers() -> None:
    for kind in ("rabbit", "dog", "hamster", "duck"):
        f0 = customer_frame(kind, 0, False)
        f1 = customer_frame(kind, 1, False)
        save(f"customers/customer_{kind}.png", f0)
        save(f"customers/customer_{kind}_idle.png", hsheet([f0, f1]))
        # anxious still used by scene via sweat overlay; also export optional sheet
        a0 = customer_frame(kind, 0, True)
        a1 = customer_frame(kind, 1, True)
        save(f"customers/customer_{kind}_anxious.png", hsheet([a0, a1]))


# ---------- ui ----------

def make_ui() -> None:
    im = img(48, 20)
    put(im, 1, 1, CREAM, 46, 16)
    put(im, 1, 1, OUTLINE, 46, 1)
    put(im, 1, 16, OUTLINE, 46, 1)
    put(im, 1, 1, OUTLINE, 1, 16)
    put(im, 46, 1, OUTLINE, 1, 16)
    put(im, 2, 2, WHITE, 44, 2)
    put(im, 20, 17, CREAM, 8, 3)
    put(im, 22, 17, OUTLINE, 1, 3)
    put(im, 26, 17, OUTLINE, 1, 3)
    save("ui/prompt_bubble.png", im)

    # Empty track only — fill is drawn live so depletion is visible.
    im = img(52, 10)
    put(im, 0, 0, OUTLINE, 52, 10)
    put(im, 1, 1, DARK, 50, 8)
    put(im, 2, 2, (90, 78, 68, 255), 48, 6)
    save("ui/patience_frame.png", im)

    # Z keycap
    im = img(18, 18)
    shade_box(im, 1, 1, 16, 15, CARD_L, CREAM, CARD)
    put(im, 2, 2, CREAM, 14, 10)
    put(im, 5, 4, INK, 8, 2)
    put(im, 10, 6, INK, 2, 2)
    put(im, 8, 8, INK, 2, 2)
    put(im, 6, 10, INK, 2, 2)
    put(im, 5, 12, INK, 8, 2)
    save("ui/keycap_z.png", im)
    save("ui/interact_hint.png", im.copy())

    # 4-way corner brackets forming a rectangle (not identical L shapes).
    im = img(32, 32)
    # top-left ┌
    put(im, 0, 0, YELLOW, 8, 2)
    put(im, 0, 0, YELLOW, 2, 8)
    put(im, 1, 1, WHITE, 2, 1)
    # top-right ┐
    put(im, 24, 0, YELLOW, 8, 2)
    put(im, 30, 0, YELLOW, 2, 8)
    put(im, 29, 1, WHITE, 2, 1)
    # bottom-left └
    put(im, 0, 30, YELLOW, 8, 2)
    put(im, 0, 24, YELLOW, 2, 8)
    put(im, 1, 30, WHITE, 2, 1)
    # bottom-right ┘
    put(im, 24, 30, YELLOW, 8, 2)
    put(im, 30, 24, YELLOW, 2, 8)
    put(im, 29, 30, WHITE, 2, 1)
    save("ui/highlight_frame.png", im)

    # soft glow
    im = img(32, 32)
    for y in range(32):
        for x in range(32):
            dx = (x - 15.5) / 14
            dy = (y - 15.5) / 10
            d = dx * dx + dy * dy
            if d <= 1:
                put(im, x, y, (247, 208, 71, int(95 * (1 - d))))
    save("ui/soft_glow.png", im)

    # guide arrow
    im = img(16, 16)
    put(im, 7, 1, YELLOW, 2, 8)
    put(im, 4, 8, YELLOW, 8, 2)
    put(im, 5, 10, YELLOW, 6, 2)
    put(im, 6, 12, YELLOW, 4, 2)
    put(im, 7, 14, YELLOW, 2, 1)
    put(im, 3, 8, OUTLINE, 1, 2)
    put(im, 12, 8, OUTLINE, 1, 2)
    save("ui/guide_arrow.png", im)

    # slot available
    im = img(32, 32)
    for i in range(0, 28, 4):
        put(im, 2 + i, 2, TEAL, 2, 2)
        put(im, 2 + i, 28, TEAL, 2, 2)
        put(im, 2, 2 + i, TEAL, 2, 2)
        put(im, 28, 2 + i, TEAL, 2, 2)
    put(im, 12, 12, (72, 186, 164, 70), 8, 8)
    save("ui/slot_available.png", im)

    # ghosts (semi-transparent insert cues)
    for name, drawer in (
        ("ghost_order", lambda im: (rect(im, 4, 4, 12, 16, (255, 244, 220, 120)), put(im, 6, 7, (48, 36, 28, 140), 8, 1), put(im, 6, 10, (48, 36, 28, 140), 6, 1), put(im, 7, 1, (168, 176, 184, 160), 6, 3))),
        ("ghost_chip", lambda im: (rect(im, 4, 5, 14, 14, (88, 186, 108, 110)), put(im, 7, 8, (255, 255, 255, 140), 8, 6))),
        ("ghost_product", lambda im: (rect(im, 4, 3, 14, 16, (255, 255, 255, 120)), put(im, 6, 5, (88, 152, 224, 140), 10, 8))),
    ):
        im = img(20, 20)
        drawer(im)
        save(f"ui/{name}.png", im)

    # progress bar
    im = img(40, 8)
    put(im, 0, 0, OUTLINE, 40, 8)
    put(im, 1, 1, DARK, 38, 6)
    save("ui/progress_frame.png", im)
    im = img(36, 4)
    put(im, 0, 0, BLUE, 36, 4)
    put(im, 0, 0, TEAL, 36, 1)
    save("ui/progress_fill.png", im)

    # status lamps 5 colors
    for name, fill in (
        ("status_lamp_off", GRAY),
        ("status_lamp_on", GREEN),
        ("status_lamp_busy", BLUE),
        ("status_lamp_ready", YELLOW),
        ("status_lamp_warn", RED),
    ):
        im = img(8, 8)
        put(im, 2, 2, OUTLINE, 4, 4)
        put(im, 3, 3, fill, 2, 2)
        put(im, 3, 2, WHITE, 1, 1)
        save(f"ui/{name}.png", im)

    im = img(8, 10)
    put(im, 3, 1, BLUE, 2, 5)
    put(im, 2, 5, BLUE, 4, 2)
    put(im, 3, 7, BLUE, 2, 2)
    put(im, 4, 1, WHITE, 1, 2)
    save("ui/customer_sweat.png", im)

    im = img(12, 12)
    rect(im, 2, 1, 8, 10, CREAM)
    put(im, 4, 3, INK, 4, 1)
    put(im, 4, 5, INK, 4, 1)
    put(im, 4, 0, METAL, 4, 2)
    save("ui/order_icon_small.png", im)

    # COMPLETE badge
    im = img(48, 16)
    shade_box(im, 1, 1, 46, 14, GREEN, TEAL, SHADOW)
    # rough COMPLETE pixels as bars approximating letters
    put(im, 4, 4, WHITE, 6, 2)
    put(im, 4, 4, WHITE, 2, 8)
    put(im, 4, 10, WHITE, 6, 2)
    put(im, 12, 4, WHITE, 6, 2)
    put(im, 12, 4, WHITE, 2, 8)
    put(im, 12, 10, WHITE, 6, 2)
    put(im, 20, 4, WHITE, 2, 8)
    put(im, 22, 4, WHITE, 4, 2)
    put(im, 22, 7, WHITE, 3, 2)
    put(im, 22, 10, WHITE, 4, 2)
    put(im, 28, 4, WHITE, 6, 2)
    put(im, 28, 4, WHITE, 2, 8)
    put(im, 28, 10, WHITE, 6, 2)
    put(im, 36, 4, WHITE, 6, 8)
    put(im, 38, 6, GREEN, 2, 4)
    save("ui/complete_badge.png", im)

    # tutorial flow icons strip (bunny -> paper -> input) for side panel
    im = img(64, 20)
    put(im, 2, 4, CREAM, 10, 12)
    put(im, 4, 2, CREAM, 2, 4)
    put(im, 8, 2, CREAM, 2, 4)
    put(im, 14, 8, YELLOW, 4, 2)
    put(im, 20, 3, CREAM, 10, 14)
    put(im, 22, 6, INK, 6, 1)
    put(im, 22, 9, INK, 5, 1)
    put(im, 32, 8, YELLOW, 4, 2)
    put(im, 38, 4, CARD, 18, 14)
    put(im, 42, 2, BLUE, 10, 4)
    put(im, 44, 8, TEAL, 8, 6)
    save("ui/tutorial_flow.png", im)


# ---------- effects ----------

def make_fx(name: str, drawer) -> None:
    im = img(16, 16)
    drawer(im)
    save(f"effects/{name}.png", im)


def make_effects() -> None:
    make_fx("fx_pickup", lambda im: (
        put(im, 7, 2, YELLOW, 2, 2), put(im, 3, 6, YELLOW, 2, 2), put(im, 11, 6, YELLOW, 2, 2),
        put(im, 5, 10, CREAM, 6, 2), put(im, 7, 8, WHITE, 2, 2)
    ))
    make_fx("fx_insert", lambda im: (
        put(im, 6, 2, TEAL, 4, 8), put(im, 4, 8, TEAL, 8, 3), put(im, 7, 3, WHITE, 2, 4)
    ))
    make_fx("fx_complete", lambda im: (
        put(im, 2, 7, YELLOW, 12, 2), put(im, 7, 2, YELLOW, 2, 12),
        put(im, 4, 4, ORANGE, 2, 2), put(im, 10, 4, ORANGE, 2, 2),
        put(im, 4, 10, ORANGE, 2, 2), put(im, 10, 10, ORANGE, 2, 2)
    ))
    make_fx("fx_success", lambda im: (
        put(im, 3, 4, PINK, 3, 3), put(im, 8, 4, PINK, 3, 3),
        put(im, 4, 7, PINK, 6, 3), put(im, 5, 10, PINK, 4, 2),
        put(im, 6, 12, PINK, 2, 1), put(im, 12, 2, YELLOW, 2, 2)
    ))
    make_fx("fx_error", lambda im: (
        put(im, 3, 3, RED, 3, 3), put(im, 10, 3, RED, 3, 3),
        put(im, 6, 6, RED, 4, 4), put(im, 3, 10, RED, 3, 3), put(im, 10, 10, RED, 3, 3)
    ))
    make_fx("fx_ready", lambda im: (
        put(im, 2, 6, (247, 208, 71, 120), 12, 4), put(im, 4, 4, YELLOW, 8, 2),
        put(im, 4, 10, YELLOW, 8, 2), put(im, 6, 5, WHITE, 4, 6)
    ))
    make_fx("fx_sparkle", lambda im: (
        put(im, 7, 1, WHITE, 2, 4), put(im, 5, 3, WHITE, 6, 2),
        put(im, 2, 7, YELLOW, 2, 2), put(im, 12, 7, YELLOW, 2, 2), put(im, 7, 11, WHITE, 2, 3)
    ))

    # produce spark sheet 4 frames
    frames = []
    for i in range(4):
        fr = img(16, 16)
        put(fr, 7, i, YELLOW, 2, 8)
        put(fr, i, 7, YELLOW, 8, 2)
        put(fr, 3 + i, 3, WHITE, 2, 2)
        put(fr, 11 - i, 11, CREAM, 2, 2)
        frames.append(fr)
    save("effects/produce_spark_sheet.png", hsheet(frames))
    save("effects/produce_spark.png", frames[0])

    # counter bell sheet
    frames = []
    for i in range(4):
        fr = img(16, 16)
        ox = (i % 2) * 1 - 0
        put(fr, 4 + ox, 4, YELLOW, 8, 7)
        put(fr, 6 + ox, 2, YELLOW, 4, 3)
        put(fr, 7 + ox, 7, OUTLINE, 2, 3)
        if i > 0:
            put(fr, 1, 3, WHITE, 2, 2)
            put(fr, 13, 5, WHITE, 2, 2)
        frames.append(fr)
    save("effects/counter_bell_sheet.png", hsheet(frames))
    save("environment/counter_bell.png", frames[0])


def main() -> None:
    make_floor_tile()
    make_floor_dash()
    make_wall_rim()
    make_counter_desk()
    make_conveyor()
    make_decor()
    make_station_input()
    make_station_slot()
    make_station_produce()
    make_station_output()
    make_module_shelf()
    make_modules()
    make_items()
    make_customers()
    make_ui()
    make_effects()
    print("cozy factory art generation complete")


if __name__ == "__main__":
    main()
