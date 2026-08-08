# Preview photo pack (16)

Prepared from the ChatGPT 4×4 sheet via `scripts/slice-preview-sheet.py`.

## Mapping

| Sheet row | style | hat |
|-----------|-------|-----|
| 0 | plain (실내) | no-hat |
| 1 | plain (실내) | hat (빨간 모자) |
| 2 | fairytale (성·벚꽃) | no-hat |
| 3 | fairytale | hat (마법사 모자) |

| Sheet col | composition | sharpness |
|-----------|-------------|-----------|
| 0 | offset | soft |
| 1 | center | soft |
| 2 | offset | sharp |
| 3 | center | sharp |

Soft variants get a light blur so soft/sharp stays readable in-game.

## Filenames

```
cat-{style}-{hat}-{composition}-{sharpness}.png
```

QC stamp + quality (lo/mid/hi) remain CSS overlays — not separate files.

## Source

Original sheet archived at `_source/`.

```bash
python3 scripts/slice-preview-sheet.py
```
