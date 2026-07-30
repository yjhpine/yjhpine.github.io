import type { OrderDefinition } from "../core/types";

/** availableModuleIds lists only middle modules; order-input and delivery-bay are always present. */
export const orders: OrderDefinition[] = [
  { id: "o01", title: "첫 번째 고양이 그림", request: "고양이 그림을 만들어 주세요.", tutorial: "입력기와 배송대는 이미 배치되어 있습니다. 그림 제작기를 가운데에 두고 연결해 보세요.", availableModuleIds: ["image-maker"], reward: 100, minimumScores: { subjectAccuracy: 60 }, maximumProcessingTime: 12, requiredTags: ["generator"], baseScores: { subjectAccuracy: 80, styleMatch: 30, composition: 30, sharpness: 35 } },
  { id: "o02", title: "동화책 고양이", request: "동화책에 사용할 고양이 그림을 만들어 주세요.", tutorial: "스타일 가공기를 그림 제작기 뒤에 추가해 그림체를 바꾸세요.", availableModuleIds: ["image-maker", "style-processor"], reward: 120, minimumScores: { subjectAccuracy: 60, styleMatch: 70 }, maximumProcessingTime: 14, requiredTags: ["generator", "style-fairytale"], baseScores: { subjectAccuracy: 80, styleMatch: 30, composition: 30, sharpness: 35 } },
  { id: "o03", title: "모자 없는 고양이", request: "모자를 쓰지 않은 고양이를 만들어 주세요.", tutorial: "금지 목록 입력기로 원하지 않는 모자를 막아 보세요.", availableModuleIds: ["image-maker", "ban-list"], reward: 120, minimumScores: { subjectAccuracy: 60 }, maximumProcessingTime: 14, requiredTags: ["generator", "no-hat"], baseScores: { subjectAccuracy: 80, styleMatch: 35, composition: 30, sharpness: 35 } },
  { id: "o04", title: "중앙의 고양이", request: "고양이를 화면 중앙에 배치해 주세요.", tutorial: "구도 설계기를 연결해 주인공의 위치를 조정하세요.", availableModuleIds: ["image-maker", "composition-planner"], reward: 140, minimumScores: { subjectAccuracy: 60, composition: 70 }, maximumProcessingTime: 14, requiredTags: ["generator", "centered-composition"], baseScores: { subjectAccuracy: 80, styleMatch: 35, composition: 25, sharpness: 35 } },
  { id: "o05", title: "선명한 고양이", request: "더 선명한 고양이 이미지를 만들어 주세요.", tutorial: "선명화 장치를 제작기 뒤에 연결해 흐림을 해결하세요.", availableModuleIds: ["image-maker", "sharpener"], reward: 140, minimumScores: { subjectAccuracy: 60, sharpness: 75 }, maximumProcessingTime: 14, requiredTags: ["generator", "sharpness"], baseScores: { subjectAccuracy: 80, styleMatch: 35, composition: 30, sharpness: 30 } },
  { id: "o06", title: "품질 검사 완료", request: "검사까지 마친 고양이 완성품을 납품해 주세요.", tutorial: "품질 검사기를 거쳐 검사품 포트로 배송대에 연결하세요.", availableModuleIds: ["image-maker", "quality-checker"], reward: 160, minimumScores: { subjectAccuracy: 60 }, maximumProcessingTime: 14, requiredTags: ["generator", "quality-inspection"], baseScores: { subjectAccuracy: 80, styleMatch: 35, composition: 30, sharpness: 35 } },
];

export const ordersById = new Map(orders.map((order) => [order.id, order]));
