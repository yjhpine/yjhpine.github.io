# -*- coding: utf-8 -*-
"""AI Factory 기획서 PDF 생성기 (2026-08-07 · 구현 동기화 개정).

구현된 게임(Overcooked형 운반 + 모듈 칩 슬롯 + VRAM 효율)을 기준으로
기획서 01~05를 다시 쓴다. 구버전(포트 드래그 DAG / 캐릭터 미조작) 서술은 폐기한다.
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
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = pathlib.Path(__file__).resolve().parents[2]
PLAN_DIR = ROOT / "기획서"
if not PLAN_DIR.is_dir():
    PLAN_DIR = next(
        p
        for p in ROOT.iterdir()
        if p.is_dir() and not p.name.startswith(".") and p.name not in {"dist", "Docs", "node_modules", "src", ".github", "public", "scripts"}
    )

# Linux CI/에이전트: WenQuanYi Micro Hei (CJK). Windows 로컬은 malgun 우선.
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
pdfmetrics.registerFont(TTFont("PlanSans", _FONT))
pdfmetrics.registerFont(TTFont("PlanSansBold", _BOLD))

NAVY = colors.HexColor("#102b46")
TEAL = colors.HexColor("#23b5c5")
LIGHT = colors.HexColor("#f4f7fb")
LINE = colors.HexColor("#d5dee8")
REVISION = "2026-08-07"


def styles():
    getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle(
            "cover_kicker", fontName="PlanSansBold", fontSize=10, textColor=TEAL, alignment=TA_CENTER, spaceAfter=6
        ),
        "cover_title": ParagraphStyle(
            "cover_title", fontName="PlanSansBold", fontSize=22, textColor=NAVY, alignment=TA_CENTER, spaceAfter=8, leading=28
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub", fontName="PlanSans", fontSize=11, textColor=NAVY, alignment=TA_CENTER, spaceAfter=4, leading=16
        ),
        "meta": ParagraphStyle("meta", fontName="PlanSans", fontSize=9, textColor=colors.HexColor("#4a5b6e"), leading=13, spaceAfter=3),
        "h1": ParagraphStyle("h1", fontName="PlanSansBold", fontSize=14, textColor=NAVY, spaceBefore=10, spaceAfter=6, leading=20),
        "h2": ParagraphStyle("h2", fontName="PlanSansBold", fontSize=11, textColor=NAVY, spaceBefore=8, spaceAfter=4, leading=16),
        "body": ParagraphStyle("body", fontName="PlanSans", fontSize=9.5, textColor=NAVY, leading=14, spaceAfter=4),
        "note": ParagraphStyle(
            "note",
            fontName="PlanSans",
            fontSize=9,
            textColor=NAVY,
            backColor=LIGHT,
            borderPadding=6,
            leading=13,
            spaceBefore=4,
            spaceAfter=6,
        ),
        "cell": ParagraphStyle("cell", fontName="PlanSans", fontSize=8.5, textColor=NAVY, leading=12),
        "cell_b": ParagraphStyle("cell_b", fontName="PlanSansBold", fontSize=8.5, textColor=NAVY, leading=12),
    }


S = styles()


def P(text: str, style="body"):
    return Paragraph(text.replace("\n", "<br/>"), S[style])


def cover(doc_no: str, title: str, subtitle: str):
    return [
        Spacer(1, 24 * mm),
        P("AI FACTORY | 구현 동기화 기획서", "cover_kicker"),
        P(f"{doc_no}. {title}", "cover_title"),
        P(subtitle, "cover_sub"),
        Spacer(1, 8 * mm),
        P("문서 " + doc_no, "meta"),
        P("대상: 생성형 AI 비경험자 중심 PC 브라우저 프로토타입", "meta"),
        P(f"개정일: {REVISION} (현재 구현 기준으로 기획서 재정렬)", "meta"),
        P("기준 코드: KitchenSession · KitchenScene · TutorialGuide · rounds r00~r06", "meta"),
        Spacer(1, 6 * mm),
        P(
            "문서 목적<br/>"
            "이 개정본은 ‘앞으로 만들 게임’이 아니라 <b>지금 플레이 가능한 게임</b>을 기준으로 쓴다. "
            "장르는 Overcooked형 캐릭터 운반 + 모듈 칩 슬롯 + VRAM 효율 점수다. "
            "구기획의 포트 드래그 DAG·캐릭터 미조작·장치 배치 중심 서술은 폐기한다.",
            "note",
        ),
        P(
            "공통 원칙: 게임이 먼저, AI 학습은 결과다. HUD에는 게임 용어(주문서·칩·VRAM)만 쓰고, "
            "실제 Prompt/LoRA 등 전문 용어는 도감성 데이터·기획 표에서만 대응한다. 실모델/API는 쓰지 않는다.",
            "body",
        ),
        PageBreak(),
    ]


def header_bar(text: str):
    return [
        P(f"기획서 구현동기화 · {REVISION}", "meta"),
        P(text, "h1"),
    ]


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


def build(path: pathlib.Path, story):
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title=path.stem,
        author="AI Factory",
    )

    def on_page(canvas, doc_):
        canvas.saveState()
        canvas.setStrokeColor(TEAL)
        canvas.setLineWidth(2)
        canvas.line(16 * mm, A4[1] - 10 * mm, A4[0] - 16 * mm, A4[1] - 10 * mm)
        canvas.setFont("PlanSans", 8)
        canvas.setFillColor(colors.HexColor("#6b7c8f"))
        canvas.drawCentredString(A4[0] / 2, 8 * mm, f"AI FACTORY 기획서 · {path.stem} · {doc_.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)


def doc_01():
    w = [36 * mm, 136 * mm]
    story = cover("01", "개요", "고양이 직공과 손님, 칩으로 그림을 만들어 전달하는 오버쿡드형 공장 퍼즐")
    story += header_bar("1. 제품 정의 (구현 기준)")
    story += [
        P("<b>한 줄 소개</b>", "h2"),
        P(
            "라운드마다 손님이 찾아오면, 플레이어 고양이(WASD)가 주문서·모듈 칩·완성 이미지를 운반해 "
            "생산 라인에 넣고, VRAM을 아끼며 전달하는 브라우저용 오버쿡드형 공장 퍼즐."
        ),
        table(
            [
                ["항목", "현재 구현"],
                ["핵심 콘셉트", "Overcooked형 캐릭터 운반(1A) × 모듈 칩 슬롯(2B) × VRAM 효율 점수. 포트 연결 그래프는 사용하지 않는다."],
                ["장르 포지션", "손님·인내심·동선 압박의 감정 + 최소 칩 조합으로 조건을 맞추는 퍼즐."],
                ["주요 타깃", "공장/오버쿡드를 좋아하지만 생성형 AI 경험은 거의 없는 플레이어."],
                ["핵심 경험", "손님 → 주문서 집기 → 입력기 → 선반 칩 → 슬롯 → 생산 → 출구 → 전달 → 정산."],
                ["기본 스테이션", "입력기·슬롯(3)·생산기·출구는 맵에 고정. 플레이어가 꽂는 것은 중간 모듈 칩(+그림 제작기)."],
                ["비교의 재미", "X로 주문서/완성 이미지를 들여다보며 조건 충족·절차적 프리뷰·점수를 확인한다."],
                ["표현 원칙", "주문서, 그림 제작기, 스타일 가공기 등 기능이 보이는 게임 용어·아이콘을 사용한다."],
                ["교육성의 위치", "칩을 꽂으면 결과가 바뀌는 인과로 AI 파이프라인 감각을 익힌다. 실모델 호출은 없다."],
            ],
            w,
        ),
        P("<b>2. 핵심 플레이 루프</b>", "h2"),
        P("라운드 시작 → 손님 응대(목표 인원) → 칩 조합 생산(VRAM 소모) → 전달 → 라운드 정산(등급·크레딧) → 다음 라운드"),
        table(
            [
                ["플레이어 상황", "게임이 주는 답"],
                ["손님이 기다려 인내심이 닳는다", "동시 대기 최대 2명. 인내심 바·말풍선으로 우선순위를 잡는다. 튜토리얼(r00)은 인내심 감소 없음."],
                ["주문서와 결과가 다르다", "X 들여다보기에서 통과/미달 요약과 절차적 프리뷰를 본다. 슬롯 칩을 바꿔 다시 생산한다."],
                ["VRAM이 부족해 보인다", "예산은 소프트 제약. 초과해도 생산 가능하나 속도 저하 + 정산 점수 감소."],
                ["어떤 칩을 써야 할지 모른다", "라운드마다 새 칩 해금 시 중앙 모달로 소개. 프롬프트는 정답 칩 이름을 직설하지 않는다."],
                ["조작을 처음 배운다", "r00 실습 튜토리얼: 단계 잠금으로 한 손님을 실패 없이 완주한다."],
            ],
            w,
        ),
        PageBreak(),
        *header_bar("3. Overcooked vs 팩토리 — 구현된 선택"),
        table(
            [
                ["축", "가져간 것", "가져가지 않은 것"],
                ["Overcooked", "캐릭터 이동·운반, 손님 유입, 인내심, 주방 동선", "협동 멀티, 재료 다단계 조리 미니게임"],
                ["팩토리", "모듈 칩을 슬롯에 꽂아 파이프라인 구성, VRAM 비용", "포트 드래그 DAG, 자유 장치 배치, 물류 시뮬레이션"],
                ["프롬프트 비교", "X 들여다보기 + 절차적 CSS 프리뷰 + 평가 요약", "실제 LLM/이미지 API, 자유 프롬프트 입력 채점"],
            ],
            [28 * mm, 72 * mm, 72 * mm],
        ),
        P(
            "<b>결정(구현됨):</b> MVP는 ‘골판지 상자 공장에서 일하는 고양이’다. "
            "오버쿡드의 감정은 운반·손님으로, 사고의 재미는 최소 칩 조합·VRAM으로, "
            "학습의 재미는 주문서↔결과 들여다보기로 제공한다.",
            "note",
        ),
        P("<b>4. 구현 범위와 비범위</b>", "h2"),
        table(
            [
                ["포함 (현재)", "제외 / 보류"],
                ["r00 튜토리얼 + r01~r06 라운드", "라이프/HP 실패 아웃, E키 상호작용"],
                ["손님 최대 2, 인내심 45초, 이탈 시 관련 주문서/이미지 제거", "동시 손님 3+ 폭주 풀스펙"],
                ["모듈 칩 6종 해금, 슬롯 3, 선반 타입당 1개/라운드", "칩 상점·크레딧 소모 구매"],
                ["VRAM 소프트 제약 + 효율 점수 S~D", "전력/유지비/연구 트리"],
                ["절차적 CSS 프리뷰, 로컬 세이브 v2", "실모델 연동, 모바일 세로, 멀티플레이"],
            ],
            [86 * mm, 86 * mm],
        ),
        P(
            "<b>핵심 질문</b><br/>"
            "AI를 모르는 플레이어가, 튜토리얼만으로 운반 루프를 익히고, "
            "이후 라운드에서 ‘필요한 칩만’으로 손님을 맞출 수 있는가?",
            "note",
        ),
    ]
    build(PLAN_DIR / "01_개요.pdf", story)


def doc_02():
    story = cover("02", "시스템", "운반·스테이션·손님·VRAM·평가의 단일 규칙")
    story += header_bar("1. 기본 용어와 전문가 대응")
    story += [
        table(
            [
                ["실제 AI 개념", "게임 용어", "플레이어가 느끼는 효과"],
                ["Prompt", "주문서", "손님 요청. X로 다시 읽고 결과와 비교한다."],
                ["Negative Prompt", "금지 목록 칩", "모자 등 원하지 않는 요소를 줄인다."],
                ["Checkpoint / Model", "그림 제작기 칩", "생산에 필수. 기본 그림을 만든다."],
                ["LoRA", "스타일 가공기 칩", "동화풍 등 그림체를 바꾼다."],
                ["ControlNet", "구도 설계기 칩", "중앙 배치 등 구도를 맞춘다."],
                ["Upscaler", "선명화 칩", "흐림을 줄이고 선명 점수를 올린다."],
                ["QC / Guard", "품질 검사기 칩", "검사·품질 밴드에 기여한다."],
                ["VRAM / Cost", "VRAM", "생산마다 슬롯 칩 비용 합을 소모한다."],
            ],
            [40 * mm, 45 * mm, 87 * mm],
        ),
        P("<b>2. 조작</b>", "h2"),
        table(
            [
                ["입력", "동작"],
                ["WASD / 방향키", "이동 (속도 220). C 대시(속도 780, 0.12초, 쿨다운 0.55초)."],
                ["Z", "가장 가까운 대상과 상호작용(범위 70). 손님이면 주문서 집기/이미지 전달, 스테이션이면 넣기·생산·꺼내기, 선반이면 칩 집기. 찬 슬롯+칩 소지 시 스왑."],
                ["Z (빈 곳)", "들고 있는 주문서/칩/이미지를 발 앞에 내려놓기. 빈손이면 바닥 물건 집기. 주변에 대상도 없고 손도 비면 반응 없음(에러 없음)."],
                ["X", "주문서 또는 완성 이미지를 들고 있을 때만 들여다보기 모달."],
            ],
            [36 * mm, 136 * mm],
        ),
        PageBreak(),
        *header_bar("3. 주방 스테이션과 생산 흐름"),
        P("맵 960×720. 상단 카운터(손님), 중앙 컨베이어 라인, 하단 칩 선반."),
        table(
            [
                ["스테이션", "역할", "규칙"],
                ["손님 카운터", "주문서 수령 / 이미지 전달", "이미지 customerId가 일치해야 전달. 틀림 거절."],
                ["입력기", "주문서 투입", "주문서를 들고 Z. 이미 있으면 거부."],
                ["슬롯 ×3", "모듈 칩 장착", "빈 슬롯에 꽂기, 찬 슬롯은 스왑. 생산 중 변경 불가."],
                ["생산기", "생산 시작", "입력 주문서 + 슬롯에 image-maker 필수."],
                ["출구", "완성 이미지 수거", "생산 완료 후 폴라로이드를 집어 손님에게."],
                ["선반", "해금 칩 재고", "라운드당 타입 1개. 집으면 ‘없음’, 라인 리셋 시 복구."],
                ["바닥", "임시 보관", "Z로 내려놓기/집기. 손님 이탈 시 그 손님 주문서·이미지는 제거, 칩은 유지."],
            ],
            [32 * mm, 48 * mm, 92 * mm],
        ),
        P("<b>4. 손님 시스템</b>", "h2"),
        table(
            [
                ["요소", "값 / 동작"],
                ["동시 대기", "최대 2명"],
                ["인내심", "기본 45초. 대기 중 감소. r00(isTutorial)은 감소·이탈 없음."],
                ["스폰", "라운드 시작 1명. 이후 쿨다운 약 2.5초(서빙/이탈 후 단축)로 목표 인원까지."],
                ["말풍선", "머리 위 한 줄 프롬프트(길면 말줄임). 주문서 집으면 숨김."],
                ["이탈", "인내심 0 → left. 관련 주문서/이미지(손·입력·출구·바닥) 정리. 생산 중이면 해당 입력 취소."],
                ["보상", "조건 충족 전달: 주문 reward×0.35 크레딧. 미달 전달도 가능하나 ×0.1. 둘 다 해소 인원에 포함."],
            ],
            [36 * mm, 136 * mm],
        ),
        PageBreak(),
        *header_bar("5. VRAM · 생산 · 점수"),
        table(
            [
                ["규칙", "상세"],
                ["소모 시점", "생산 완료 시 슬롯에 꽂힌 칩 vramCost 합을 누적."],
                ["소프트 제약", "예산 초과해도 생산 가능. 초과량에 비례해 생산 시간 배율 상승(상한 약 2.5×)."],
                ["생산 시간", "시뮬 처리시간×0.35(최소 0.8초)×슬로우다운."],
                ["라운드 점수(100)", "납품 40 + VRAM효율 40 + 이탈방어 10 + 예산준수 10."],
                ["효율", "이상적 VRAM(주문별 최소 칩 비용 합) / 실제 사용량."],
                ["등급", "S≥90 / A≥75 / B≥60 / C≥40 / D. 정산 크레딧 = baseReward + 등급보너스 + 성공납품×10."],
                ["재도전", "이미 클리어한 라운드는 정산 크레딧 절반, bestScore는 갱신."],
            ],
            [36 * mm, 136 * mm],
        ),
        P("<b>6. 결과 생성</b>", "h2"),
        P(
            "GenerationSimulator가 칩 ID 목록으로 태그·점수를 결정적으로 계산한다. "
            "미리보기는 CSS 절차적 연출(스타일·모자·구도·선명·검사 + 품질 밴드 lo/mid/hi). "
            "실모델·네트워크 호출 없음."
        ),
        P(
            "<b>인과성:</b> 그림 제작기 없이는 생산 불가. 스타일/금지/구도/선명/검사 칩은 해당 조건·점수에만 기여한다. "
            "불필요 칩은 VRAM만 늘려 효율·예산을 깎는다.",
            "note",
        ),
    ]
    build(PLAN_DIR / "02_시스템.pdf", story)


def doc_03():
    story = cover("03", "콘텐츠", "r00 실습 튜토리얼과 r01~r06 라운드·주문·칩 해금")
    story += header_bar("1. 라운드 구성 (구현 수치)")
    story += [
        table(
            [
                ["라운드", "목표 손님", "VRAM 예산", "해금 칩", "주문 풀", "base"],
                ["r00 튜토리얼", "1", "32", "image-maker", "o01", "50"],
                ["r01 첫 손님들", "3", "24", "image-maker", "o01", "100"],
                ["r02 동화풍", "4", "44", "+style", "o01,o02", "120"],
                ["r03 금지", "4", "42", "+ban-list", "o01~o03", "140"],
                ["r04 구도", "5", "55", "+composition", "o01~o04", "160"],
                ["r05 선명화", "5", "61", "+sharpener", "o01~o05", "180"],
                ["r06 품질 검사", "6", "74", "+quality-checker", "o01~o06", "200"],
            ],
            [32 * mm, 22 * mm, 24 * mm, 38 * mm, 32 * mm, 18 * mm],
        ),
        P(
            "VRAM 예산은 해당 라운드 손님 큐의 이론 최소 VRAM(ideal) 이상으로 맞춘다. "
            "최적 칩만 쓰면 초과하지 않고, 불필요 칩을 꽂을 때만 슬로우다운·예산 감점이 난다. "
            "큐는 buildRoundOrderQueue로 세션·채점이 공유한다.",
            "note",
        ),
        P("<b>2. r00 실습형 튜토리얼</b>", "h2"),
        table(
            [
                ["규칙", "동작"],
                ["단계 잠금", "PickOrder → InsertInput → PickChip → InsertSlot → Produce → WaitOutput → PickOutput → Deliver → Done"],
                ["허용 상호작용", "현재 단계 목표에만 Z 허용. 다른 대상은 짧은 안내 토스트. 바닥 내려놓기 차단."],
                ["실패 없음", "인내심 감소/이탈 없음. 해금 모달 생략(모듈 자동 introduced)."],
                ["안내 UI", "사이드 #tutorial-message + 월드 가이드 화살표/하이라이트. 완료 후 짧은 정산 → r01."],
            ],
            [36 * mm, 136 * mm],
        ),
        PageBreak(),
        *header_bar("3. 주문(O01~O06)과 모듈 칩"),
        table(
            [
                ["주문", "학습 포인트", "이상적 칩(요지)"],
                ["O01", "그림 제작기만으로 기본 납품", "image-maker (8)"],
                ["O02", "동화풍 스타일", "maker + style (14)"],
                ["O03", "모자 금지", "maker + ban-list"],
                ["O04", "구도(중앙)", "maker + composition"],
                ["O05", "선명", "maker + sharpener"],
                ["O06", "품질 검사", "maker + quality-checker(+필요 시 조합)"],
            ],
            [24 * mm, 70 * mm, 78 * mm],
        ),
        table(
            [
                ["칩 ID", "이름", "VRAM", "해금", "unlockTutorial 요지"],
                ["image-maker", "그림 제작기", "8", "r00", "생산에 꼭 필요한 기본 칩"],
                ["style-processor", "스타일 가공기", "6", "r02", "그림체·색감"],
                ["ban-list", "금지 목록", "4", "r03", "원하지 않는 요소 차단"],
                ["composition-planner", "구도 설계기", "5", "r04", "위치·프레임"],
                ["sharpener", "선명화", "6", "r05", "흐림 제거"],
                ["quality-checker", "품질 검사기", "5", "r06", "품질 점검"],
            ],
            [40 * mm, 36 * mm, 20 * mm, 18 * mm, 58 * mm],
        ),
        P(
            "프롬프트 문구는 정답 칩 이름을 직설하지 않는 우회 표현을 쓴다. "
            "모듈 학습은 해금 모달(unlockTutorial)에 맡긴다. price 필드는 데이터만 있고 상점은 없다.",
            "note",
        ),
        P("<b>4. 선반·슬롯 규칙</b>", "h2"),
        P("라운드당 해금 칩 타입마다 선반 재고 1개. 집으면 소진, 「라인 비우기」로 복구. 슬롯 3칸, 같은 칩 스왑 거부."),
        P("<b>5. 에셋 기준 (제품 화면)</b>", "h2"),
        P(
            "Cozy/Cute 픽셀 공장: 타일·컨베이어·스테이션·칩·손님(토끼/개/햄스터/오리). "
            "플레이어는 Cat_* 32×32 시트(idle/walk + 운반). 들여다보기 프리뷰는 CSS 절차적 고양이 장면. "
            "플레이어 Cat_* 원본 스프라이트는 기획·아트 패스에서 수정하지 않는 것을 원칙으로 한다."
        ),
    ]
    build(PLAN_DIR / "03_콘텐츠.pdf", story)


def doc_04():
    story = cover("04", "UI", "탑바·사이드 라운드 안내·주방 피드백·모달")
    story += header_bar("1. 화면 구조 (구현)")
    story += [
        table(
            [
                ["영역", "표시"],
                ["메뉴", "새 게임(r00부터) / 이어서 하기 / 진행 요약. WASD·Z·C·X 안내."],
                ["탑바", "라운드 단계, 크레딧, 손님 해소 수, VRAM used/budget, 이번 생산 예상, 손 아이콘·라벨, 라인 비우기·저장 초기화·메뉴."],
                ["좌측 패널", "라운드 제목·목표·튜토리얼/단계 문구(#tutorial-message)·해금 칩 목록."],
                ["중앙", "Phaser 960×720 주방. 하이라이트 프레임, soft glow, [Z] 키캡, guide_arrow, 생산 프로그레스/COMPLETE, 램프, 유령 투입 힌트."],
                ["토스트", "상호작용 결과·튜토리얼 힌트·이탈 등 짧은 알림."],
            ],
            [32 * mm, 140 * mm],
        ),
        P("<b>2. 들여다보기 (X)</b>", "h2"),
        table(
            [
                ["들고 있는 것", "모달 내용"],
                ["주문서", "손님 프롬프트 원문 + 칩을 아끼라는 힌트."],
                ["완성 이미지", "요청 문구 + 절차적 프리뷰 + 조건 충족/미달 요약 + 점수·이번 생산 VRAM."],
            ],
            [40 * mm, 132 * mm],
        ),
        P("<b>3. 해금·튜토리얼 UI</b>", "h2"),
        table(
            [
                ["상황", "UI"],
                ["일반 라운드, 미소개 칩", "중앙 블로킹 모달(#unlock-tutorial). Phaser pause. ‘알겠어요’ → introducedModuleIds 저장 후 재개."],
                ["r00 튜토리얼", "해금 모달 생략. 사이드 단계 문구 + 월드 가이드만."],
                ["라운드 정산", "등급·점수 내역·크레딧. 튜토리얼은 짧은 완료 카피 후 ‘본 라운드 시작’."],
            ],
            [48 * mm, 124 * mm],
        ),
        PageBreak(),
        *header_bar("4. 인게임 피드백 원칙"),
        table(
            [
                ["상황", "연출"],
                ["올바른 상호작용", "픽업/인서트/성공 FX, 카운터 벨, 크레딧 플로팅 텍스트."],
                ["잘못된 대상(일반)", "에러 FX + 메시지. 빈 곳 빈손 Z는 무반응."],
                ["튜토리얼 잘못된 Z", "강한 에러보다 현재 단계 안내 토스트 우선."],
                ["인내심", "바 색(녹→황→적), 낮으면 불안 애니·땀."],
                ["생산 중/완료", "스테이션 busy/done 텍스처, 스파크, 프로그레스 바, COMPLETE, 출구 팝."],
            ],
            [40 * mm, 132 * mm],
        ),
        P(
            "<b>UI 완료 판정</b><br/>"
            "AI 용어를 몰라도 탑바 VRAM·손님 수, 사이드 라운드 안내, 머리 위 말풍선, X 프리뷰만으로 "
            "다음 행동(어떤 칩을 꽂을지 / 누구에게 줄지)을 고를 수 있어야 한다.",
            "note",
        ),
    ]
    build(PLAN_DIR / "04_UI.pdf", story)


def doc_05():
    story = cover("05", "개발", "아키텍처·데이터·검증·향후 확장 (구현 기준)")
    story += header_bar("1. 기술·MVP 범위")
    story += [
        table(
            [
                ["영역", "현재", "보류"],
                ["플랫폼", "PC 브라우저. Phaser 3 + TypeScript + Vite. GitHub Pages(main→Actions).", "네이티브/모바일 세로"],
                ["장르 구현", "캐릭터 운반 + 칩 슬롯 + 라운드 VRAM", "포트 DAG, 장치 자유 배치"],
                ["비교 UX", "X 모달 + CSS 프리뷰 + 평가 요약", "실모델/실프롬프트 채점"],
                ["자원", "크레딧(보상만), VRAM 예산", "상점·유지비·연구 트리"],
                ["튜토리얼", "r00 단계 잠금 + 해금 모달", "라이프/E키/별도 퀘스트 엔진"],
                ["결과", "결정적 GenerationSimulator", "실제 생성 API"],
            ],
            [28 * mm, 84 * mm, 60 * mm],
        ),
        P("<b>2. 구현 책임 (현재 코드)</b>", "h2"),
        table(
            [
                ["컴포넌트", "책임"],
                ["KitchenSession", "운반·손님·슬롯·생산·VRAM·이탈·라운드 종료. 튜토리얼 시 인내심 스킵."],
                ["KitchenScene", "Phaser 이동·대시·Z/X/C·스테이션·가이드 화살표·연출."],
                ["TutorialGuide", "r00 단계 FSM, 허용 대상, 힌트. 세션 규칙을 재설계하지 않는 얇은 레이어."],
                ["UIController", "메뉴·HUD·해금 모달·정산·세이브 연동·튜토리얼 문구."],
                ["RoundScoreService", "ideal VRAM·100점 환산·등급·크레딧."],
                ["ProgressionService / SaveService", "activeRoundId, 해금·소개 칩, bestScore, localStorage v2."],
                ["GenerationSimulator / OrderEvaluator", "칩→태그·점수·통과 여부. 프리뷰 키."],
            ],
            [48 * mm, 124 * mm],
        ),
        PageBreak(),
        *header_bar("3. 데이터"),
        table(
            [
                ["데이터", "핵심 필드"],
                ["RoundDefinition", "id, targetCustomers, vramBudget, availableModuleIds, customerOrderPool, baseReward, isTutorial?"],
                ["ModuleDefinition", "vramCost, unlockTutorial, iconKey, (price는 미사용)"],
                ["OrderDefinition", "prompt, requiredTags, reward, …"],
                ["SaveData v2", "credits, completedRoundIds, unlockedModuleIds, introducedModuleIds, tutorialStage, activeRoundId, bestRoundScores"],
            ],
            [40 * mm, 132 * mm],
        ),
        P("<b>4. 검증</b>", "h2"),
        table(
            [
                ["명령", "기대"],
                ["npm run typecheck", "통과"],
                ["npm run test", "Vitest(코어·튜토리얼·세이브·점수 등)"],
                ["npm run build", "dist/ 생성, Pages 배포"],
                ["수동", "새 게임→r00 완주→r01, Z/C/X, 이탈 시 주문서 정리, 해금 모달, 정산"],
            ],
            [40 * mm, 132 * mm],
        ),
        P("<b>5. 다음 확장 (구현 후 후보)</b>", "h2"),
        table(
            [
                ["후보", "의도"],
                ["손님 3+ / 유사 주문 배치", "폭주감 강화. 현재 최대 2 유지가 기본."],
                ["사운드·연출 폴리시", "벨/생산/전달 피드백 강화"],
                ["프리뷰 변형 추가", "배경·주체 다양화 (여전히 절차적)"],
                ["실모델 연동", "보류. API 키 없이 동작하는 MVP 원칙 유지"],
            ],
            [48 * mm, 124 * mm],
        ),
        P(
            "<b>개발 완료 판정 (개정)</b><br/>"
            "신규 플레이어가 r00만으로 루프를 익히고, r01~r03에서 해금 칩과 VRAM을 이해하며, "
            "X 프리뷰로 성공/실패를 말할 수 있으면 MVP 합격으로 본다.",
            "note",
        ),
        P(
            "<b>폐기된 구기획 요약</b><br/>"
            "포트 연결 FactoryGraph, 캐릭터 미조작 파이프라인 배치, Ctrl+Z 그래프 Undo, "
            "O07~O10 폭주 주문, VRAM을 MVP 후반으로 미루던 서술, E키 상호작용 — "
            "모두 현재 빌드와 맞지 않아 이 개정에서 제거했다.",
            "body",
        ),
    ]
    build(PLAN_DIR / "05_개발.pdf", story)


if __name__ == "__main__":
    print("PLAN_DIR", PLAN_DIR)
    print("FONT", _FONT)
    doc_01()
    doc_02()
    doc_03()
    doc_04()
    doc_05()
    print("done")
