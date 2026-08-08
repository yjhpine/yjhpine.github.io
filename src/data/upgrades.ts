export type UpgradeId =
  | "work-shoes"
  | "work-gloves"
  | "coffee-machine"
  | "producer"
  | "chip-shelf"
  | "analyzer"
  | "order-analyzer";

export interface UpgradeLevelDef {
  price: number;
  /** Relative effect magnitude used by runtime (e.g. 0.05 = +5%). */
  effect: number;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  displayName: string;
  description: string;
  /** Max purchasable level. Functional upgrades are 1. */
  maxLevel: number;
  levels: UpgradeLevelDef[];
}

export const upgrades: UpgradeDefinition[] = [
  {
    id: "work-shoes",
    displayName: "작업화",
    description: "이동 속도를 올려 운반 시간을 줄입니다.",
    maxLevel: 3,
    levels: [
      { price: 100, effect: 0.05 },
      { price: 250, effect: 0.1 },
      { price: 500, effect: 0.15 },
    ],
  },
  {
    id: "work-gloves",
    displayName: "작업 장갑",
    description: "집기·꽂기 상호작용 딜레이를 줄입니다.",
    maxLevel: 3,
    levels: [
      { price: 100, effect: 0.1 },
      { price: 250, effect: 0.2 },
      { price: 500, effect: 0.3 },
    ],
  },
  {
    id: "coffee-machine",
    displayName: "커피머신",
    description: "손님 인내심을 늘려 응대 여유를 줍니다.",
    maxLevel: 3,
    levels: [
      { price: 150, effect: 0.1 },
      { price: 350, effect: 0.2 },
      { price: 600, effect: 0.3 },
    ],
  },
  {
    id: "producer",
    displayName: "생산기 업그레이드",
    description: "생산 완료까지 대기 시간을 줄입니다.",
    maxLevel: 3,
    levels: [
      { price: 200, effect: 0.1 },
      { price: 400, effect: 0.2 },
      { price: 700, effect: 0.3 },
    ],
  },
  {
    id: "chip-shelf",
    displayName: "칩 선반 확장",
    description: "라인 옆 퀵 선반으로 칩 동선을 줄입니다.",
    maxLevel: 1,
    levels: [{ price: 400, effect: 1 }],
  },
  {
    id: "analyzer",
    displayName: "분석기",
    description: "생산 결과의 조건별 일치/불일치를 보여 줍니다. 칩 이름은 알려주지 않습니다.",
    maxLevel: 1,
    levels: [{ price: 600, effect: 1 }],
  },
  {
    id: "order-analyzer",
    displayName: "주문 분석기",
    description: "주문서를 구조화해 요구 조건을 보여 줍니다. 칩 이름은 알려주지 않습니다.",
    maxLevel: 1,
    levels: [{ price: 800, effect: 1 }],
  },
];

export const upgradesById = new Map(upgrades.map((item) => [item.id, item]));

export interface UpgradeEffects {
  moveSpeedBonus: number;
  interactDelayReduction: number;
  patienceBonus: number;
  produceTimeReduction: number;
  hasChipShelf: boolean;
  hasAnalyzer: boolean;
  hasOrderAnalyzer: boolean;
}

export function emptyUpgradeEffects(): UpgradeEffects {
  return {
    moveSpeedBonus: 0,
    interactDelayReduction: 0,
    patienceBonus: 0,
    produceTimeReduction: 0,
    hasChipShelf: false,
    hasAnalyzer: false,
    hasOrderAnalyzer: false,
  };
}

export function computeUpgradeEffects(levels: Record<string, number>): UpgradeEffects {
  const effects = emptyUpgradeEffects();
  const shoes = levels["work-shoes"] ?? 0;
  const gloves = levels["work-gloves"] ?? 0;
  const coffee = levels["coffee-machine"] ?? 0;
  const producer = levels["producer"] ?? 0;
  if (shoes > 0) effects.moveSpeedBonus = upgradesById.get("work-shoes")!.levels[shoes - 1]!.effect;
  if (gloves > 0) effects.interactDelayReduction = upgradesById.get("work-gloves")!.levels[gloves - 1]!.effect;
  if (coffee > 0) effects.patienceBonus = upgradesById.get("coffee-machine")!.levels[coffee - 1]!.effect;
  if (producer > 0) effects.produceTimeReduction = upgradesById.get("producer")!.levels[producer - 1]!.effect;
  effects.hasChipShelf = (levels["chip-shelf"] ?? 0) >= 1;
  effects.hasAnalyzer = (levels["analyzer"] ?? 0) >= 1;
  effects.hasOrderAnalyzer = (levels["order-analyzer"] ?? 0) >= 1;
  return effects;
}

/** Delivery credit table from the upgrade design doc. */
export const DELIVERY_SUCCESS_CREDIT = 100;
export const DELIVERY_PERFECT_BONUS = 50;
export const DELIVERY_PATIENCE_BONUS = 20;

export interface DeliveryCreditBreakdown {
  success: number;
  perfect: number;
  patience: number;
  total: number;
}

/**
 * Delivery credits: fail = 0.
 * Pass → success +100 and pass bonus +50; patience ≥50% → +20.
 */
export function computeDeliveryCredits(options: {
  passed: boolean;
  patienceRatio: number;
}): DeliveryCreditBreakdown {
  if (!options.passed) {
    return { success: 0, perfect: 0, patience: 0, total: 0 };
  }
  const success = DELIVERY_SUCCESS_CREDIT;
  const perfect = DELIVERY_PERFECT_BONUS;
  const patience = options.patienceRatio >= 0.5 ? DELIVERY_PATIENCE_BONUS : 0;
  return { success, perfect, patience, total: success + perfect + patience };
}

/** Condition labels for analyzers — never reveal chip module names. */
export const TAG_CONDITION_LABELS: Record<string, string> = {
  generator: "기본 그림 생성",
  "style-fairytale": "동화풍 스타일 표현",
  "no-hat": "금지 요소(모자 등) 제거",
  "centered-composition": "주인공 중앙 구도",
  sharpness: "선명도 보정",
  "quality-inspection": "품질 검사 통과",
};

export const SCORE_CONDITION_LABELS = {
  subjectAccuracy: "주제 정확도",
  styleMatch: "스타일 일치",
  composition: "구도",
  sharpness: "선명도",
} as const;
