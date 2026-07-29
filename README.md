# AI Factory

주문서를 읽고 장치를 연결해 더 좋은 그림을 납품하는, 생성형 이미지 공정을 재해석한 2D 공장 자동화 퍼즐입니다. 실제 생성형 AI 모델이나 외부 API 없이 브라우저에서 실행됩니다.

## 플레이 링크

GitHub Pages: `https://yjhpine.github.io/`

배포 전에는 GitHub 저장소 Settings → Pages에서 **Source: GitHub Actions**를 한 번 선택해야 합니다. main 브랜치에 push하면 배포 워크플로가 실행됩니다.

## 조작 방법

- 왼쪽 장치 카드를 클릭해 공장 중앙에 배치합니다.
- 장치를 드래그해 이동하고, 출력 포트에서 입력 포트까지 드래그해 연결합니다.
- 마우스 휠로 확대/축소하고, 빈 공간 또는 가운데 버튼으로 화면을 이동합니다.
- `Delete`로 선택 장치를 삭제하고, `Ctrl+Z`로 최근 배치 또는 연결을 되돌립니다.
- 생산 후 결과와 문제 메시지를 보고 장치를 추가·교체한 뒤 납품합니다.

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

배포용 정적 파일은 `dist/`에 생성됩니다. Vite는 일반 프로젝트 Pages 하위 경로와 `yjhpine.github.io` 사용자 Pages 루트 경로를 모두 처리합니다.

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
├─ core/       # 그래프 검증, 파이프라인, 결과 계산, 저장, 진행도
├─ data/       # 장치와 의뢰의 데이터 정의
├─ game/       # Phaser 공장 화면과 포트/연결 표현
└─ ui/         # HTML 결과 패널과 메뉴 제어
```

## 현재 구현 기능

- [x] 8종 데이터 기반 장치와 포트 타입
- [x] 장치 배치, 이동, 삭제, 포트 연결, 취소, Undo
- [x] 순환·비호환·중복 입력 연결 방지
- [x] 결정적 결과 시뮬레이션과 결과 카드 비교
- [x] O01~O06 튜토리얼 의뢰, 실패 원인, 추천 장치, 납품 보상
- [x] localStorage 진행 저장 및 안전한 기본값 복구
- [x] TypeScript/Vitest/GitHub Pages 워크플로

## 제한 사항

- 실제 생성형 AI, ComfyUI, Stable Diffusion, Flux 및 외부 이미지 API는 연결하지 않습니다.
- 결과물은 CSS 도형과 데이터 기반 상태를 합성한 MVP 미리보기입니다.
- 대량 생산, 분배·재처리 자동화, 전력/VRAM 경제, 모바일 세로 UI는 MVP 범위 밖입니다.

## 라이선스 및 에셋

코드는 별도 고지 전까지 저장소 소유자 정책을 따릅니다. 외부 이미지·폰트·아이콘 에셋은 사용하지 않았으며, 모든 장치·결과 시각 요소는 CSS와 Phaser Graphics로 구성합니다.
