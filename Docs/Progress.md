# Progress

## 2026-08-08

- 취약점 하드닝: 선반∩라운드 칩, 해금 타이밍(prep), 모달 입력 차단, 납품 크레딧 API 정리, 세이브 클램프, 죽은 필드/API 제거, 회귀 테스트.
- 기획서 01~05·크레딧 업그레이드 PDF·소개 PDF를 구현(960×580, 준비 타임 상점, 납품 보상표 등)에 맞게 재생성.
- 맵 높이 720→**580**. 생산 라인을 하단(구 선반 위치)으로, 모듈 칩 선반은 왼쪽 세로 정렬로 재배치.
- 업그레이드 라운드 해금 게이트 제거(처음부터 전부 구매 가능). 휴대 아이템을 플레이어 스프라이트 위에 항상 표시.
- 업그레이드 구매를 라운드 시작 전 **준비 타임**으로 이동. 인게임 터미널 제거. 정산→준비→시작 / 이어하기→준비.
- 크레딧·공장 업그레이드 7종 구현: 납품 보상표(+100/+50/+20/0), 준비 타임 상점, 세이브 유지·새 게임 초기화, 성장형 배율·기능형(퀵 선반/분석기/주문 분석기).
- ChatGPT 4×4 고양이 시트를 `public/assets/art/previews/cat-*.png` 16장으로 분할·매핑 교체.

## 2026-08-07

- 결과 프리뷰 16장 사진 팩 파이프라인: `public/assets/art/previews/`, assetKey 매핑, QC/품질 오버레이, 이미지 없을 때 절차적 폴백.
- 주방 맵 가로 확장: 720×720 → **960×720** (스테이션·선반·손님 배치 재정렬).
- 게임 소개 및 설명 PDF 추가 (`문서/AI_Factory_게임소개_및_설명.pdf`, 개요·플레이·실행).
- 기획서 01~05를 구현된 Overcooked형 게임 기준으로 전면 개정 (`generate_plans.py` 재생성).
- 실습형 튜토리얼 라운드 r00 추가 (단계 잠금, 인내심 스킵, 클리어 후 r01).
- UX 시각적 피드백 패스 내용을 Cozy 리파인에 통합 병합 (별도 UX 브랜치 작업일지/생성 스크립트 유지).
- Cozy Pixel Art 전면 리파인: `generate-cozy-factory-art.py`로 스테이션/아이템/칩/손님/바닥점선/UX 크롬 재제작. ghost 투입·produce progress/COMPLETE·HUD carry 아이콘 연결. Cat_*·세션 로직·라이프/1-5 튜토리얼 UI는 미추가.
- Aseprite MCP(`@iborymagic/aseprite-mcp`) + LibreSprite CLI로 스테이션/칩 .ase 아카이브·메타데이터 생성.
- 손님 2프레임 idle, 생산 spark 4프레임, 카운터 벨 링 시트를 Phaser에 연결.
- Cute Pixel Art Toy Factory 그래픽 패스: `public/assets/art/**` 신규 에셋, KitchenScene/UI 적용.
- 사진형 Box_Floor·구 factory placeholder 제거. 플레이어 Cat_*는 미수정.
- 모듈 iconKey를 PNG 경로로 교체, DOM HUD를 골판지/스티커 톤으로 스킨.
- 떠난 손님 관련 주문서/이미지 정리, 선반 칩 타입당 1개/라운드.
- 모듈 해금 중앙 모달, 빈곳 Z 에러 제거, 바닥 장식 오브젝트 제거.

## 2026-08-06

- 게임 화면을 720×720(1:1)로 맞추고 `Box_Floor`를 상자 내부만 남기도록 크롭해 검정 여백이 보이지 않게 했다.
- 게임 바닥을 `Box_Floor.png`(열린 골판지 상자)로 교체하고 `floor-tile` / `wall-boxes` 에셋을 삭제했다.
- 공장 배경·손님·모듈 픽셀 스프라이트를 추가하고 KitchenScene에 적용했다.
- 콘셉트: 골판지 상자 안에서 일하는 고양이. 플레이어 Cat_* 스프라이트는 수정하지 않고 팔레트만 참고.
- `public/assets/factory/*.png` + `scripts/generate-factory-sprites.py`.

## 2026-08-05

- 플레이어를 PlayerAnim 고양이 스프라이트(idle/walk + 운반)로 교체했다.

## 2026-08-04

- 각 라운드 VRAM 예산을 최적 파이프라인 ideal 이상으로 재조정했다 (R2~R6).
- 프롬프트 우회·다양화와 슬롯 칩 스왑을 반영했다.

## 2026-08-03

- 모듈 해금 시 우측 하단 튜토리얼 위젯(“이건 ~~한 모듈입니다”)을 추가했다. `introducedModuleIds`로 반복 표시를 막는다.
- 실모델 연동 대신 절차적 CSS 프리뷰를 강화했다.
- `previewModel` + `renderPreview`: 태그/품질 밴드 반영, 효과 목록·점수 표시, 씬 모션 추가.
- typecheck / test(16) / build 통과.

## 2026-07-31

- 라운드·VRAM·효율 점수(1B+2B)를 구현했다.
- 추가: `rounds.ts`, `RoundScoreService`, HUD VRAM/손님 수, 라운드 정산 모달, save v2.
- KitchenSession이 목표 손님 쿼터·생산 시 VRAM 소모·초과 슬로우다운을 처리한다.
- typecheck / test(12) / build 통과.

## 2026-07-30

- 공장 그래프 배치 게임을 **Overcooked형 운반 루프(1A) + 모듈 칩 슬롯(2B)** 으로 전면 개편했다.
- 추가: `KitchenSession`, `KitchenScene`, 운반 HUD.
- 제거: `FactoryGraph` / `ConnectionValidator` / `PipelineExecutor` / `FactoryScene` / `GameSession` / `defaults`.
- `npm run typecheck` / Vitest 13개 / `npm run build` 통과.

## 2026-07-29

- Phaser 3, TypeScript, Vite, Vitest 기반의 첫 MVP(그래프형)를 구성했다.
