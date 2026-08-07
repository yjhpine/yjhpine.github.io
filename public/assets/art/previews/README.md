# Preview photo pack (16)

Replace these placeholder PNGs with final cat art. **Keep the exact filenames.**

## Naming

```
cat-{style}-{hat}-{composition}-{sharpness}.png
```

| Axis | Values | Meaning |
|------|--------|---------|
| style | `plain`, `fairytale` | 기본 / 동화풍 |
| hat | `hat`, `no-hat` | 모자 있음 / 없음 |
| composition | `offset`, `center` | 치우친 구도 / 중앙 |
| sharpness | `soft`, `sharp` | 흐림 / 선명 |

## Not separate files

- **QC 검사 도장** → UI CSS overlay (`preview--checked`)
- **품질 lo/mid/hi** → grain + filter overlay (`preview--q-*`)

## Spec

- Size: **256×256** (or 512×512), square PNG
- Style: pixel art preferred (`image-rendering: pixelated`)
- Soft/sharp should be visible in the image itself (not only via CSS)

## Regenerate placeholders

```bash
python3 scripts/generate-preview-placeholders.py
```
