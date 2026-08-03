import type { ModuleDefinition, PortDataType } from "../core/types";

const input = (id: string, label: string, dataType: PortDataType, required = true) => ({ id, label, direction: "input" as const, dataType, required });
const output = (id: string, label: string, dataType: PortDataType) => ({ id, label, direction: "output" as const, dataType });

export const moduleDefinitions: ModuleDefinition[] = [
  {
    id: "order-input", displayName: "주문서 입력기", description: "고객의 그림 조건을 생산 라인에 전달합니다.",
    unlockTutorial: "이건 손님 주문서를 생산 라인에 넣는 시작 스테이션입니다.",
    category: "시작", price: 0, processingTime: 0, vramCost: 0, iconKey: "📜", portHint: "문서 카드",
    inputPorts: [], outputPorts: [output("order-out", "주문서", "order")], effects: [],
  },
  {
    id: "image-maker", displayName: "그림 제작기", description: "주문서를 기본 그림 초안으로 바꿉니다. VRAM 8",
    unlockTutorial: "이건 주문서를 기본 그림 초안으로 바꾸는 필수 생산 모듈입니다.",
    category: "생산", price: 0, processingTime: 4, vramCost: 8, iconKey: "🎨", portHint: "그림 액자",
    inputPorts: [input("order-in", "주문서", "order")], outputPorts: [output("image-out", "그림", "image")], effects: [{ tag: "generator" }],
  },
  {
    id: "style-processor", displayName: "스타일 가공기", description: "그림체와 색감 표현을 동화풍으로 바꿉니다. VRAM 6",
    unlockTutorial: "이건 그림체와 색감을 동화풍으로 바꿔 주는 스타일 모듈입니다.",
    category: "가공", price: 50, processingTime: 2, vramCost: 6, iconKey: "🎭", portHint: "페인트 캡슐",
    inputPorts: [input("image-in", "그림", "image")], outputPorts: [output("image-out", "그림", "image")], effects: [{ tag: "style-fairytale", scores: { styleMatch: 42 } }],
  },
  {
    id: "ban-list", displayName: "금지 목록 입력기", description: "원하지 않는 요소를 결과에서 막습니다. VRAM 4",
    unlockTutorial: "이건 모자처럼 원하지 않는 요소를 결과에서 막는 금지 모듈입니다.",
    category: "가공", price: 50, processingTime: 1, vramCost: 4, iconKey: "🚫", portHint: "금지 표지",
    inputPorts: [input("image-in", "그림", "image")], outputPorts: [output("image-out", "그림", "image")], effects: [{ tag: "no-hat" }],
  },
  {
    id: "composition-planner", displayName: "구도 설계기", description: "주인공의 위치와 프레임을 맞춥니다. VRAM 5",
    unlockTutorial: "이건 주인공을 화면 중앙에 맞춰 주는 구도 모듈입니다.",
    category: "가공", price: 75, processingTime: 2, vramCost: 5, iconKey: "⌗", portHint: "청사진",
    inputPorts: [input("image-in", "그림", "image")], outputPorts: [output("image-out", "그림", "image")], effects: [{ tag: "centered-composition", scores: { composition: 45 } }],
  },
  {
    id: "sharpener", displayName: "선명화 장치", description: "흐릿한 결과를 더 또렷하게 다듬습니다. VRAM 6",
    unlockTutorial: "이건 흐릿한 그림을 또렷하게 다듬는 선명화 모듈입니다.",
    category: "후처리", price: 75, processingTime: 3, vramCost: 6, iconKey: "✦", portHint: "반짝이는 액자",
    inputPorts: [input("image-in", "그림", "image")], outputPorts: [output("image-out", "그림", "image")], effects: [{ tag: "sharpness", scores: { sharpness: 48 } }],
  },
  {
    id: "quality-checker", displayName: "품질 검사기", description: "문제 원인을 찾아 더 자세한 해결책을 알려 줍니다. VRAM 5",
    unlockTutorial: "이건 완성품에 품질 검사 도장을 찍는 검사 모듈입니다.",
    category: "검사", price: 100, processingTime: 1, vramCost: 5, iconKey: "🔎", portHint: "검사 증표",
    inputPorts: [input("image-in", "그림", "image")], outputPorts: [output("evaluated-out", "검사품", "evaluatedImage")], effects: [{ tag: "quality-inspection" }],
  },
  {
    id: "delivery-bay", displayName: "배송대", description: "통과한 완성품을 납품하고 보상을 받습니다.",
    unlockTutorial: "이건 완성 이미지를 손님에게 넘기는 배송 스테이션입니다.",
    category: "종료", price: 0, processingTime: 0, vramCost: 0, iconKey: "📦", portHint: "포장 상자",
    inputPorts: [input("image-in", "그림", "image", false), input("evaluated-in", "검사품", "evaluatedImage", false)], outputPorts: [output("product-out", "완성품", "finalProduct")], effects: [],
  },
];

export const modulesById = new Map(moduleDefinitions.map((definition) => [definition.id, definition]));
