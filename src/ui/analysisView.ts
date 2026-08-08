import { ordersById } from "../data/orders";
import {
  SCORE_CONDITION_LABELS,
  TAG_CONDITION_LABELS,
} from "../data/upgrades";
import type { GenerationResult, OrderDefinition, QualityScores } from "../core/types";

export interface AnalysisRow {
  label: string;
  matched?: boolean;
  detail: string;
}

/** Product analyzer rows — Subject/Style/Composition/Sharpness match without chip names. */
export function productAnalysisRows(orderId: string, result: GenerationResult): AnalysisRow[] {
  const order = ordersById.get(orderId);
  if (!order) return [];
  const rows: AnalysisRow[] = [];
  (Object.keys(SCORE_CONDITION_LABELS) as Array<keyof QualityScores>).forEach((score) => {
    const minimum = order.minimumScores[score];
    if (minimum === undefined) return;
    const value = result[score];
    rows.push({
      label: SCORE_CONDITION_LABELS[score],
      matched: value >= minimum,
      detail: `${value} / 목표 ${minimum}`,
    });
  });
  for (const tag of order.requiredTags) {
    if (tag === "generator") continue;
    rows.push({
      label: TAG_CONDITION_LABELS[tag] ?? "추가 조건",
      matched: result.appliedTags.includes(tag),
      detail: result.appliedTags.includes(tag) ? "충족" : "미충족",
    });
  }
  return rows;
}

/** Order analyzer — structured requirements without revealing chip module names. */
export function orderAnalysisRows(order: OrderDefinition): AnalysisRow[] {
  const rows: AnalysisRow[] = [];
  (Object.keys(SCORE_CONDITION_LABELS) as Array<keyof QualityScores>).forEach((score) => {
    const minimum = order.minimumScores[score];
    if (minimum === undefined) return;
    rows.push({
      label: SCORE_CONDITION_LABELS[score],
      detail: `목표 ${minimum} 이상`,
    });
  });
  for (const tag of order.requiredTags) {
    if (tag === "generator") continue;
    rows.push({
      label: TAG_CONDITION_LABELS[tag] ?? "추가 조건",
      detail: "필요",
    });
  }
  if (rows.length === 0) {
    rows.push({ label: "기본 납품", detail: "기본 그림만 있으면 됩니다." });
  }
  return rows;
}
