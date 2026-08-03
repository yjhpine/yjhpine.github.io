# Progress

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
