# AI Factory

라운드마다 손님이 찾아오고, 모듈 칩으로 이미지를 만들어 전달하는 오버쿡드형 공장 퍼즐입니다. 생산할 때마다 VRAM이 소모되며, 라운드가 끝나면 효율 점수로 등급이 매겨집니다. 실제 생성형 AI API 없이 브라우저에서 실행됩니다.

## 문서

- 게임 소개 및 설명 (개요·플레이·실행): [`문서/AI_Factory_게임소개_및_설명.pdf`](문서/AI_Factory_게임소개_및_설명.pdf)
- 상세 기획서: [`기획서/`](기획서/) (`01_개요` ~ `05_개발`)

## 플레이 링크

GitHub Pages: `https://yjhpine.github.io/`

## 조작 방법

- `WASD` / 방향키: 이동
- `Z`: 상호작용 (손님·입력기·슬롯·생산·출구). 주변에 대상이 없으면 들고 있는 주문서/모듈/이미지를 바닥에 내려놓음. 바닥 물건 근처에서 다시 집기. 모듈 칩을 든 채 찬 슬롯에 Z면 스왑
- `C`: 대시
- `X`: 들고 있는 프롬프트/이미지 확인
- 생산 시 슬롯에 꽂힌 칩만큼 VRAM 소모 (예산 초과 시 생산 속도 저하 + 점수 감소)
- 새 게임은 튜토리얼 라운드(r00)부터 시작하며, 안내 순서대로 한 손님을 실패 없이 완주합니다.

## 라운드 점수

- 납품 성공률, VRAM 효율(이론 최소 대비), 이탈 방어, 예산 준수
- 등급 S~D에 따라 크레딧 보너스

## 결과 프리뷰

- 칩 조합에 따라 `public/assets/art/previews/`의 **16장 사진 팩**을 고릅니다.
- 파일명: `cat-{plain|fairytale}-{hat|no-hat}-{offset|center}-{soft|sharp}.png`
- QC 도장·품질(lo/mid/hi)은 CSS 오버레이. 이미지 없으면 기존 절차적 프리뷰로 폴백합니다.
- 플레이스홀더 재생성: `python3 scripts/generate-preview-placeholders.py`


## 로컬 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm run typecheck
npm run test
npm run build
```

## 기술 스택

Phaser 3 · TypeScript · Vite · Vitest · GitHub Pages
