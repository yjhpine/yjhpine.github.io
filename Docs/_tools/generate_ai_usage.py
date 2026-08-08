# -*- coding: utf-8 -*-
"""Meowdel 개발 AI 활용 기술 문서 PDF 생성기.

대상: 심사·제출용 — AI 도구·프롬프트·활용 내역 정리
저장소 작업일지·Progress·AGENTS·에셋 출처를 근거로 작성한다.
"""
from __future__ import annotations

import pathlib
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "문서"
OUT_PATH = OUT_DIR / "Meowdel_개발_AI_활용_기술문서.pdf"

_FONT_CANDIDATES = [
    pathlib.Path(r"C:\Windows\Fonts\malgun.ttf"),
    pathlib.Path("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"),
    pathlib.Path("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"),
]
_BOLD_CANDIDATES = [
    pathlib.Path(r"C:\Windows\Fonts\malgunbd.ttf"),
    pathlib.Path("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"),
]


def _pick_font(candidates: list[pathlib.Path]) -> str:
    for path in candidates:
        if path.exists():
            return str(path)
    raise FileNotFoundError("Korean-capable TTF/TTC font not found for PDF generation")


_FONT = _pick_font(_FONT_CANDIDATES)
_BOLD = _pick_font(_BOLD_CANDIDATES)
pdfmetrics.registerFont(TTFont("AiDocSans", _FONT))
pdfmetrics.registerFont(TTFont("AiDocSansBold", _BOLD))

NAVY = colors.HexColor("#102b46")
TEAL = colors.HexColor("#23b5c5")
LIGHT = colors.HexColor("#f4f7fb")
LINE = colors.HexColor("#d5dee8")
REVISION = "2026-08-08"


def styles():
    getSampleStyleSheet()
    return {
        "kicker": ParagraphStyle(
            "kicker", fontName="AiDocSansBold", fontSize=10, textColor=TEAL, alignment=TA_CENTER, spaceAfter=6
        ),
        "title": ParagraphStyle(
            "title", fontName="AiDocSansBold", fontSize=20, textColor=NAVY, alignment=TA_CENTER, spaceAfter=8, leading=26
        ),
        "sub": ParagraphStyle(
            "sub", fontName="AiDocSans", fontSize=11, textColor=NAVY, alignment=TA_CENTER, spaceAfter=4, leading=16
        ),
        "meta": ParagraphStyle(
            "meta", fontName="AiDocSans", fontSize=9, textColor=colors.HexColor("#4a5b6e"), leading=13, spaceAfter=2, alignment=TA_CENTER
        ),
        "h1": ParagraphStyle("h1", fontName="AiDocSansBold", fontSize=13, textColor=NAVY, spaceBefore=12, spaceAfter=6, leading=18),
        "h2": ParagraphStyle("h2", fontName="AiDocSansBold", fontSize=11, textColor=NAVY, spaceBefore=8, spaceAfter=4, leading=15),
        "body": ParagraphStyle("body", fontName="AiDocSans", fontSize=9.6, textColor=NAVY, leading=14.5, spaceAfter=4, alignment=TA_LEFT),
        "note": ParagraphStyle(
            "note",
            fontName="AiDocSans",
            fontSize=9,
            textColor=NAVY,
            backColor=LIGHT,
            borderPadding=7,
            leading=13,
            spaceBefore=4,
            spaceAfter=8,
        ),
        "cell": ParagraphStyle("cell", fontName="AiDocSans", fontSize=8.4, textColor=NAVY, leading=11.5),
        "cell_b": ParagraphStyle("cell_b", fontName="AiDocSansBold", fontSize=8.4, textColor=NAVY, leading=11.5),
    }


S = styles()


def P(text: str, style="body"):
    return Paragraph(text.replace("\n", "<br/>"), S[style])


def bullets(items: list[str]):
    return ListFlowable(
        [ListItem(P(item), leftIndent=8, bulletColor=TEAL) for item in items],
        bulletType="bullet",
        start="•",
        leftIndent=12,
        spaceBefore=2,
        spaceAfter=6,
    )


def table(rows: list[list[str]], col_widths: list[float]):
    data = []
    for i, row in enumerate(rows):
        style = "cell_b" if i == 0 else "cell"
        data.append([P(cell, style) for cell in row])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
                ("TEXTCOLOR", (0, 0), (-1, -1), NAVY),
                ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return t


def build_story():
    story = [
        Spacer(1, 14 * mm),
        P("MEOWDEL", "kicker"),
        P("개발 AI 활용 기술 문서", "title"),
        P("AI 도구 · 프롬프트 · 활용 내역 정리", "sub"),
        Spacer(1, 3 * mm),
        P(f"문서 버전 {REVISION} · 저장소 커밋·작업일지·에셋 출처 기준", "meta"),
        P("프로젝트: Meowdel (구 AI Factory) · Phaser 3 / TypeScript / Vite", "meta"),
        P("작성 근거: Docs/Progress · Decisions · AGENTS.md · 작업일지 · public/assets 출처", "meta"),
        Spacer(1, 5 * mm),
        P(
            "이 문서는 <b>게임 개발 과정에서 사용한 AI·자동화 도구</b>를 정리한다. "
            "런타임에는 생성형 AI API를 호출하지 않으며, 플레이 결과는 데이터 기반 시뮬레이션이다. "
            "아래 ‘사용함 / 사용하지 않음’을 구분해 심사·재현이 가능하도록 적었다.",
            "note",
        ),
        # --- 1 ---
        P("1. 요약", "h1"),
        table(
            [
                ["구분", "내용"],
                ["개발 보조 AI", "Cursor Cloud Agent — 코드·문서·테스트·기획 PDF·에셋 스크립트 자동화"],
                ["이미지 생성 AI", "ChatGPT Images — 결과 프리뷰용 4×4 고양이 시트 1장 생성 후 16장 분할"],
                ["그래픽 자동화", "Aseprite MCP(@iborymagic/aseprite-mcp) + LibreSprite CLI — PNG→.ase 아카이브"],
                ["절차적 아트", "Python + Pillow 스크립트 — 공장·UX 픽셀 아트 (생성형 모델 아님)"],
                ["런타임 생성형 AI", "사용하지 않음 (LLM/이미지 API 키·과금·네트워크 호출 없음)"],
                ["미사용 도구", "Claude / Gemini / Copilot / Midjourney / Stable Diffusion 등 저장소에 기록 없음"],
            ],
            [38 * mm, 132 * mm],
        ),
        # --- 2 ---
        P("2. AI 도구별 활용", "h1"),
        P("2.1 Cursor Cloud Agent", "h2"),
        P(
            "주 개발 보조 AI다. 기능 브랜치(`cursor/*-7d1c`)에서 구현·리팩터·회귀 테스트·기획서 PDF 재생성·"
            "작업일지/Decisions/Progress 갱신을 반복했다. Git 커밋 작성자 기준 Cursor Agent 비중이 크다."
        ),
        bullets(
            [
                "환경: `.cursor/environment.json` (이름: 애스프라이트 MCP), `AGENTS.md` Cloud 지침",
                "역할: TypeScript/Phaser 구현, Vitest, 기획 PDF(`Docs/_tools/generate_*.py`), 취약점 하드닝, Meowdel 제목 변경 등",
                "프롬프트 형태: 이슈/계획 단위 자연어 지시 (예: 맵 재배치, 준비 타임 상점, 취약점 보완 계획 구현)",
                "산출물: 소스 커밋, PR, `작업일지/*.txt`, 기획·소개 PDF",
            ]
        ),
        P("2.2 ChatGPT (이미지 생성)", "h2"),
        P(
            "게임 결과 프리뷰 사진 팩의 원본 시트를 ChatGPT Images로 생성했다. "
            "저장소에는 <b>생성에 쓴 원문 프롬프트 텍스트는 보관하지 않았고</b>, 산출 이미지와 후처리 파이프라인만 남겼다."
        ),
        table(
            [
                ["항목", "내용"],
                ["산출물", "4×4 고양이 시트 PNG (약 1254×1254)"],
                ["원본 경로", "public/assets/art/previews/_source/ChatGPT Image 2026년 8월 8일 오후 06_26_52.png"],
                ["후처리", "scripts/slice-preview-sheet.py → cat-*.png 16장 + manifest.json"],
                ["격자 의미", "행: plain/fairytale × no-hat/hat · 열: offset/center × soft/sharp"],
                ["게임 연결", "칩 조합에 따라 previewModel이 16장 중 하나를 고름 (실모델 추론 없음)"],
                ["프롬프트 원문", "저장소 미보관 — 재현 시 동일 격자 사양(스타일·모자·구도·선명)으로 재생성 권장"],
            ],
            [36 * mm, 134 * mm],
        ),
        P("2.3 Aseprite MCP + LibreSprite", "h2"),
        P(
            "픽셀 아트 파이프라인 자동화용이다. Cursor Cloud 환경에 LibreSprite 기반 `aseprite` CLI를 두고, "
            "MCP 패키지 `@iborymagic/aseprite-mcp`로 PNG를 `.ase`로 변환·메타데이터를보내냈다."
        ),
        bullets(
            [
                "설정: `.cursor/mcp.json`, `scripts/setup-aseprite-cli.sh`, `scripts/export-with-aseprite-mcp.mjs`",
                "활용: 스테이션·칩·연출 PNG → `public/assets/aseprite/` 아카이브",
                "프롬프트가 아닌 MCP 핸들러 호출: 환경 점검, PNG→ase, export metadata",
                "참고: Cloud Agent CallMcpTool에 서버가 안 보일 때는 스크립트로 직접 핸들러 호출 (작업일지 8월7일)",
            ]
        ),
        P("2.4 Python + Pillow (절차적 픽셀 아트)", "h2"),
        P(
            "생성형 이미지 모델이 아니라 코드로 도형·팔레트를 그려 에셋을 만들었다. "
            "AI ‘도구’라기보다 자동화 스크립트이지만, Cursor Agent가 작성·실행한 경우가 많다."
        ),
        bullets(
            [
                "scripts/generate-toy-factory-art.py — Cute Pixel Art Toy Factory 패스",
                "scripts/generate-cozy-factory-art.py — Cozy 디테일 리파인",
                "scripts/generate-ux-feedback-art.py — UX 피드백 크롬",
                "scripts/generate-preview-placeholders.py — 프리뷰 자리표시자",
            ]
        ),
        # --- 3 ---
        P("3. 프롬프트·지시 정리", "h1"),
        P("3.1 개발 지시 (Cursor)", "h2"),
        P("자연어 과제 단위로 전달했다. 대표 패턴은 다음과 같다."),
        table(
            [
                ["유형", "예시 지시 / 산출"],
                ["기획 동기화", "기획서를 현재 구현에 맞게 재생성 / generate_plans.py · 기획서 PDF"],
                ["시스템 구현", "크레딧·공장 업그레이드 7종, 준비 타임 상점 / ProgressionService · UI"],
                ["맵·연출", "맵 960×580, 좌측 모듈 선반, 하단 생산 라인 / KitchenScene"],
                ["품질·보안", "취약점 하드닝 계획대로 구현 / 선반∩라운드, 모달 입력 차단, 세이브 클램프"],
                ["브랜딩", "게임 제목을 Meowdel로 변경 / 메뉴·HUD·PDF 표기"],
                ["문서화", "작업일지 txt, Decisions/Progress 갱신"],
            ],
            [32 * mm, 138 * mm],
        ),
        P("3.2 ChatGPT 이미지 — 재현용 격자 사양 (원문 프롬프트 대체)", "h2"),
        P(
            "원문 프롬프트가 없으므로, 시트 분할 스크립트와 README가 요구하는 <b>시각 사양</b>을 재현 지침으로 둔다."
        ),
        bullets(
            [
                "주제: 고양이 캐릭터 결과물 썸네일, 픽셀/일러스트 톤 통일",
                "4×4 격자: 스타일(plain vs fairytale), 모자 유무, 구도(offset vs center), 선명(soft vs sharp)",
                "후처리: soft 칸은 slice 스크립트에서 Gaussian blur 적용 가능",
                "금지: 칩 모듈 이름·VRAM 등 게임 UI 텍스트를 이미지에 넣지 않음",
            ]
        ),
        P("3.3 인게임 ‘프롬프트’ (게임 콘텐츠 — AI 도구 프롬프트 아님)", "h2"),
        P(
            "손님 주문서 문구(`src/data/prompts.ts`)는 <b>플레이 데이터</b>다. "
            "실제 LLM에 넣는 프롬프트가 아니라, 정답 칩 이름을 직설하지 않는 우회 한국어 요청이다."
        ),
        bullets(
            [
                "예: 「냥이 한 장요」, 「옛이야기 표지 느낌으로」, 「장식 없이 단정하게」",
                "평가는 requiredTags / minimumScores 규칙으로 결정적 채점",
            ]
        ),
        # --- 4 ---
        P("4. 시기별 활용 내역", "h1"),
        table(
            [
                ["시기", "AI·자동화 관련 작업"],
                ["2026-07-29", "결정: 런타임 생성형 AI 대신 결정적 시뮬레이션"],
                ["2026-07-30~31", "주문서(프롬프트)↔결과 비교 UX 기획·개별 프롬프트 문구"],
                ["2026-08-03~04", "머리 위 프롬프트 말풍선, 우회 프롬프트 다양화 (콘텐츠)"],
                ["2026-08-05~06", "플레이어/공장 픽셀 스프라이트 — Pillow·수동 에셋 중심"],
                ["2026-08-07", "Cursor Cloud + Aseprite MCP 환경, toy/cozy/UX 아트 스크립트, 소개 PDF"],
                ["2026-08-07", "결과 프리뷰 16장 파이프라인(자리표시자)"],
                ["2026-08-08", "ChatGPT 4×4 시트 반영·16장 분할 매핑"],
                ["2026-08-08", "Meowdel 제목, 취약점 하드닝, 본 AI 활용 문서"],
            ],
            [32 * mm, 138 * mm],
        ),
        # --- 5 ---
        P("5. 사용하지 않은 것 (경계)", "h1"),
        bullets(
            [
                "플레이 중 OpenAI / 기타 LLM·이미지 API 호출",
                "플레이어 자유 입력 프롬프트를 실모델로 채점",
                "Claude, Gemini, GitHub Copilot, Midjourney, Stable Diffusion — 저장소·작업일지에 사용 기록 없음",
                "유료 API 키·로그인 없이 실행 (제출 체크리스트와 동일)",
            ]
        ),
        P(
            "게임 콘셉트는 ‘생성형 AI 파이프라인을 공장 칩으로 체감’하게 하되, "
            "<b>실제 모델 호출 없이</b> 학습·조작 경험을 주는 것이다.",
            "note",
        ),
        # --- 6 ---
        P("6. 근거 파일", "h1"),
        table(
            [
                ["근거", "경로"],
                ["Cloud/MCP 지침", "AGENTS.md, .cursor/environment.json, .cursor/mcp.json"],
                ["진행·결정", "Docs/Progress.md, Docs/Decisions.md"],
                ["작업일지", "작업일지/8월7일 애스프라이트 MCP*.txt, 8월8일 프리뷰시트*.txt 등"],
                ["ChatGPT 시트", "public/assets/art/previews/_source/, manifest.json, README.md"],
                ["분할 스크립트", "scripts/slice-preview-sheet.py"],
                ["MCP보내내기", "scripts/export-with-aseprite-mcp.mjs, setup-aseprite-cli.sh"],
                ["본 문서 생성기", "Docs/_tools/generate_ai_usage.py"],
            ],
            [36 * mm, 134 * mm],
        ),
        Spacer(1, 6 * mm),
        P(
            "재생성: <b>python3 Docs/_tools/generate_ai_usage.py</b> → "
            "문서/Meowdel_개발_AI_활용_기술문서.pdf",
            "meta",
        ),
    ]
    return story


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    def footer(canvas, doc_):
        canvas.saveState()
        canvas.setFont("AiDocSans", 8)
        canvas.setFillColor(colors.HexColor("#6a7a8c"))
        canvas.drawCentredString(A4[0] / 2, 8 * mm, f"Meowdel · 개발 AI 활용 기술 문서 · {doc_.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        str(OUT_PATH),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=16 * mm,
        title="Meowdel 개발 AI 활용 기술 문서",
        author="Meowdel",
    )
    doc.build(build_story(), onFirstPage=footer, onLaterPages=footer)
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
