# Decisions

## 2026-07-29

- Unity 대신 Phaser 3 + TypeScript + Vite를 사용한다. 최신 웹 구현 지시가 브라우저 정적 배포와 무료 개발 환경을 고정했기 때문이다.
- 실제 생성형 AI 대신 데이터 기반의 결정적 결과 시뮬레이션을 사용한다. 서버, 모델, API 키 없이 오프라인 기본 플레이를 보장한다.
- Phaser는 공장 배치·포트·연결·카메라·생산 연출만 담당하고, 메뉴와 결과 패널은 HTML/CSS가 담당한다.
- 생산 라인은 방향성과 포트 타입을 가진 DAG로 저장한다. UI가 아닌 순수 TypeScript `FactoryGraph`와 `PipelineExecutor`가 검증·실행한다.
- 진행도는 버전이 있는 localStorage JSON으로 저장하고, 손상 또는 버전 불일치는 기본 상태로 복구한다.
- GitHub Pages는 main push 시 GitHub Actions가 `dist/`를 배포하는 방식으로 구성한다.
- MVP는 O01~O06과 장치 8종까지이며, 전력/VRAM 경제, 대량 생산, 자동화 분기, 실제 AI, 서버 기능은 보류한다.
