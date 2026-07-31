import { describe, expect, it } from "vitest";
import { KitchenSession } from "./kitchen/KitchenSession";
import { produceSlowdownMultiplier, RoundScoreService } from "./kitchen/RoundScoreService";
import { ProgressionService } from "./progression/ProgressionService";
import { SaveService, type StorageAdapter } from "./save/SaveService";

function serveCustomer(session: KitchenSession, chips: string[]): void {
  session.tick(1);
  const customer = session.getWaitingCustomers()[0];
  expect(customer).toBeTruthy();
  session.resetLine();
  session.pickUpFromCustomer(customer.id);
  session.interactInput();
  for (let i = 0; i < chips.length; i += 1) {
    session.pickUpFromShelf(chips[i]!);
    session.interactSlot(i);
  }
  expect(session.startProduce().ok).toBe(true);
  session.tick(3);
  expect(session.interactOutput().ok).toBe(true);
  expect(session.deliverToCustomer(customer.id).delivered).toBeTruthy();
}

describe("RoundScoreService", () => {
  const scorer = new RoundScoreService();

  it("computes ideal VRAM for o01 as image-maker only", () => {
    expect(scorer.idealVramForOrder("o01")).toBe(8);
  });

  it("computes ideal VRAM for o02 as maker + style", () => {
    expect(scorer.idealVramForOrder("o02")).toBe(14);
  });

  it("scores efficient perfect round highly", () => {
    const result = scorer.score({
      roundId: "r01",
      targetCustomers: 3,
      vramBudget: 24,
      vramUsed: 24,
      passedDeliveries: 3,
      failedDeliveries: 0,
      leftCustomers: 0,
      resolvedCustomers: 3,
      assignedOrderIds: ["o01", "o01", "o01"],
      finished: true,
    }, 100);
    expect(result.total).toBeGreaterThanOrEqual(90);
    expect(result.grade).toBe("S");
    expect(result.idealVram).toBe(24);
  });

  it("lowers efficiency when wasteful VRAM is used", () => {
    const efficient = scorer.score({
      roundId: "r01", targetCustomers: 3, vramBudget: 24, vramUsed: 24,
      passedDeliveries: 3, failedDeliveries: 0, leftCustomers: 0, resolvedCustomers: 3,
      assignedOrderIds: ["o01", "o01", "o01"], finished: true,
    }, 100);
    const wasteful = scorer.score({
      roundId: "r01", targetCustomers: 3, vramBudget: 24, vramUsed: 48,
      passedDeliveries: 3, failedDeliveries: 0, leftCustomers: 0, resolvedCustomers: 3,
      assignedOrderIds: ["o01", "o01", "o01"], finished: true,
    }, 100);
    expect(wasteful.efficiencyScore).toBeLessThan(efficient.efficiencyScore);
    expect(wasteful.budgetScore).toBeLessThan(efficient.budgetScore);
  });

  it("applies produce slowdown when over budget", () => {
    expect(produceSlowdownMultiplier(20, 24)).toBe(1);
    expect(produceSlowdownMultiplier(36, 24)).toBeGreaterThan(1);
    expect(produceSlowdownMultiplier(1000, 24)).toBeLessThanOrEqual(2.5);
  });
});

describe("KitchenSession rounds and VRAM", () => {
  it("spawns a fixed number of customers for the round", () => {
    const session = new KitchenSession("r01");
    expect(session.getStats().targetCustomers).toBe(3);
    expect(session.getWaitingCustomers().length).toBeGreaterThanOrEqual(1);
  });

  it("spends VRAM on each production", () => {
    const session = new KitchenSession("r01");
    const before = session.getVramUsed();
    serveCustomer(session, ["image-maker"]);
    expect(session.getVramUsed()).toBe(before + 8);
  });

  it("finishes the round after resolving all customers", () => {
    const session = new KitchenSession("r01");
    let finished = false;
    for (let i = 0; i < 3; i += 1) {
      session.tick(3);
      const customer = session.getWaitingCustomers()[0];
      if (!customer) break;
      session.resetLine();
      session.pickUpFromCustomer(customer.id);
      session.interactInput();
      session.pickUpFromShelf("image-maker");
      session.interactSlot(0);
      session.startProduce();
      session.tick(3);
      session.interactOutput();
      const delivery = session.deliverToCustomer(customer.id);
      if (delivery.roundFinished) finished = true;
    }
    expect(finished || session.isRoundFinished()).toBe(true);
    expect(session.getStats().resolvedCustomers).toBe(3);
  });

  it("only emits roundFinished once", () => {
    const session = new KitchenSession("r01");
    let finishCount = 0;
    for (let i = 0; i < 3; i += 1) {
      session.tick(3);
      const customer = session.getWaitingCustomers()[0];
      expect(customer, `customer ${i + 1}`).toBeTruthy();
      session.resetLine();
      session.pickUpFromCustomer(customer.id);
      session.interactInput();
      session.pickUpFromShelf("image-maker");
      session.interactSlot(0);
      expect(session.startProduce().ok).toBe(true);
      session.tick(3);
      expect(session.interactOutput().ok).toBe(true);
      const delivery = session.deliverToCustomer(customer.id);
      expect(delivery.delivered).toBeTruthy();
      if (delivery.roundFinished) finishCount += 1;
      for (const event of session.tick(0.1)) if (event.roundFinished) finishCount += 1;
    }
    expect(session.isRoundFinished()).toBe(true);
    expect(finishCount).toBe(1);
  });

  it("slows production after exceeding VRAM budget", () => {
    const session = new KitchenSession("r02", ["image-maker", "style-processor"]);
    for (let i = 0; i < 3; i += 1) {
      session.tick(0.5);
      const customer = session.getWaitingCustomers()[0];
      if (!customer) break;
      session.resetLine();
      session.pickUpFromCustomer(customer.id);
      session.interactInput();
      session.pickUpFromShelf("image-maker");
      session.interactSlot(0);
      session.pickUpFromShelf("style-processor");
      session.interactSlot(1);
      expect(session.startProduce().ok).toBe(true);
      session.tick(5);
      session.interactOutput();
      session.deliverToCustomer(customer.id);
    }
    expect(session.getVramUsed()).toBeGreaterThan(session.getVramBudget());
  });
});

class MemoryStorage implements StorageAdapter {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

describe("SaveService v2", () => {
  it("restores defaults for a missing save", () => {
    expect(new SaveService(new MemoryStorage()).load().currentRoundId).toBe("r01");
  });

  it("persists round progression", () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage);
    const progression = ProgressionService.createDefault();
    progression.completeActiveRound(92, 180);
    service.save(progression);
    const loaded = service.load();
    expect(loaded.credits).toBe(180);
    expect(loaded.bestRoundScores.r01).toBe(92);
    expect(loaded.unlockedModuleIds).toContain("style-processor");
  });
});
