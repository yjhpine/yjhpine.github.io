# AI Factory

손님이 가져온 프롬프트(주문서)를 집어 공장 라인에 넣고, 모듈 칩을 꽂아 이미지를 만든 뒤 다시 손님에게 전달하는 오버쿡드형 2D 공장 퍼즐입니다. 실제 생성형 AI 모델이나 외부 API 없이 브라우저에서 실행됩니다.

## 플레이 링크

GitHub Pages: `https://yjhpine.github.io/`

배포 전에는 GitHub 저장소 Settings → Pages에서 **Source: GitHub Actions**를 한 번 선택해야 합니다. main 브랜치에 push하면 배포 워크플로가 실행됩니다.

## 조작 방법

- `WASD` / 방향키로 캐릭터를 이동합니다.
- `E` 또는 `Space`로 근처 대상과 상호작용합니다.
- 손님에게서 주문서를 집고 `Tab`으로 프롬프트를 확인합니다.
- 아래 선반에서 모듈 칩을 집어 슬롯에 꽂습니다.
- 생산 후 출구에서 이미지를 집고 `Tab`으로 결과를 확인한 뒤 손님에게 전달합니다.

## 로컬 실행

Node.js 22 LTS가 필요합니다.

```bash
git clone https://github.com/yjhpine/yjhpine.github.io.git
cd yjhpine.github.io
npm install
npm run dev
```

개발 서버가 표시한 주소를 Chrome 또는 Edge에서 엽니다.

## 검증 및 빌드

```bash
npm run typecheck
npm run test
npm run build
```

배포용 정적 파일은 `dist/`에 생성됩니다.

## 기술 스택

- Phaser 3
- TypeScript
- Vite
- HTML/CSS
- Vitest
- GitHub Actions / GitHub Pages

## 프로젝트 구조

```text
src/
├─ core/       # 주방 세션, 결과 시뮬레이션, 저장, 진행도
├─ data/       # 장치(칩)와 의뢰의 데이터 정의
├─ game/       # Phaser 주방 장면(이동·상호작용)
└─ ui/         # HTML HUD와 메뉴
```

## 현재 구현 기능

- [x] 오버쿡드형 운반 루프 (손님 → 입력 → 칩 슬롯 → 생산 → 출구 → 손님)
- [x] WASD 이동 + E/Space 상호작용
- [x] 모듈 칩 선반·슬롯 3칸
- [x] O01~O06 튜토리얼 의뢰와 해금
- [x] 손님 인내심(최대 2명)과 납품 평가
- [x] 주문서 ↔ 결과 비교 패널
- [x] localStorage 진행 저장
- [x] TypeScript/Vitest/GitHub Pages 워크플로

## 제한 사항

- 실제 생성형 AI 및 외부 이미지 API는 연결하지 않습니다.
- 결과물은 CSS 도형과 데이터 기반 상태를 합성한 MVP 미리보기입니다.
- 대량 폭주, 전력/VRAM 경제, 모바일 세로 UI는 MVP 범위 밖입니다.

## 라이선스 및 에셋

코드는 별도 고지 전까지 저장소 소유자 정책을 따릅니다. 외부 이미지·폰트·아이콘 에셋은 사용하지 않았으며, 시각 요소는 CSS와 Phaser Graphics로 구성합니다.
