import type { GenerationResult, OrderEvaluation } from "../types";

export type CarryKind = "none" | "order" | "moduleChip" | "product";

export interface CarryNone {
  kind: "none";
}

export interface CarryOrder {
  kind: "order";
  orderId: string;
  customerId: string;
  prompt: string;
}

export interface CarryModuleChip {
  kind: "moduleChip";
  moduleId: string;
}

export interface CarryProduct {
  kind: "product";
  orderId: string;
  customerId: string;
  prompt: string;
  result: GenerationResult;
  evaluation: OrderEvaluation;
  vramSpend: number;
}

export type CarryItem = CarryNone | CarryOrder | CarryModuleChip | CarryProduct;

export type CustomerState = "waiting" | "served" | "left";

export interface Customer {
  id: string;
  orderId: string;
  prompt: string;
  patience: number;
  maxPatience: number;
  state: CustomerState;
  orderTaken: boolean;
}

export interface InputStation {
  order: CarryOrder | null;
}

export interface OutputStation {
  product: CarryProduct | null;
}

export interface RoundStats {
  roundId: string;
  targetCustomers: number;
  vramBudget: number;
  vramUsed: number;
  passedDeliveries: number;
  failedDeliveries: number;
  leftCustomers: number;
  resolvedCustomers: number;
  assignedOrderIds: string[];
  finished: boolean;
}

export interface KitchenActionResult {
  ok: boolean;
  message?: string;
  tone?: "error" | "info" | "success";
  delivered?: {
    customerId: string;
    reward: number;
    passed: boolean;
    evaluation: OrderEvaluation;
    result: GenerationResult;
  };
  leftCustomerId?: string;
  roundFinished?: RoundStats;
}

export const SLOT_COUNT = 3;
export const MAX_CUSTOMERS = 2;
export const DEFAULT_PATIENCE = 45;

export const CHIP_MODULE_IDS = [
  "image-maker",
  "style-processor",
  "ban-list",
  "composition-planner",
  "sharpener",
  "quality-checker",
] as const;

export function emptyCarry(): CarryNone {
  return { kind: "none" };
}
