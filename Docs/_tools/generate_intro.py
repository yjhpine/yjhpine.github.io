# -*- coding: utf-8 -*-
"""AI Factory 게임 소개 및 설명 PDF 생성기.

대상: 심사·플레이어용 소개 문서 (개요 · 플레이 방법 · 실행 방법)
기획서(01~05)와 별도로, 구현된 빌드 기준으로 작성한다.
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
OUT_PATH = OUT_DIR / "AI_Factory_게임소개_및_설명.pdf"

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
pdfmetrics.registerFont(TTFont("IntroSans", _FONT))
pdfmetrics.registerFont(TTFont("IntroSansBold", _BOLD))

NAVY = colors.HexColor("#102b46")
TEAL = colors.HexColor("#23b5c5")
LIGHT = colors.HexColor("#f4f7fb")
LINE = colors.HexColor("#d5dee8")
REVISION = "2026-08-07"


def styles():
    getSampleStyleSheet()
    return {
        "kicker": ParagraphStyle(
            "kicker", fontName="IntroSansBold", fontSize=10, textColor=TEAL, alignment=TA_CENTER, spaceAfter=6
        ),
        "title": ParagraphStyle(
            "title", fontName="IntroSansBold", fontSize=22, textColor=NAVY, alignment=TA_CENTER, spaceAfter=8, leading=28
        ),
        "sub": ParagraphStyle(
            "sub", fontName="IntroSans", fontSize=11, textColor=NAVY, alignment=TA_CENTER, spaceAfter=4, leading=16
        ),
        "meta": ParagraphStyle(
            "meta", fontName="IntroSans", fontSize=9, textColor=colors.HexColor("#4a5b6e"), leading=13, spaceAfter=2, alignment=TA_CENTER
        ),
        "h1": ParagraphStyle("h1", fontName="IntroSansBold", fontSize=14, textColor=NAVY, spaceBefore=12, spaceAfter=6, leading=20),
        "h2": ParagraphStyle("h2", fontName="IntroSansBold", fontSize=11, textColor=NAVY, spaceBefore=8, spaceAfter=4, leading=16),
        "body": ParagraphStyle("body", fontName="IntroSans", fontSize=9.8, textColor=NAVY, leading=15, spaceAfter=4, alignment=TA_LEFT),
        "note": ParagraphStyle(
            "note",
            fontName="IntroSans",
            fontSize=9,
            textColor=NAVY,
            backColor=LIGHT,
            borderPadding=7,
            leading=13,
            spaceBefore=4,
            spaceAfter=8,
        ),
        "cell": ParagraphStyle("cell", fontName="IntroSans", fontSize=8.6, textColor=NAVY, leading=12),
        "cell_b": ParagraphStyle("cell_b", fontName="IntroSansBold", fontSize=8.6, textColor=NAVY, leading=12),
        "code": ParagraphStyle(
            "code",
            fontName="IntroSans",
            fontSize=9,
            textColor=NAVY,
            backColor=colors.HexColor("#eef2f6"),
            borderPadding=8,
            leading=14,
            spaceBefore=2,
            spaceAfter=6,
        ),
    }


S = styles()


def P(text: str, style="body"):
    return Paragraph(text.replace("\n", "<br/>"), S[style])


def table(data, col_widths):
    header = [Paragraph(f'<font color="white">{c}</font>', S["cell_b"]) for c in data[0]]
    body = [[Paragraph(str(c), S["cell"]) for c in row] for row in data[1:]]
    t = Table([header] + body, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
            ]
        )
    )
    return t


def bullets(items: list[str]):
    flow = []
    for item in items:
        flow.append(ListItem(P(item), leftIndent=8, bulletColor=TEAL))
    return ListFlowable(flow, bulletType="bullet", start="•", leftIndent=14, bulletFontName="IntroSans", bulletFontSize=9)


def build_story():
    story = [
        Spacer(1, 18 * mm),
        P("AI FACTORY", "kicker"),
        P("게임 소개 및 설명", "title"),
        P("게임 개요 · 플레이 방법 · 실행 방법", "sub"),
        Spacer(1, 4 * mm),
        P(f"문서 버전 {REVISION} · 구현 빌드 기준", "meta"),
        P("플랫폼: PC 브라우저 (Phaser 3 · TypeScript · Vite)", "meta"),
        P("플레이 링크: https://yjhpine.github.io/", "meta"),
        Spacer(1, 6 * mm),
        P(
            "이 문서는 심사자·플레이어가 게임을 이해하고 바로 실행할 수 있도록 "
            "개요, 조작·규칙, 로컬 실행/검증 방법을 한곳에 정리한 소개서입니다. "
            "상세 기획은 <b>기획서/01~05.pdf</b>를 참고하세요.",
            "note",
        ),
        # --- 1. 개요 ---
        P("1. 게임 개요", "h1"),
        P("<b>한 줄 소개</b>", "h2"),
        P(
            "라운드마다 손님이 찾아오면, 플레이어 고양이가 주문서·모듈 칩·완성 이미지를 운반해 "
            "그림을 만들고 전달하는 <b>오버쿡드형 공장 퍼즐</b>입니다. "
            "생산할 때마다 VRAM이 소모되며, 라운드가 끝나면 효율 점수로 등급이 매겨집니다. "
            "실제 생성형 AI API 없이 브라우저에서 동작합니다."
        ),
        table(
            [
                ["항목", "내용"],
                ["장르", "오버쿡드형 캐릭터 운반 + 모듈 칩 슬롯 퍼즐"],
                ["핵심 재미", "동선·손님 응대 + 최소 칩으로 조건 맞추기 + VRAM 아끼기"],
                ["진행", "튜토리얼 r00 → 라운드 r01~r06"],
                ["결과물", "칩 조합 기반 절차적(CSS) 미리보기 · 실제 이미지 모델 호출 없음"],
                ["저장", "브라우저 localStorage (진행·해금·최고점·업그레이드)"],
            ],
            [36 * mm, 136 * mm],
        ),
        P("<b>핵심 플레이 루프</b>", "h2"),
        P(
            "손님에게서 주문서 집기 → 입력기에 넣기 → 왼쪽 선반에서 칩 집기 → 슬롯에 꽂기 → "
            "생산 → 출구에서 이미지 집기 → 손님에게 전달 → 라운드 정산 → 준비 타임(업그레이드) → 다음 라운드"
        ),
        # --- 2. 플레이 ---
        P("2. 플레이 방법", "h1"),
        P("<b>2.1 조작</b>", "h2"),
        table(
            [
                ["키", "동작"],
                ["WASD / 방향키", "이동"],
                ["Z", "상호작용 (손님·입력기·슬롯·생산·출구·왼쪽 선반·분석기·바닥 물건). 분석 팝업이 열려 있으면 닫기"],
                ["Z (빈 곳)", "들고 있는 주문서/칩/이미지를 바닥에 내려놓기. 빈손+바닥 물건이면 집기. 대상도 없고 손도 비면 반응 없음"],
                ["Z (찬 슬롯)", "모듈 칩을 든 채 찬 슬롯에 누르면 손↔슬롯 스왑 (같은 칩은 거부)"],
                ["C", "짧은 대시"],
                ["X", "주문서 또는 완성 이미지를 들고 있을 때 들여다보기"],
            ],
            [36 * mm, 136 * mm],
        ),
        P("<b>2.2 주방 구성</b>", "h2"),
        table(
            [
                ["장소", "역할"],
                ["손님 카운터 (상단)", "주문서 수령 · 완성 이미지 전달. 머리 위 말풍선으로 요청 확인"],
                ["칩 선반 (왼쪽 세로)", "해금된 모듈 칩. 라운드당 타입 1개"],
                ["입력기 · 슬롯 ×3 · 생산기 · 출구 (하단 라인)", "주문서를 넣고 칩을 꽂아 생산한 뒤 폴라로이드를 수거"],
                ["퀵 선반 / 분석기 (우측, 구매 시)", "동선 단축 · 조건 분석(칩 이름 비공개)"],
            ],
            [52 * mm, 120 * mm],
        ),
        P("<b>2.3 튜토리얼 (r00)</b>", "h2"),
        P(
            "새 게임은 실습 튜토리얼부터 바로 시작합니다(준비 타임 없음). 안내된 순서의 상호작용만 허용되며, "
            "손님 인내심이 줄지 않아 실패 없이 한 명을 완주할 수 있습니다. "
            "완료 후 준비 타임을 거쳐 본 라운드(r01)로 이어집니다."
        ),
        P("<b>2.4 손님 · VRAM · 크레딧 · 점수</b>", "h2"),
        bullets(
            [
                "동시 대기 손님은 최대 2명입니다. 인내심이 다하면 이탈하며, 그 손님의 주문서/이미지는 정리됩니다.",
                "생산할 때마다 슬롯에 꽂힌 칩의 VRAM 합이 소모됩니다. 예산을 넘겨도 생산은 가능하지만 속도가 느려지고 정산 점수가 깎입니다.",
                "납품 크레딧: 성공 +100, 통과 보너스 +50, 인내심≥50% +20, 실패 +0. 라운드 정산 크레딧(등급·baseReward)은 별도로 지급됩니다.",
                "업그레이드는 준비 타임에서만 구매합니다. 처음부터 7종이 열려 있으며(잔액·최대 레벨만 제한), 새 게임 시 초기화됩니다.",
                "라운드가 진행될수록 스타일·금지·구도·선명·검사 칩이 해금됩니다. 새 칩은 시작 시 모달로 소개됩니다.",
                "X로 들고 있는 결과물을 열면 조건 충족 여부와 미리보기를 확인할 수 있습니다.",
            ]
        ),
        P("<b>2.5 라운드 한눈에</b>", "h2"),
        table(
            [
                ["라운드", "목표", "해금 요지"],
                ["r00", "손님 1 (튜토리얼)", "그림 제작기 · 조작 익히기"],
                ["r01", "손님 3", "기본 응대 · VRAM 관리"],
                ["r02", "손님 4", "스타일 가공기"],
                ["r03", "손님 4", "금지 목록"],
                ["r04", "손님 5", "구도 설계기"],
                ["r05", "손님 5", "선명화"],
                ["r06", "손님 6", "품질 검사기"],
            ],
            [28 * mm, 48 * mm, 96 * mm],
        ),
        # --- 3. 실행 ---
        P("3. 실행 방법", "h1"),
        P("<b>3.1 온라인 플레이 (권장)</b>", "h2"),
        P("별도 설치 없이 Chrome 또는 Edge에서 아래 주소로 접속합니다."),
        P("<b>https://yjhpine.github.io/</b>", "code"),
        P("메뉴에서 <b>새 게임 시작</b>(튜토리얼부터) 또는 <b>이어서 하기</b>를 선택합니다."),
        P("<b>3.2 로컬 실행</b>", "h2"),
        P("Node.js(권장 18+)가 설치된 환경에서 저장소를 받은 뒤 다음을 실행합니다."),
        P(
            "npm install<br/>"
            "npm run dev<br/><br/>"
            "터미널에 표시된 로컬 주소(예: http://localhost:5173)를 브라우저로 엽니다.",
            "code",
        ),
        P("<b>3.3 검증 · 빌드</b>", "h2"),
        P(
            "npm run typecheck&nbsp;&nbsp;# TypeScript 검사<br/>"
            "npm run test&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Vitest 단위 테스트<br/>"
            "npm run build&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# dist/ 정적 빌드 (GitHub Pages 배포와 동일)",
            "code",
        ),
        P(
            "<b>참고</b><br/>"
            "· 로그인·API 키·유료 라이선스 없이 실행됩니다.<br/>"
            "· main 브랜치 push 시 GitHub Actions가 dist를 Pages에 배포합니다.<br/>"
            "· 기획·시스템 상세: 기획서/01_개요.pdf ~ 05_개발.pdf<br/>"
            "· 소개 PDF 재생성: python3 Docs/_tools/generate_intro.py",
            "note",
        ),
        Spacer(1, 8 * mm),
        P("— 끝 —", "meta"),
    ]
    return story


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT_PATH),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title="AI Factory 게임 소개 및 설명",
        author="AI Factory",
    )

    def on_page(canvas, doc_):
        canvas.saveState()
        canvas.setStrokeColor(TEAL)
        canvas.setLineWidth(2)
        canvas.line(16 * mm, A4[1] - 10 * mm, A4[0] - 16 * mm, A4[1] - 10 * mm)
        canvas.setFont("IntroSans", 8)
        canvas.setFillColor(colors.HexColor("#6b7c8f"))
        canvas.drawCentredString(A4[0] / 2, 8 * mm, f"AI FACTORY · 게임 소개 및 설명 · {doc_.page}")
        canvas.restoreState()

    doc.build(build_story(), onFirstPage=on_page, onLaterPages=on_page)
    print("wrote", OUT_PATH)


if __name__ == "__main__":
    main()
