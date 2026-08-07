# Progress

## 2026-08-07

- Aseprite MCP(`@iborymagic/aseprite-mcp`) + LibreSprite CLI로 스테이션/칩 .ase 아카이브·메타데이터 생성.
- 손님 2프레임 idle, 생산 spark 4프레임, 카운터 벨 링 시트를 Phaser에 연결.
- Cute Pixel Art Toy Factory 그래픽 패스: `public/assets/art/**` 신규 에셋, KitchenScene/UI 적용.
- 사진형 Box_Floor·구 factory placeholder 제거. 플레이어 Cat_*는 미수정.
- 모듈 iconKey를 PNG 경로로 교체, DOM HUD를 골판지/스티커 톤으로 스킨.

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
