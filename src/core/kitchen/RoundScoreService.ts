import { modulesById } from "../../data/modules";
import { ordersById } from "../../data/orders";
import type { GenerationTag } from "../types";
import type { RoundStats } from "./types";

export type RoundGrade = "S" | "A" | "B" | "C" | "D";

export interface RoundScoreBreakdown {
  deliveryScore: number;
  efficiencyScore: number;
  retentionScore: number;
  budgetScore: number;
  total: number;
  grade: RoundGrade;
  idealVram: number;
  vramUsed: number;
  vramBudget: number;
  overBudget: number;
  creditReward: number;
}

const TAG_TO_MODULE: Record<GenerationTag, string> = {
  generator: "image-maker",
  "style-fairytale": "style-processor",
  "no-hat": "ban-list",
  "centered-composition": "composition-planner",
  sharpness: "sharpener",
  "quality-inspection": "quality-checker",
};

export class RoundScoreService {
  idealVramForOrder(orderId: string): number {
    const order = ordersById.get(orderId);
    if (!order) return modulesById.get("image-maker")?.vramCost ?? 8;
    const moduleIds = new Set<string>(["image-maker"]);
    for (const tag of order.requiredTags) {
      const moduleId = TAG_TO_MODULE[tag];
      if (moduleId) moduleIds.add(moduleId);
    }
    let total = 0;
    for (const moduleId of moduleIds) total += modulesById.get(moduleId)?.vramCost ?? 0;
    return total;
  }

  idealVramForOrders(orderIds: string[]): number {
    return orderIds.reduce((sum, orderId) => sum + this.idealVramForOrder(orderId), 0);
  }

  score(stats: RoundStats, baseReward: number): RoundScoreBreakdown {
    const target = Math.max(1, stats.targetCustomers);
    const deliveryScore = 40 * (stats.passedDeliveries / target);
    const idealVram = this.idealVramForOrders(stats.assignedOrderIds);
    const efficiency = Math.max(0, Math.min(1, idealVram / Math.max(stats.vramUsed, 1)));
    const efficiencyScore = 40 * efficiency;
    const retentionScore = 10 * (1 - stats.leftCustomers / target);
    const overBudget = Math.max(0, stats.vramUsed - stats.vramBudget);
    const budgetScore = overBudget <= 0 ? 10 : 10 * Math.max(0, 1 - overBudget / stats.vramBudget);
    const total = Math.round(deliveryScore + efficiencyScore + retentionScore + budgetScore);
    const grade = gradeFor(total);
    const creditReward = baseReward + gradeBonus(grade) + stats.passedDeliveries * 10;
    return {
      deliveryScore: Math.round(deliveryScore),
      efficiencyScore: Math.round(efficiencyScore),
      retentionScore: Math.round(retentionScore),
      budgetScore: Math.round(budgetScore),
      total,
      grade,
      idealVram,
      vramUsed: stats.vramUsed,
      vramBudget: stats.vramBudget,
      overBudget,
      creditReward,
    };
  }
}

function gradeFor(total: number): RoundGrade {
  if (total >= 90) return "S";
  if (total >= 75) return "A";
  if (total >= 60) return "B";
  if (total >= 40) return "C";
  return "D";
}

function gradeBonus(grade: RoundGrade): number {
  return ({ S: 80, A: 50, B: 30, C: 10, D: 0 } as const)[grade];
}

export function slotVramCost(moduleIds: Array<string | null>): number {
  return moduleIds.reduce((sum, moduleId) => sum + (moduleId ? modulesById.get(moduleId)?.vramCost ?? 0 : 0), 0);
}

export function produceSlowdownMultiplier(vramUsed: number, vramBudget: number): number {
  const overBudget = Math.max(0, vramUsed - vramBudget);
  if (overBudget <= 0) return 1;
  return 1 + Math.min(1.5, overBudget / Math.max(vramBudget, 1));
}
