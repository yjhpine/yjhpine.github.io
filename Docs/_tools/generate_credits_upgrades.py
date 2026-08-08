# -*- coding: utf-8 -*-
"""크레딧 & 공장 업그레이드 기획서 PDF (2026-08-08 · 구현 동기화).

구현 기준: 납품 +100/+50/+20/0, 준비 타임 전용 상점, 처음부터 7종 해금,
맵 우측 기능형 설비, 분석기 Z 닫기. 인게임 터미널·라운드 해금 게이트는 폐기.
"""
from __future__ import annotations

import pathlib
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "기획서" / "AI_FACTORY_크레딧_공장업그레이드_기획서.pdf"

_FONT_CANDIDATES = [
    pathlib.Path(r"C:\Windows\Fonts\malgun.ttf"),
    pathlib.Path("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"),
    pathlib.Path("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"),
]
_BOLD_CANDIDATES = [
    pathlib.Path(r"C:\Windows\Fonts\malgunbd.ttf"),
    pathlib.Path("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"),
]


def _pick(cands: list[pathlib.Path]) -> str:
    for path in cands:
        if path.exists():
            return str(path)
    raise FileNotFoundError("Korean font not found")


pdfmetrics.registerFont(TTFont("CSans", _pick(_FONT_CANDIDATES)))
pdfmetrics.registerFont(TTFont("CSansBold", _pick(_BOLD_CANDIDATES)))

NAVY = colors.HexColor("#102b46")
TEAL = colors.HexColor("#23b5c5")
LIGHT = colors.HexColor("#f4f7fb")
LINE = colors.HexColor("#d5dee8")


def styles():
    getSampleStyleSheet()
    return {
        "kicker": ParagraphStyle("k", fontName="CSansBold", fontSize=10, textColor=TEAL, alignment=TA_CENTER, spaceAfter=6),
        "title": ParagraphStyle("t", fontName="CSansBold", fontSize=18, textColor=NAVY, alignment=TA_CENTER, spaceAfter=10, leading=24),
        "h1": ParagraphStyle("h1", fontName="CSansBold", fontSize=12, textColor=NAVY, spaceBefore=10, spaceAfter=5, leading=16),
        "body": ParagraphStyle("b", fontName="CSans", fontSize=9.5, textColor=NAVY, leading=14, spaceAfter=4),
        "note": ParagraphStyle("n", fontName="CSans", fontSize=9, textColor=NAVY, backColor=LIGHT, borderPadding=6, leading=13, spaceBefore=4, spaceAfter=6),
        "cell": ParagraphStyle("c", fontName="CSans", fontSize=8.5, textColor=NAVY, leading=12),
        "cell_b": ParagraphStyle("cb", fontName="CSansBold", fontSize=8.5, textColor=NAVY, leading=12),
    }


S = styles()


def P(text: str, style="body"):
    return Paragraph(text, S[style])


def table(rows: list[list[str]], widths: list[float]):
    data = [[Paragraph(c, S["cell_b" if r == 0 or c_i == 0 else "cell"]) for c_i, c in enumerate(row)] for r, row in enumerate(rows)]
    # header row all bold
    data[0] = [Paragraph(c, S["cell_b"]) for c in rows[0]]
    t = Table(data, colWidths=widths)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return t


def main():
    story = [
        P("AI FACTORY · 구현 동기화", "kicker"),
        P("크레딧 & 공장 업그레이드", "title"),
        P("개정일 2026-08-08 · 코드(main) 기준. 인게임 터미널·라운드 해금 게이트는 폐기.", "body"),
        P("1. 목적", "h1"),
        P(
            "주문 처리로 번 크레딧을 공장 설비·작업 능력 개선에 쓴다. "
            "핵심 루프(손님·주문서·칩·생산·전달)는 유지하고, 업그레이드는 이동·딜레이·인내심·생산·분석 편의를 보조한다. "
            "범위는 작업화·장갑·커피머신·생산기·칩 선반 확장·분석기·주문 분석기 7종이다."
        ),
        P("2. 크레딧", "h1"),
        P("납품 시 즉시 지급(HUD). 라운드 정산 크레딧(등급·baseReward)은 별도로 유지한다."),
        table(
            [
                ["결과", "보상"],
                ["주문 성공", "+100 C"],
                ["완벽 일치 보너스(통과 시)", "+50 C"],
                ["손님 인내심 ≥50%", "+20 C"],
                ["주문 실패", "+0 C"],
            ],
            [80 * mm, 80 * mm],
        ),
        Spacer(1, 6),
        P("3. 업그레이드 방식 (준비 타임)", "h1"),
        P(
            "구매는 라운드 시작 전 준비 타임(#prep-modal)에서만 한다. "
            "정산 CTA ‘준비 타임 →’ 또는 메뉴 ‘이어서 하기’로 진입. "
            "조작키는 기존 Z 체계를 따르며, 주방 인게임 터미널은 없다. "
            "효과는 세이브 upgradeLevels에 유지되고 새 게임 시 초기화된다. "
            "처음부터 7종 모두 구매 가능(잔액·최대 레벨만 검사)."
        ),
        P("4. 성장형 업그레이드", "h1"),
        table(
            [
                ["항목", "Lv.1", "Lv.2", "Lv.3"],
                ["작업화 (이동)", "+5% / 100C", "+10% / 250C", "+15% / 500C"],
                ["작업 장갑 (딜레이)", "−10% / 100C", "−20% / 250C", "−30% / 500C"],
                ["커피머신 (인내심)", "+10% / 150C", "+20% / 350C", "+30% / 600C"],
                ["생산기 (생산시간)", "−10% / 200C", "−20% / 400C", "−30% / 700C"],
            ],
            [44 * mm, 42 * mm, 42 * mm, 42 * mm],
        ),
        Spacer(1, 6),
        P("5. 기능형 업그레이드", "h1"),
        table(
            [
                ["항목", "가격", "효과"],
                ["칩 선반 확장", "400 C", "우측 퀵 선반 최대 3칸. 재고 규칙은 왼쪽 선반과 동일(타입당 1개/라운드)."],
                ["분석기", "600 C", "결과물 들고 Z → Subject/Style/Composition/Sharpness 일치표. 칩 이름 비공개. Z로 닫기."],
                ["주문 분석기", "800 C", "주문서 들고 Z → 구조화 조건. 칩 이름 비공개. Z로 닫기."],
            ],
            [36 * mm, 24 * mm, 110 * mm],
        ),
        Spacer(1, 6),
        P("6. 분석기 비교", "h1"),
        table(
            [
                ["구분", "분석기", "주문 분석기"],
                ["대상", "생산된 이미지", "주문서"],
                ["시점", "생산 후", "생산 전"],
                ["정보", "무엇이 맞/틀렸는지", "무엇을 원하는지"],
                ["칩 정답", "제공하지 않음", "제공하지 않음"],
            ],
            [32 * mm, 64 * mm, 64 * mm],
        ),
        Spacer(1, 6),
        P("7. MVP 구현 범위 (현재 빌드)", "h1"),
        P(
            "납품 보상표 · 준비 타임 상점 · 구매·세이브 · 배율 적용 · 퀵 선반 · 분석기 UI까지 구현됨. "
            "맵은 960×580, 칩 선반은 왼쪽 세로, 생산 라인은 하단이다.",
            "note",
        ),
    ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=14 * mm, bottomMargin=14 * mm)
    doc.build(story)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
