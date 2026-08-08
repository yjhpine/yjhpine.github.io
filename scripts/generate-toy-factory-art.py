#!/usr/bin/env python3
"""Generate Cute Pixel Art Toy Meowdel assets.

Does NOT touch public/assets/characters/PlayerAnim (player cat is out of scope).
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "assets" / "art"

# Warm cardboard + toy accents (no cyberpunk navy)
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
FLOOR = (232, 198, 148, 255)
FLOOR_D = (210, 170, 118, 255)
FLOOR_L = (244, 220, 178, 255)
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
    # top-left highlight
    if w > 2 and h > 2:
        put(im, x + 1, y + 1, CARD_L if fill in (CARD, CARD_D, FLOOR) else CREAM, max(1, w - 2), 1)


def save(rel: str, im: Image.Image) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    print("wrote", path.relative_to(ROOT.parent.parent.parent))


# ---------- environment ----------

def make_floor_tile() -> None:
    im = img(32, 32)
    put(im, 0, 0, FLOOR, 32, 32)
    for y in range(0, 32, 8):
        for x in range(0, 32, 8):
            put(im, x, y, FLOOR_D, 8, 1)
            put(im, x, y, FLOOR_D, 1, 8)
            put(im, x + 1, y + 1, FLOOR_L, 2, 1)
    # soft cardboard speckles
    for x, y in ((5, 12), (18, 7), (24, 20), (10, 24), (27, 14)):
        put(im, x, y, FLOOR_D, 1, 1)
    save("environment/floor_tile.png", im)


def make_wall_rim() -> None:
    im = img(32, 16)
    put(im, 0, 0, CARD_D, 32, 16)
    put(im, 0, 0, CARD_L, 32, 4)
    put(im, 0, 4, CARD, 32, 8)
    put(im, 0, 12, SHADOW, 32, 4)
    put(im, 0, 0, OUTLINE, 32, 1)
    put(im, 0, 15, OUTLINE, 32, 1)
    save("environment/wall_rim.png", im)


def make_counter_desk() -> None:
    im = img(64, 28)
    rect(im, 0, 8, 64, 20, CARD_D)
    put(im, 0, 0, CARD, 64, 12)
    put(im, 0, 0, OUTLINE, 64, 1)
    put(im, 0, 11, OUTLINE, 64, 1)
    # cute bell
    put(im, 48, 2, YELLOW, 8, 6)
    put(im, 50, 1, YELLOW, 4, 1)
    put(im, 51, 0, OUTLINE, 2, 1)
    put(im, 51, 4, OUTLINE, 2, 2)
    # order slot mark
    put(im, 10, 4, CREAM, 18, 4)
    put(im, 12, 5, INK, 12, 1)
    save("environment/counter_desk.png", im)


def make_conveyor() -> None:
    im = img(48, 24)
    put(im, 0, 0, DARK, 48, 24)
    put(im, 0, 0, OUTLINE, 48, 1)
    put(im, 0, 23, OUTLINE, 48, 1)
    for x in range(2, 46, 10):
        put(im, x, 4, TEAL, 8, 16)
        put(im, x + 1, 5, CARD_L, 6, 2)
        put(im, x + 8, 4, OUTLINE, 1, 16)
    save("environment/conveyor_belt.png", im)


def make_decor() -> None:
    # small pipe
    im = img(24, 16)
    put(im, 2, 6, GRAY, 20, 4)
    put(im, 2, 6, OUTLINE, 20, 1)
    put(im, 2, 9, OUTLINE, 20, 1)
    put(im, 18, 2, GRAY, 4, 8)
    save("environment/decor_pipe.png", im)
    # toy crate
    im = img(24, 20)
    rect(im, 2, 4, 20, 14, ORANGE)
    put(im, 4, 8, CREAM, 16, 2)
    put(im, 8, 2, ORANGE, 8, 3)
    save("environment/decor_crate.png", im)
    # warning sticker
    im = img(16, 16)
    put(im, 2, 2, YELLOW, 12, 12)
    put(im, 2, 2, OUTLINE, 12, 1)
    put(im, 2, 13, OUTLINE, 12, 1)
    put(im, 7, 5, INK, 2, 5)
    put(im, 7, 11, INK, 2, 2)
    save("environment/decor_sticker.png", im)


# ---------- stations ----------

def machine_body(im: Image.Image, accent) -> None:
    rect(im, 2, 10, 44, 34, CARD)
    put(im, 2, 10, CARD_L, 44, 6)
    put(im, 2, 38, CARD_D, 44, 6)
    # feet
    put(im, 6, 44, OUTLINE, 6, 2)
    put(im, 36, 44, OUTLINE, 6, 2)
    # big button
    put(im, 36, 16, accent, 6, 6)
    put(im, 37, 17, CREAM, 2, 2)
    # lamp
    put(im, 8, 14, accent, 4, 4)


def make_station_input() -> None:
    for filled in (False, True):
        im = img(48, 48)
        machine_body(im, BLUE)
        # toaster slot
        put(im, 12, 4, CARD_D, 24, 8)
        put(im, 14, 6, DARK, 20, 4)
        if filled:
            put(im, 16, 2, CREAM, 14, 8)
            put(im, 18, 4, INK, 10, 1)
            put(im, 18, 6, INK, 8, 1)
        put(im, 14, 22, DARK, 20, 10)
        put(im, 16, 24, TEAL, 16, 6)
        name = "station_input_filled.png" if filled else "station_input.png"
        save(f"stations/{name}", im)


def make_station_slot() -> None:
    im = img(48, 48)
    machine_body(im, YELLOW)
    # cartridge bay
    put(im, 12, 18, DARK, 24, 20)
    put(im, 14, 20, SHADOW, 20, 16)
    put(im, 16, 22, CARD_D, 16, 12)  # empty well
    put(im, 18, 24, DARK, 12, 8)
    save("stations/station_slot_empty.png", im)
    # also alias empty as station_slot
    save("stations/station_slot.png", im.copy())


def make_station_produce() -> None:
    for state, accent, window in (
        ("idle", ORANGE, DARK),
        ("busy", RED, YELLOW),
        ("done", GREEN, TEAL),
    ):
        im = img(48, 48)
        machine_body(im, accent)
        # oven door
        put(im, 10, 18, SHADOW, 28, 22)
        put(im, 12, 20, window, 24, 16)
        put(im, 14, 22, CREAM if state != "idle" else CARD_L, 20, 10)
        # chimney puff for busy
        if state == "busy":
            put(im, 22, 2, CREAM, 4, 4)
            put(im, 28, 0, CREAM, 3, 3)
        save(f"stations/station_produce_{state}.png", im)
    save("stations/station_produce.png", Image.open(ROOT / "stations/station_produce_idle.png"))


def make_station_output() -> None:
    for ready in (False, True):
        im = img(48, 48)
        machine_body(im, GREEN)
        # polaroid tray
        put(im, 10, 20, DARK, 28, 18)
        put(im, 12, 22, CREAM, 24, 14)
        if ready:
            put(im, 14, 18, WHITE, 20, 16)
            put(im, 16, 20, BLUE, 16, 10)
            put(im, 18, 30, CREAM, 12, 2)
        else:
            put(im, 16, 26, GRAY, 16, 4)
        name = "station_output_ready.png" if ready else "station_output_empty.png"
        save(f"stations/{name}", im)
    save("stations/station_output.png", Image.open(ROOT / "stations/station_output_empty.png"))


def make_module_shelf() -> None:
    im = img(48, 40)
    rect(im, 2, 8, 44, 28, CARD_D)
    put(im, 4, 12, DARK, 40, 8)
    put(im, 4, 24, DARK, 40, 8)
    put(im, 2, 4, CARD, 44, 6)
    save("stations/station_module_shelf.png", im)


# ---------- modules ----------

MODULE_COLORS = {
    "image_maker": (BLUE, "photo"),
    "style_processor": (LAVENDER, "brush"),
    "ban_list": (RED, "ban"),
    "composition_planner": (TEAL, "frame"),
    "sharpener": (YELLOW, "spark"),
    "quality_checker": (GREEN, "check"),
}


def draw_chip_icon(im: Image.Image, kind: str, ox: int = 10, oy: int = 10) -> None:
    if kind == "photo":
        put(im, ox, oy, CREAM, 12, 10)
        put(im, ox + 2, oy + 2, BLUE, 8, 6)
        put(im, ox + 8, oy + 1, YELLOW, 2, 2)
    elif kind == "brush":
        put(im, ox + 2, oy, LAVENDER, 3, 10)
        put(im, ox, oy + 8, PINK, 8, 3)
        put(im, ox + 8, oy + 2, YELLOW, 3, 3)
    elif kind == "ban":
        put(im, ox + 1, oy + 1, RED, 10, 10)
        put(im, ox + 3, oy + 5, CREAM, 6, 2)
    elif kind == "frame":
        put(im, ox, oy, TEAL, 12, 12)
        put(im, ox + 2, oy + 2, DARK, 8, 8)
        put(im, ox + 4, oy + 4, CREAM, 4, 4)
    elif kind == "spark":
        put(im, ox + 5, oy, YELLOW, 2, 12)
        put(im, ox, oy + 5, YELLOW, 12, 2)
        put(im, ox + 2, oy + 2, CREAM, 2, 2)
        put(im, ox + 8, oy + 8, CREAM, 2, 2)
    elif kind == "check":
        put(im, ox + 2, oy, GREEN, 8, 10)
        put(im, ox + 4, oy + 2, CREAM, 4, 4)
        put(im, ox + 3, oy + 7, CREAM, 6, 2)


def make_modules() -> None:
    for name, (color, icon) in MODULE_COLORS.items():
        im = img(32, 32)
        rect(im, 4, 4, 24, 24, color)
        put(im, 6, 6, CREAM, 20, 4)
        put(im, 6, 10, CARD_L, 20, 14)
        draw_chip_icon(im, icon, 10, 12)
        # cartridge notch
        put(im, 14, 2, color, 4, 3)
        save(f"modules/module_{name}.png", im)
    # locked
    im = img(32, 32)
    rect(im, 4, 4, 24, 24, GRAY)
    put(im, 12, 10, YELLOW, 8, 10)
    put(im, 14, 8, YELLOW, 4, 4)
    put(im, 15, 14, DARK, 2, 3)
    save("modules/module_locked.png", im)


# ---------- items ----------

def make_items() -> None:
    # order paper
    im = img(32, 32)
    put(im, 6, 4, CREAM, 20, 24)
    put(im, 6, 4, OUTLINE, 20, 1)
    put(im, 6, 27, OUTLINE, 20, 1)
    put(im, 6, 4, OUTLINE, 1, 24)
    put(im, 25, 4, OUTLINE, 1, 24)
    put(im, 22, 4, CARD_L, 4, 4)  # folded corner
    put(im, 9, 9, INK, 14, 1)
    put(im, 9, 13, INK, 12, 1)
    put(im, 9, 17, INK, 10, 1)
    put(im, 9, 21, BLUE, 8, 1)
    save("items/item_order.png", im)

    # polaroid product
    im = img(32, 32)
    put(im, 6, 2, WHITE, 20, 26)
    put(im, 6, 2, OUTLINE, 20, 1)
    put(im, 6, 27, OUTLINE, 20, 1)
    put(im, 6, 2, OUTLINE, 1, 26)
    put(im, 25, 2, OUTLINE, 1, 26)
    put(im, 8, 4, TEAL, 16, 14)
    put(im, 10, 6, CREAM, 6, 4)
    put(im, 18, 12, YELLOW, 3, 3)
    put(im, 10, 20, GRAY, 12, 2)
    save("items/item_product.png", im)

    # shadow
    im = img(16, 8)
    put(im, 2, 2, (0, 0, 0, 70), 12, 4)
    put(im, 4, 1, (0, 0, 0, 40), 8, 1)
    put(im, 4, 6, (0, 0, 0, 40), 8, 1)
    save("items/item_shadow.png", im)


# ---------- customers (no cats) ----------

def animal_base(im: Image.Image, body, accent) -> None:
    # body
    put(im, 8, 16, body, 16, 16)
    put(im, 8, 16, OUTLINE, 16, 1)
    put(im, 8, 31, OUTLINE, 16, 1)
    put(im, 8, 16, OUTLINE, 1, 16)
    put(im, 23, 16, OUTLINE, 1, 16)
    # face
    put(im, 10, 8, body, 12, 12)
    put(im, 10, 8, OUTLINE, 12, 1)
    put(im, 10, 8, OUTLINE, 1, 12)
    put(im, 21, 8, OUTLINE, 1, 12)
    put(im, 13, 13, INK, 2, 2)
    put(im, 18, 13, INK, 2, 2)
    put(im, 15, 17, accent, 3, 2)
    # feet
    put(im, 10, 32, accent, 4, 4)
    put(im, 18, 32, accent, 4, 4)


def make_customers() -> None:
    # rabbit
    im = img(32, 40)
    animal_base(im, CREAM, PINK)
    put(im, 11, 2, CREAM, 3, 8)
    put(im, 18, 2, CREAM, 3, 8)
    put(im, 12, 3, PINK, 1, 5)
    put(im, 19, 3, PINK, 1, 5)
    save("customers/customer_rabbit.png", im)

    # dog
    im = img(32, 40)
    animal_base(im, ORANGE, CARD_D)
    put(im, 8, 10, ORANGE, 4, 6)
    put(im, 20, 10, ORANGE, 4, 6)
    put(im, 22, 20, ORANGE, 6, 3)  # tail
    save("customers/customer_dog.png", im)

    # hamster
    im = img(32, 40)
    animal_base(im, CARD_L, ORANGE)
    put(im, 9, 14, PINK, 3, 3)
    put(im, 20, 14, PINK, 3, 3)
    put(im, 14, 4, CARD_L, 4, 4)
    save("customers/customer_hamster.png", im)

    # duck
    im = img(32, 40)
    animal_base(im, YELLOW, ORANGE)
    put(im, 14, 18, ORANGE, 8, 3)
    put(im, 20, 10, YELLOW, 6, 4)
    save("customers/customer_duck.png", im)


# ---------- ui / effects ----------

def make_ui() -> None:
    # prompt bubble 9-slice-ish single
    im = img(48, 20)
    put(im, 1, 1, CREAM, 46, 16)
    put(im, 1, 1, OUTLINE, 46, 1)
    put(im, 1, 16, OUTLINE, 46, 1)
    put(im, 1, 1, OUTLINE, 1, 16)
    put(im, 46, 1, OUTLINE, 1, 16)
    put(im, 20, 17, CREAM, 6, 3)
    put(im, 22, 17, OUTLINE, 1, 3)
    put(im, 25, 17, OUTLINE, 1, 3)
    save("ui/prompt_bubble.png", im)

    # patience frame
    im = img(52, 8)
    put(im, 0, 0, OUTLINE, 52, 8)
    put(im, 1, 1, DARK, 50, 6)
    put(im, 2, 2, GREEN, 48, 4)
    save("ui/patience_frame.png", im)

    # interact hint !
    im = img(16, 16)
    put(im, 5, 1, YELLOW, 6, 10)
    put(im, 5, 1, OUTLINE, 6, 1)
    put(im, 5, 1, OUTLINE, 1, 10)
    put(im, 10, 1, OUTLINE, 1, 10)
    put(im, 5, 10, OUTLINE, 6, 1)
    put(im, 6, 3, INK, 4, 5)
    put(im, 6, 12, YELLOW, 4, 3)
    put(im, 7, 13, INK, 2, 1)
    save("ui/interact_hint.png", im)

    # highlight frame corners
    im = img(32, 32)
    for x, y in ((0, 0), (24, 0), (0, 24), (24, 24)):
        put(im, x, y, YELLOW, 8, 2)
        put(im, x, y, YELLOW, 2, 8)
    save("ui/highlight_frame.png", im)


def make_effects() -> None:
    im = img(16, 16)
    put(im, 7, 0, YELLOW, 2, 16)
    put(im, 0, 7, YELLOW, 16, 2)
    put(im, 3, 3, CREAM, 2, 2)
    put(im, 11, 11, CREAM, 2, 2)
    save("effects/produce_spark.png", im)


def main() -> None:
    make_floor_tile()
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
    print("done")


if __name__ == "__main__":
    main()
