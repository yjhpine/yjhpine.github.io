export interface RoundDefinition {
  id: string;
  title: string;
  tutorial: string;
  targetCustomers: number;
  vramBudget: number;
  availableModuleIds: string[];
  /** Order templates that can be assigned to customers this round. */
  customerOrderPool: string[];
  baseReward: number;
}

export const rounds: RoundDefinition[] = [
  {
    id: "r01",
    title: "라운드 1 · 첫 손님들",
    tutorial: "손님 3명을 응대하세요. 생산할 때마다 VRAM이 닳습니다. 필요한 칩만 쓰세요.",
    targetCustomers: 3,
    vramBudget: 24,
    availableModuleIds: ["image-maker"],
    customerOrderPool: ["o01"],
    baseReward: 100,
  },
  {
    id: "r02",
    title: "라운드 2 · 동화풍 주문",
    tutorial: "스타일 칩이 해금되었습니다. 동화풍 손님에게만 쓰고 VRAM을 아끼세요.",
    targetCustomers: 4,
    vramBudget: 32,
    availableModuleIds: ["image-maker", "style-processor"],
    customerOrderPool: ["o01", "o02"],
    baseReward: 120,
  },
  {
    id: "r03",
    title: "라운드 3 · 금지 조건",
    tutorial: "금지 목록 칩으로 모자 없는 주문을 처리하세요. 불필요한 칩은 VRAM 낭비입니다.",
    targetCustomers: 4,
    vramBudget: 36,
    availableModuleIds: ["image-maker", "style-processor", "ban-list"],
    customerOrderPool: ["o01", "o02", "o03"],
    baseReward: 140,
  },
  {
    id: "r04",
    title: "라운드 4 · 구도 주문",
    tutorial: "구도 칩이 추가되었습니다. 손님 조건에 맞는 최소 파이프라인을 만드세요.",
    targetCustomers: 5,
    vramBudget: 40,
    availableModuleIds: ["image-maker", "style-processor", "ban-list", "composition-planner"],
    customerOrderPool: ["o01", "o02", "o03", "o04"],
    baseReward: 160,
  },
  {
    id: "r05",
    title: "라운드 5 · 선명화",
    tutorial: "선명화 칩을 해금했습니다. 예산 초과 시 생산이 느려지고 점수가 깎입니다.",
    targetCustomers: 5,
    vramBudget: 44,
    availableModuleIds: ["image-maker", "style-processor", "ban-list", "composition-planner", "sharpener"],
    customerOrderPool: ["o01", "o02", "o03", "o04", "o05"],
    baseReward: 180,
  },
  {
    id: "r06",
    title: "라운드 6 · 품질 검사",
    tutorial: "최종 라운드입니다. 검사 칩까지 쓰되, 최적 조합으로 높은 등급을 노리세요.",
    targetCustomers: 6,
    vramBudget: 48,
    availableModuleIds: ["image-maker", "style-processor", "ban-list", "composition-planner", "sharpener", "quality-checker"],
    customerOrderPool: ["o01", "o02", "o03", "o04", "o05", "o06"],
    baseReward: 200,
  },
];

export const roundsById = new Map(rounds.map((round) => [round.id, round]));
