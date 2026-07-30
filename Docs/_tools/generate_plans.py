# -*- coding: utf-8 -*-
"""AI Factory 기획서 PDF 생성기 (2026-07-30 피드백 개정)."""
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
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = pathlib.Path(__file__).resolve().parents[2]
PLAN_DIR = next(
    p
    for p in ROOT.iterdir()
    if p.is_dir() and not p.name.startswith(".") and p.name not in {"dist", "Docs", "node_modules", "src", ".github"}
)

pdfmetrics.registerFont(TTFont("Malgun", r"C:\Windows\Fonts\malgun.ttf"))
pdfmetrics.registerFont(TTFont("MalgunBold", r"C:\Windows\Fonts\malgunbd.ttf"))

NAVY = colors.HexColor("#102b46")
TEAL = colors.HexColor("#23b5c5")
AMBER = colors.HexColor("#f2a900")
LIGHT = colors.HexColor("#f4f7fb")
LINE = colors.HexColor("#d5dee8")


def styles():
    base = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle(
            "cover_kicker", fontName="MalgunBold", fontSize=10, textColor=TEAL, alignment=TA_CENTER, spaceAfter=6
        ),
        "cover_title": ParagraphStyle(
            "cover_title", fontName="MalgunBold", fontSize=22, textColor=NAVY, alignment=TA_CENTER, spaceAfter=8, leading=28
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub", fontName="Malgun", fontSize=11, textColor=NAVY, alignment=TA_CENTER, spaceAfter=4, leading=16
        ),
        "meta": ParagraphStyle("meta", fontName="Malgun", fontSize=9, textColor=colors.HexColor("#4a5b6e"), leading=13, spaceAfter=3),
        "h1": ParagraphStyle("h1", fontName="MalgunBold", fontSize=14, textColor=NAVY, spaceBefore=10, spaceAfter=6, leading=20),
        "h2": ParagraphStyle("h2", fontName="MalgunBold", fontSize=11, textColor=NAVY, spaceBefore=8, spaceAfter=4, leading=16),
        "body": ParagraphStyle("body", fontName="Malgun", fontSize=9.5, textColor=NAVY, leading=14, spaceAfter=4),
        "bullet": ParagraphStyle("bullet", fontName="Malgun", fontSize=9.5, textColor=NAVY, leading=14, leftIndent=12, spaceAfter=2),
        "note": ParagraphStyle(
            "note",
            fontName="Malgun",
            fontSize=9,
            textColor=NAVY,
            backColor=LIGHT,
            borderPadding=6,
            leading=13,
            spaceBefore=4,
            spaceAfter=6,
        ),
        "cell": ParagraphStyle("cell", fontName="Malgun", fontSize=8.5, textColor=NAVY, leading=12),
        "cell_b": ParagraphStyle("cell_b", fontName="MalgunBold", fontSize=8.5, textColor=NAVY, leading=12),
        "footer": ParagraphStyle("footer", fontName="Malgun", fontSize=8, textColor=colors.HexColor("#6b7c8f"), alignment=TA_CENTER),
    }


S = styles()


def P(text: str, style="body"):
    return Paragraph(text.replace("\n", "<br/>"), S[style])


def cover(doc_no: str, title: str, subtitle: str):
    return [
        Spacer(1, 28 * mm),
        P("AI FACTORY | 초보자 친화 MVP 상세 기획", "cover_kicker"),
        P(f"{doc_no}. {title}", "cover_title"),
        P(subtitle, "cover_sub"),
        Spacer(1, 10 * mm),
        P("문서 " + doc_no, "meta"),
        P("대상: 생성형 AI 비경험자 중심의 PC 프로토타입", "meta"),
        P("개정일: 2026-07-30 (피드백 반영 개정)", "meta"),
        P("피드백 출처: 양정환 — Overcooked형 주문 압박 / 주문 폭주 팩토리 / 주문서↔결과 비교", "meta"),
        Spacer(1, 8 * mm),
        P(
            "문서 목적<br/>이번 개정은 기존 ‘공장 퍼즐’ 축을 유지하면서, 손님이 몰려오는 주문 폭주감과 "
            "주문서(플레이어 프롬프트)와 결과물의 비교 재미를 핵심 경험으로 고정한다. "
            "주문서 입력기와 배송대는 기본 장치로 항상 배치되며, 플레이어는 중간 모듈만 구성한다.",
            "note",
        ),
        P(
            "공통 원칙: 게임이 먼저, AI 학습은 결과다. 기본 화면에는 AI 전문 용어를 노출하지 않으며, "
            "전문 용어는 도감·전문가 모드·상세 보조 정보에서만 제공한다.",
            "body",
        ),
        PageBreak(),
    ]


def header_bar(text: str):
    return [
        P("기획서 개정본 · 기본 용어 우선 / 전문가 정보 선택 공개", "meta"),
        P(text, "h1"),
    ]


def table(data, col_widths):
    styled = []
    for r, row in enumerate(data):
        styled.append([Paragraph(str(c), S["cell_b" if r == 0 else "cell"]) for c in row])
    t = Table(styled, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
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
    # fix header text color via rebuilding first row with white
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
        canvas.setFont("Malgun", 8)
        canvas.setFillColor(colors.HexColor("#6b7c8f"))
        canvas.drawCentredString(A4[0] / 2, 8 * mm, f"AI FACTORY 기획서 · {path.stem} · {doc_.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)


def doc_01():
    w = [32 * mm, 140 * mm]
    story = cover("01", "개요", "손님이 몰려오는 생성형 이미지 공장, 주문서와 결과를 맞춰 가는 파이프라인 퍼즐")
    story += header_bar("1. 제품 정의")
    story += [
        P("<b>한 줄 소개</b>", "h2"),
        P(
            "주문을 들고 몰려오는 손님에 맞춰 파이프라인을 짜고, 주문서(플레이어 프롬프트)와 결과물을 비교하며 "
            "더 안정적인 공장을 만드는 주문 폭주형 공장 자동화 퍼즐."
        ),
        table(
            [
                ["항목", "개정 결정"],
                ["핵심 콘셉트", "Factorio/Shapez의 파이프라인 설계 × Overcooked의 ‘주문이 몰려오는 압박’. 요리 액션이 아니라 생산 라인 구축으로 응대한다."],
                ["장르 포지션", "오버쿡드 = 손님·주문 폭주·시간 압박의 감정. 팩토리 = 파이프라인 구축·병목 해결의 사고. 둘을 합친 ‘주문 대응형 팩토리’."],
                ["주요 타깃", "공장/자동화 게임을 좋아하지만 생성형 AI 경험은 거의 없는 플레이어."],
                ["핵심 경험", "손님 유입 → 주문서 해석 → 중간 장치 구성 → 결과 비교 → 문제 수정 → 다음 손님 응대."],
                ["기본 장치", "주문서 입력기·배송대는 공장에 항상 있다. 플레이어는 그림 제작기·스타일 등 중간 장치만 배치한다."],
                ["비교의 재미", "플레이어가 읽거나 다듬은 주문서와 실제 결과물을 나란히 놓고 ‘어디가 맞았/틀렸는지’를 읽는 것이 핵심 재미다."],
                ["표현 원칙", "주문서, 그림 제작기, 스타일 가공기처럼 기능이 예상되는 게임 용어와 아이콘을 사용한다."],
                ["교육성의 위치", "AI 원리는 플레이의 보상으로 자연스럽게 이해하게 한다. 교육용 프로그램처럼 보이지 않게 한다."],
            ],
            w,
        ),
        P("<b>2. 핵심 플레이 루프</b>", "h2"),
        P("손님 도착 → 주문 확인 → 파이프라인 구축/조정 → 생산 → 주문서↔결과 비교 → 문제 수정 → 납품 → 다음 손님"),
        table(
            [
                ["플레이어 상황", "게임이 주는 답"],
                ["손님이 한꺼번에 몰린다", "대기열·만족도·남은 시간을 보고 우선순위를 정하거나 공용 라인을 재사용한다."],
                ["주문서와 결과가 다르다", "비교 화면에서 어긋난 조건을 읽고 장치 또는 주문서 문구를 고친다."],
                ["이미지가 흐리다", "선명화 장치를 추가하거나 정제 방식을 바꾼다."],
                ["원하는 그림체가 아니다", "스타일 가공기와 스타일 칩을 넣는다."],
                ["생산이 느려 손님이 떠난다", "병목을 줄이거나 빠른 제작 방식·분배 장치를 해금해 사용한다."],
            ],
            w,
        ),
        PageBreak(),
        *header_bar("3. Overcooked vs 팩토리 — 이번 개정의 선택"),
        table(
            [
                ["축", "가져올 것", "가져오지 않을 것"],
                ["Overcooked", "손님 유입, 주문 대기열, 시간·만족도 압박, ‘지금 이 주문을 맞출까’의 긴박감", "캐릭터 이동·재료 운반·협동 액션, 주방 동선 혼잡"],
                ["팩토리", "장치 배치, 포트 연결, 라인 재사용, 병목 개선, 자동화 확장", "복잡한 물류 시뮬레이션을 초반부터 강제하는 것"],
                ["프롬프트 비교", "주문서 텍스트와 결과 미리보기의 직접 대조, 어긋난 조건 하이라이트", "실제 LLM/이미지 모델 호출을 필수화하는 것"],
            ],
            [28 * mm, 72 * mm, 72 * mm],
        ),
        P(
            "<b>결정:</b> MVP 포지션은 ‘손님이 몰려오는 이미지 공장’이다. "
            "오버쿡드의 감정은 주문 폭주로, 사고의 재미는 파이프라인으로, 학습의 재미는 주문서↔결과 비교로 제공한다.",
            "note",
        ),
        P("<b>4. 정보 공개와 MVP 경계</b>", "h2"),
        table(
            [
                ["시점", "보이는 것", "숨기는 것"],
                ["초반", "현재 손님 1명, 주문서, 완성품, 쉬운 비교 문장", "다중 대기열, 전력, 연산 동력, 세부 점수"],
                ["중반 초입", "대기열 2~3, 남은 시간, 주문서↔결과 하이라이트", "만족도 세부, 충돌/호환성"],
                ["중반", "만족도, 처리 시간, 불량률, 4개 품질 항목, 단순 전력", "작업 공간, 전문 수치"],
                ["후반", "다중 라인, 자동화, 시너지/충돌, 전문가 모드", "실제 모델 실행 방식"],
            ],
            [28 * mm, 72 * mm, 72 * mm],
        ),
        P("<b>5. 수정된 MVP</b>", "h2"),
        table(
            [
                ["MVP에 포함", "후반 또는 보류"],
                ["손님 1→소수 대기열, 주문 타이머(완화), 납품/이탈", "동시 손님 폭주 시뮬레이션 풀스펙"],
                ["장치 배치·포트 연결·유효 연결만 허용", "분배기·재처리 본격 자동화"],
                ["주문서↔결과 나란히 비교, 어긋난 조건 문장, 추천 장치", "플레이어 자유 프롬프트 입력의 실제 AI 평가"],
                ["6~8 핵심 장치, O01~O06(+폭주형 1~2), 튜토리얼", "VRAM/연구 트리/멀티플레이/실모델 연동"],
            ],
            [86 * mm, 86 * mm],
        ),
        P(
            "<b>MVP 핵심 질문</b><br/>"
            "AI를 모르는 플레이어가, 몰려오는 손님의 주문서를 파이프라인으로 맞추고, "
            "결과 비교만으로 ‘무엇을 고칠지’ 알 수 있는가?",
            "note",
        ),
    ]
    build(PLAN_DIR / "01_개요.pdf", story)


def doc_02():
    story = cover("02", "시스템", "주문 대기열, 파이프라인 규칙, 주문서↔결과 비교의 단일 기준")
    story += header_bar("1. 기본 용어와 전문가 정보")
    story += [
        table(
            [
                ["실제 AI 개념", "기본 게임 용어", "플레이어가 이해할 효과"],
                ["Prompt", "주문서", "만들 그림의 대상과 조건을 전달한다. 결과와 직접 비교한다."],
                ["Negative Prompt", "금지 목록", "원하지 않는 요소를 피하게 한다."],
                ["Checkpoint / Model", "그림 제작기", "그림의 기본 표현과 결과 뼈대를 고른다."],
                ["LoRA", "스타일 칩", "특정 그림체와 표현 방식을 적용한다."],
                ["ControlNet", "구도 설계기", "대상의 위치와 프레임을 맞춘다."],
                ["Upscaler", "고화질/선명화 장치", "완성품을 더 또렷하게 만든다."],
                ["Queue / SLA", "손님 대기열 / 납품 시한", "손님이 기다리는 시간과 만족도를 관리한다."],
            ],
            [40 * mm, 45 * mm, 87 * mm],
        ),
        P("<b>2. 주문 폭주 시스템 (Overcooked형 감정)</b>", "h2"),
        P("손님은 주문서 카드를 들고 공장 앞에 줄을 선다. 플레이어는 캐릭터를 조작하지 않고, 파이프라인과 우선순위로 응대한다."),
        table(
            [
                ["요소", "초반", "중반 이후"],
                ["손님 수", "항상 1명. 튜토리얼 집중.", "대기열 2~3. 같은 라인으로 여러 주문을 처리."],
                ["시한", "넉넉한 제한 또는 없음", "주문별 남은 시간. 실패 시 이탈·크레딧 감소."],
                ["만족도", "숨김", "대기 시간·불량·재작업에 따라 변화."],
                ["우선순위", "자동", "급한 손님 강조. 같은 조건 주문은 배치 생산 유도."],
                ["실패 피드백", "문제 문장 + 추천 장치", "이탈 사유: 느림 / 조건 불일치 / 불량."],
            ],
            [32 * mm, 70 * mm, 70 * mm],
        ),
        PageBreak(),
        *header_bar("3. 주문서 ↔ 결과 비교 (핵심 재미)"),
        P(
            "플레이어는 ‘주문서에 적힌 조건’과 ‘방금 나온 그림’을 항상 나란히 본다. "
            "점수보다 먼저, 맞은 조건/어긋난 조건이 문장과 하이라이트로 표시된다."
        ),
        table(
            [
                ["비교 항목", "주문서 쪽", "결과 쪽", "피드백 예"],
                ["대상", "고양이", "고양이 실루엣", "대상이 맞습니다."],
                ["스타일", "동화책처럼", "실사 톤", "그림체가 주문과 다릅니다 → 스타일 가공기"],
                ["금지", "모자 없음", "모자 있음", "금지 요소가 남았습니다 → 금지 목록"],
                ["구도", "화면 중앙", "좌측", "위치가 어긋났습니다 → 구도 설계기"],
                ["선명", "선명하게", "흐림", "이미지가 흐립니다 → 선명화 장치"],
            ],
            [28 * mm, 36 * mm, 40 * mm, 68 * mm],
        ),
        P(
            "<b>프롬프트 개입(후반 옵션):</b> 중반 이후에는 주문서 문구를 살짝 다듬는 ‘주문 보정’을 해금할 수 있다. "
            "MVP에서는 고정 주문서를 읽고 장치로 맞추는 쪽이 기본이며, 자유 입력 평가는 시뮬레이션 태그로만 처리한다.",
            "note",
        ),
        P("<b>4. 초반 핵심 장치 8종</b>", "h2"),
        table(
            [
                ["장치", "한 줄 설명", "추천 사용"],
                ["주문서 입력기 (기본)", "항상 배치. 주문 조건을 라인에 전달", "삭제·추가 배치 불가"],
                ["배송대 (기본)", "항상 배치. 통과 완성품 납품", "삭제·추가 배치 불가"],
                ["그림 제작기", "주문서를 그림 초안으로 변환", "플레이어가 구성하는 핵심 중간 장치"],
                ["스타일 가공기", "그림체·색감 변경", "동화풍 등 화풍 조건"],
                ["금지 목록 입력기", "원하지 않는 요소 차단", "모자 없음 등"],
                ["구도 설계기", "위치·프레임 정렬", "중앙 배치"],
                ["선명화 장치", "흐림 제거", "선명도 조건"],
                ["품질 검사기", "비교 결과의 원인을 문장화", "폭주 중 빠른 진단"],
            ],
            [40 * mm, 70 * mm, 62 * mm],
        ),
        PageBreak(),
        *header_bar("5. 연결 규칙과 초보자 보호"),
        table(
            [
                ["규칙", "초반 동작", "중반 이후"],
                ["연결 가능 포트", "호환 포트만 빛남. 비호환은 연결 불가.", "불가 이유를 짧게 설명."],
                ["자동 연결", "추천 위치 근처 배치 시 다음 포트 제안", "자동 연결 on/off"],
                ["되돌리기", "Ctrl+Z 즉시 취소", "최근 변경 이력"],
                ["배송 규칙", "1~5는 그림을 바로 배송 가능", "품질 검사 해금 후 검사품만"],
                ["폭주 보호", "동시 손님 1명, 시한 여유", "대기열 공개, 이탈 페널티 완화 튜닝"],
            ],
            [36 * mm, 68 * mm, 68 * mm],
        ),
        P("<b>6. 결과 생성과 피드백</b>", "h2"),
        P("인과성 원칙: 한 번의 변경은 초반에 하나의 명확한 변화를 만든다. 주문서 비교 하이라이트도 한 번에 한 조건씩 강조한다."),
        table(
            [
                ["생성 단계", "결과 변화", "플레이어에게 보이는 설명"],
                ["기본 장면", "주문서+제작기 기본 그림", "주문한 대상과 배경을 만들었습니다."],
                ["스타일/구도", "레이어·마스크 적용", "동화풍 적용 / 중앙 배치했습니다."],
                ["선명화", "선명도·시간 변화", "더 또렷해졌습니다. 시간 +2초."],
                ["비교 판정", "맞은/어긋난 조건 목록", "주문서와 다른 점: 모자 있음."],
                ["배송", "통과·보상·다음 손님", "완성품 납품. 다음 손님이 도착합니다."],
            ],
            [36 * mm, 55 * mm, 81 * mm],
        ),
    ]
    build(PLAN_DIR / "02_시스템.pdf", story)


def doc_03():
    story = cover("03", "콘텐츠", "한 개념씩 배우고, 이후 주문 폭주와 주문서 비교로 확장하는 구성")
    story += header_bar("1. 첫 30분 온보딩 — 한 스테이지에 한 개념")
    story += [
        table(
            [
                ["스테이지", "의뢰 / 새 장치", "학습 목표"],
                ["1. 첫 완성품", "고양이 / 기본 입력·배송 + 그림 제작기", "중간 장치만 놓고 연결하면 그림이 나온다."],
                ["2. 그림체", "동화책 고양이 / 스타일", "장치가 그림체를 바꾼다."],
                ["3. 금지", "모자 없는 고양이 / 금지 목록", "원하지 않는 요소를 막는다."],
                ["4. 구도", "중앙의 고양이 / 구도", "위치가 장치에 따라 달라진다."],
                ["5. 선명", "선명한 고양이 / 선명화", "후처리로 품질을 고친다."],
                ["6. 비교 읽기", "어긋난 주문서 하이라이트 / 품질 검사", "주문서↔결과를 읽고 장치를 고른다."],
                ["7. 손님 두 명", "대기열 2 / 시한 도입", "우선순위와 라인 재사용을 배운다."],
                ["8. 작은 폭주", "유사 주문 3건 연속", "Overcooked형 압박을 파이프라인으로 견딘다."],
            ],
            [36 * mm, 72 * mm, 64 * mm],
        ),
        P(
            "스테이지 7~8의 폭주는 MVP 확장 게이트다. 1~6에서 ‘연결·비교·개선’이 검증된 뒤에만 켠다. "
            "오버쿡드형 감정은 여기서 처음 본격 투입한다.",
            "note",
        ),
        P("<b>2. 초보자용 주문</b>", "h2"),
        table(
            [
                ["ID", "주문", "핵심 재미", "주요 해결"],
                ["O01", "첫 고양이", "중간 장치 첫 연결", "기본 입·배송 + 제작기"],
                ["O02", "동화책 고양이", "스타일 변화", "스타일 가공기"],
                ["O03", "모자 없는 고양이", "주문서 금지↔결과", "금지 목록"],
                ["O04", "중앙의 고양이", "구도 비교", "구도 설계기"],
                ["O05", "선명한 고양이", "품질 비교", "선명화"],
                ["O06", "품질 검사 완료", "비교 문장 읽기", "품질 검사기"],
                ["O07", "급한 손님 둘", "대기열·시한", "라인 재사용"],
                ["O08", "비슷한 주문 연속", "배치 생산 감각", "공용 파이프라인"],
                ["O09", "주문서 다듬기", "문구 보정 vs 결과", "주문 보정(후반)"],
                ["O10", "불량 없는 연속 납품", "안정성", "검사+자동화 체험"],
            ],
            [18 * mm, 40 * mm, 50 * mm, 64 * mm],
        ),
        PageBreak(),
        *header_bar("3. 주문서 ↔ 결과 비교 콘텐츠 규칙"),
        table(
            [
                ["규칙", "설명"],
                ["한 번에 한 어긋남", "초반 주문은 의도적으로 조건 1개만 실패하게 설계한다."],
                ["문장 먼저, 점수 나중", "‘모자가 남아 있습니다’가 ‘스타일 42점’보다 먼저 보인다."],
                ["추천은 최대 2개", "폭주 중에도 선택 마비를 막는다."],
                ["전후 비교 유지", "장치 추가 전/후 결과를 나란히 보여 변화 원인을 고정한다."],
                ["프롬프트 미러", "결과 카드 옆에 주문서 원문을 항상 표시한다. 플레이어가 ‘내가 맞춘 문구’를 의식하게 한다."],
            ],
            [40 * mm, 132 * mm],
        ),
        P("<b>4. 결과 변화는 읽기 쉬워야 한다</b>", "h2"),
        table(
            [
                ["문제 문장", "추천 장치", "비교에서 보이는 것"],
                ["요청한 숲 배경이 없습니다.", "주문서/제작기", "주문서 ‘숲’ 하이라이트 vs 결과 배경"],
                ["그림체가 주문과 다릅니다.", "스타일 가공기", "‘동화책처럼’ vs 현재 톤"],
                ["원하지 않는 모자가 있습니다.", "금지 목록", "금지 항목 vs 결과 악세서리"],
                ["손님이 떠났습니다. 납품이 느렸습니다.", "병목 장치 교체", "대기열 타이머 / 처리 시간"],
            ],
            [58 * mm, 40 * mm, 74 * mm],
        ),
        P("<b>5. 에셋 기준</b>", "h2"),
        P("MVP는 CSS/도형 합성으로도 ‘조건이 맞음/틀림’이 한눈에 보여야 한다. 고양이·모자·중앙 위치·흐림·동화풍 색감 등 비교 가능한 레이어를 우선한다."),
    ]
    build(PLAN_DIR / "03_콘텐츠.pdf", story)


def doc_04():
    story = cover("04", "UI", "대기열·주문서 비교·문제 해결에 필요한 정보만 먼저 보여 주는 화면")
    story += header_bar("1. 메인 공장 화면 — 중반 기준")
    story += [
        P(
            "초반: 좌측 장치, 중앙 설계, 하단 주문서↔결과 비교만 연다. "
            "중반: 상단 손님 대기열·남은 시간을 추가한다. 우측 상세/자원 HUD는 해금 시에만."
        ),
        table(
            [
                ["영역", "초반", "중반(폭주 도입)", "후반"],
                ["상단", "크레딧, 현재 주문", "대기열 슬롯, 남은 시간, 만족도", "전력·연산·유지비"],
                ["좌측", "중간 장치만 1~3", "해금된 중간 장치", "검색·카테고리·전문가"],
                ["중앙", "추천 연결", "자유 배치·공용 라인", "분기·병목 시각화"],
                ["우측", "장치 한 줄 설명", "설정·효과", "기본/전문가 전환"],
                ["하단", "결과 미리보기", "주문서|결과 비교, 문제, 추천", "세부 평가·이력"],
            ],
            [24 * mm, 42 * mm, 52 * mm, 54 * mm],
        ),
        P("<b>화면 카피 예시 (중반)</b>", "h2"),
        P(
            "AI FACTORY | 대기열 2 · 급한 손님: 동화책 고양이 0:28<br/>"
            "주문서: “동화책에 넣을 고양이, 모자 없이”  |  결과: 동화풍 O / 모자 X → 금지 목록 추천",
            "note",
        ),
        P("<b>2. 주문서 ↔ 결과 비교 패널</b>", "h2"),
        table(
            [
                ["구성", "표시 규칙"],
                ["왼쪽: 주문서", "손님 요청 원문. 평가된 키워드를 칩으로 표시."],
                ["오른쪽: 결과", "미리보기 + 적용된 장치 태그."],
                ["중앙: 대조", "맞음(초록) / 어긋남(강조). 한 줄 원인."],
                ["하단: 행동", "추천 장치 최대 2, [다시 생산], [납품]."],
                ["폭주 시", "비교 패널은 유지하되 요약 모드(아이콘+한 줄)로 압축."],
            ],
            [40 * mm, 132 * mm],
        ),
        PageBreak(),
        *header_bar("3. 연결 보조와 오류 방지"),
        table(
            [
                ["기능", "상세", "수용 기준"],
                ["연결 강조", "호환 포트만 형태·색으로 강조", "색 없이도 형태만으로 구분"],
                ["잘못된 연결 방지", "초반 비호환 드롭 불가", "오류 후 수정이 아니라 가능한 다음 행동"],
                ["자동 연결", "추천 슬롯 근처 제안", "O01을 3회 이내 조작으로 연결"],
                ["되돌리기", "Ctrl+Z + 버튼", "최근 10개"],
                ["대기열 강조", "가장 급한 손님 펄스", "폭주 중에도 누구부터인지 3초 내 파악"],
            ],
            [36 * mm, 68 * mm, 68 * mm],
        ),
        P("<b>4. 피드백 문구</b>", "h2"),
        table(
            [
                ["시점", "보이는 평가", "문제 문장", "추천"],
                ["초반", "주문과 맞음 / 보기 좋음", "주문서의 ○○이 결과에 없습니다.", "주문서/제작기"],
                ["중반 초입", "대상·스타일·구도·선명", "주문서와 다른 점: …", "해당 가공 장치"],
                ["폭주", "남은 시간·대기", "손님이 떠날 것 같습니다.", "병목/빠른 제작"],
                ["후반", "세부 6항목", "같은 대상이 두 번…", "검사/재처리"],
            ],
            [28 * mm, 42 * mm, 58 * mm, 44 * mm],
        ),
        P(
            "<b>UI 완료 판정</b><br/>"
            "AI 용어를 몰라도, 대기열·주문서 원문·결과 미리보기·문제 문장만으로 다음 장치 또는 다음 손님을 고를 수 있어야 한다.",
            "note",
        ),
    ]
    build(PLAN_DIR / "04_UI.pdf", story)


def doc_05():
    story = cover("05", "개발", "주문 폭주·비교 UX를 포함한 MVP 범위, 일정, 플레이 테스트")
    story += header_bar("1. 수정된 MVP 범위와 기술 기준")
    story += [
        table(
            [
                ["영역", "MVP 결정", "후반/보류"],
                ["플랫폼", "PC 브라우저. Phaser 3 + TypeScript + Vite (정적 GitHub Pages).", "네이티브/모바일 세로 우선"],
                ["장르 구현", "파이프라인 팩토리 + 완화형 주문 대기열/시한", "오버쿡드형 캐릭터 액션"],
                ["비교 UX", "주문서↔결과 나란히, 조건 하이라이트, 추천 2", "실모델/실프롬프트 채점"],
                ["자원", "크레딧, 처리 시간, (중반) 단순 대기열", "VRAM·유지비·연구 트리"],
                ["장치", "입력·배송 기본 고정 + 중간 6종 구성", "분배/재처리 본격화"],
                ["결과", "결정적 시뮬레이션 + CSS/도형 미리보기", "실제 생성 API"],
            ],
            [28 * mm, 84 * mm, 60 * mm],
        ),
        P("<b>2. 구현 책임</b>", "h2"),
        table(
            [
                ["컴포넌트", "책임", "필수 이벤트"],
                ["OrderQueue", "손님 유입, 대기열, 시한, 이탈", "CustomerArrived, OrderExpired"],
                ["TutorialFlow", "장치/UI/대기열 잠금·해금", "StageStarted, InfoRevealed"],
                ["FactoryGraph", "배치·포트·Undo", "GraphChanged"],
                ["PipelineExecutor", "검증·실행", "GenerationCompleted"],
                ["PromptResultComparer", "주문서 조건 vs 결과 태그 대조", "CompareReady"],
                ["FeedbackService", "문제 문장·추천·전후 요약", "FeedbackReady"],
                ["SaveService", "진행·대기열 스냅샷", "SaveLoaded"],
            ],
            [42 * mm, 70 * mm, 60 * mm],
        ),
        PageBreak(),
        *header_bar("3. 데이터 변경"),
        table(
            [
                ["데이터", "추가/수정 필드", "목적"],
                ["OrderData", "queueWeight, timeLimit, compareKeys[], rushGroup", "폭주·비교 키워드"],
                ["CompareResult", "matchedKeys, mismatchedKeys, plainDiffs", "주문서↔결과 UI"],
                ["CustomerState", "patience, positionInQueue", "대기열 HUD"],
                ["DeviceData", "기존 초보자 카드 필드 유지", "용어 일관성"],
                ["SaveGame", "tutorialStage, queueSnapshot", "복구"],
            ],
            [36 * mm, 72 * mm, 64 * mm],
        ),
        P("<b>4. 일정 (현 프로토타입 이후)</b>", "h2"),
        table(
            [
                ["주차", "목표", "완료 게이트"],
                ["현재", "O01~O06 파이프라인 MVP 구현됨", "typecheck/test/build, Pages 배포"],
                ["+1", "주문서↔결과 비교 패널 강화", "어긋난 조건 1개를 문장으로 설명"],
                ["+2", "손님 대기열 1→2, 완화 타이머", "O07에서 우선순위 이해"],
                ["+3", "유사 주문 연속(O08), 라인 재사용 유도", "폭주 감정을 파이프라인으로 해결"],
                ["+4", "초보자 테스트·카피 수정·데모", "첫 10분 O01 + 비교로 O02/O03 개선"],
            ],
            [22 * mm, 78 * mm, 72 * mm],
        ),
        P("<b>5. 플레이 테스트 추가 항목</b>", "h2"),
        table(
            [
                ["확인", "성공 신호"],
                ["주문서와 결과를 비교하는가?", "화면을 보며 ‘여기는 맞는데 모자가…’처럼 말한다."],
                ["폭주가 불쾌하지 않은가?", "대기열 2에서도 무엇을 해야 할지 말한다. 패닉만 하지 않는다."],
                ["오버쿡드로 오해하지 않는가?", "캐릭터를 찾지 않고 장치 연결로 해결하려 한다."],
                ["AI 용어 없이 진행하는가?", "Prompt/CFG를 묻지 않아도 O01~O03 완료."],
            ],
            [70 * mm, 102 * mm],
        ),
        P(
            "<b>개발 완료 판정 (개정)</b><br/>"
            "신규 플레이어가 첫 10분에 O01을 완료하고, 주문서↔결과 비교로 장치를 추가해 개선하며, "
            "중반 데모에서 ‘손님이 더 와도 라인으로 대응한다’는 감각을 말해야 한다.",
            "note",
        ),
    ]
    build(PLAN_DIR / "05_개발.pdf", story)


if __name__ == "__main__":
    print("PLAN_DIR", PLAN_DIR)
    doc_01()
    doc_02()
    doc_03()
    doc_04()
    doc_05()
    print("done")
