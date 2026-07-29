import { orders } from "../../data/orders";
import type { SaveData } from "../types";

export class ProgressionService {
  constructor(private data: SaveData) {}

  static createDefault(): ProgressionService {
    return new ProgressionService({ version: 1, credits: 0, completedOrderIds: [], unlockedModuleIds: ["order-input", "image-maker", "delivery-bay"], tutorialStage: 1, activeOrderId: "o01" });
  }

  get snapshot(): SaveData { return structuredClone(this.data); }
  get currentOrderId(): string { return this.data.activeOrderId; }
  get credits(): number { return this.data.credits; }

  activateOrder(orderId: string): void { this.data.activeOrderId = orderId; this.data.factorySnapshot = undefined; }
  saveFactory(factorySnapshot: SaveData["factorySnapshot"]): void { this.data.factorySnapshot = factorySnapshot ? structuredClone(factorySnapshot) : undefined; }
  isComplete(orderId: string): boolean { return this.data.completedOrderIds.includes(orderId); }
  nextOrderId(): string | undefined { const index = orders.findIndex((order) => order.id === this.data.activeOrderId); return orders[index + 1]?.id; }

  completeActiveOrder(reward: number): void {
    if (!this.isComplete(this.data.activeOrderId)) {
      this.data.completedOrderIds.push(this.data.activeOrderId);
      this.data.credits += reward;
    }
    const next = this.nextOrderId();
    if (next) {
      const order = orders.find((item) => item.id === next)!;
      this.data.unlockedModuleIds = [...new Set([...this.data.unlockedModuleIds, ...order.availableModuleIds])];
      this.data.tutorialStage = Math.min(6, this.data.tutorialStage + 1);
    }
  }
}
