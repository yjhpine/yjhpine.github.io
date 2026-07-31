# AI Factory

라운드마다 손님이 찾아오고, 모듈 칩으로 이미지를 만들어 전달하는 오버쿡드형 공장 퍼즐입니다. 생산할 때마다 VRAM이 소모되며, 라운드가 끝나면 효율 점수로 등급이 매겨집니다. 실제 생성형 AI API 없이 브라우저에서 실행됩니다.

## 플레이 링크

GitHub Pages: `https://yjhpine.github.io/`

## 조작 방법

- `WASD` / 방향키: 이동
- `Z`: 상호작용 (손님·입력기·슬롯·생산·출구)
- `C`: 대시
- `X`: 들고 있는 프롬프트/이미지 확인
- 생산 시 슬롯에 꽂힌 칩만큼 VRAM 소모 (예산 초과 시 생산 속도 저하 + 점수 감소)

## 라운드 점수

- 납품 성공률, VRAM 효율(이론 최소 대비), 이탈 방어, 예산 준수
- 등급 S~D에 따라 크레딧 보너스

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
