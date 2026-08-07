import { describe, expect, it } from "vitest";
import { GenerationSimulator } from "./generation/GenerationSimulator";
import { buildPreviewModel, createPreviewAssetKey, PREVIEW_ASSET_KEYS, previewImageSrc } from "./generation/previewModel";
import { KitchenSession } from "./kitchen/KitchenSession";
import { produceSlowdownMultiplier, RoundScoreService } from "./kitchen/RoundScoreService";
import { ProgressionService } from "./progression/ProgressionService";
import { SaveService, type StorageAdapter } from "./save/SaveService";
import { ordersById } from "../data/orders";
import { buildRoundOrderQueue, rounds } from "../data/rounds";
import { TutorialGuide } from "../game/TutorialGuide";
import { renderPreview } from "../ui/renderPreview";

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

describe("Generation preview", () => {
  const simulator = new GenerationSimulator();

  it("encodes module tags and quality band into previewKey", () => {
    const plain = simulator.simulate(ordersById.get("o01")!, ["order-input", "image-maker", "delivery-bay"]);
    expect(plain.previewKey).toContain("plain");
    expect(plain.previewKey).toContain("hat");
    expect(plain.previewKey).toMatch(/-(lo|mid|hi)$/);

    const styled = simulator.simulate(ordersById.get("o02")!, ["order-input", "image-maker", "style-processor", "delivery-bay"]);
    expect(styled.previewKey).toContain("fairytale");
    expect(styled.appliedTags).toContain("style-fairytale");
  });

  it("maps tags to one of 16 preview photo assets", () => {
    expect(PREVIEW_ASSET_KEYS).toHaveLength(16);
    const basic = createPreviewAssetKey(["generator"]);
    expect(basic).toBe("cat-plain-hat-offset-soft");
    const rich = createPreviewAssetKey([
      "generator",
      "style-fairytale",
      "no-hat",
      "centered-composition",
      "sharpness",
      "quality-inspection",
    ]);
    expect(rich).toBe("cat-fairytale-no-hat-center-sharp");
    expect(PREVIEW_ASSET_KEYS).toContain(rich);
    expect(previewImageSrc(rich)).toBe("/assets/art/previews/cat-fairytale-no-hat-center-sharp.png");

    const result = simulator.simulate(
      ordersById.get("o03")!,
      ["order-input", "image-maker", "ban-list", "delivery-bay"],
    );
    const model = buildPreviewModel(result);
    expect(model.assetKey).toBe("cat-plain-no-hat-offset-soft");
    expect(model.imageSrc).toContain(model.assetKey);
    expect(model.classes).toContain("preview--photo");
  });

  it("builds preview classes and effect labels for the inspect UI", () => {
    const result = simulator.simulate(
      ordersById.get("o03")!,
      ["order-input", "image-maker", "ban-list", "delivery-bay"],
    );
    const model = buildPreviewModel(result);
    expect(model.classes).toContain("preview--no-hat");
    expect(model.effects).toContain("모자 제거");
    const html = renderPreview(result);
    expect(html).toContain("preview--no-hat");
    expect(html).toContain("preview-photo");
    expect(html).toContain("/assets/art/previews/cat-plain-no-hat-offset-soft.png");
    expect(html).toContain("모자 제거");
    expect(html).toContain("preview-scores");
  });
});

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
    for (let i = 0; i < 4; i += 1) {
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

  it("keeps optimal clear within each round VRAM budget", () => {
    const scorer = new RoundScoreService();
    for (const round of rounds) {
      const queue = buildRoundOrderQueue(round);
      const ideal = scorer.idealVramForOrders(queue);
      expect(queue).toHaveLength(round.targetCustomers);
      expect(ideal, `${round.id} ideal ${ideal} vs budget ${round.vramBudget}`).toBeLessThanOrEqual(round.vramBudget);
    }
  });

  it("drops carried items to the floor and picks them back up", () => {
    const session = new KitchenSession("r01");
    session.tick(0.1);
    const customer = session.getWaitingCustomers()[0]!;
    expect(session.pickUpFromCustomer(customer.id).ok).toBe(true);
    expect(session.dropToFloor(400, 300).ok).toBe(true);
    expect(session.getCarry().kind).toBe("none");
    expect(session.getFloorItems()).toHaveLength(1);
    const floorId = session.getFloorItems()[0]!.id;
    expect(session.pickUpFromFloor(floorId).ok).toBe(true);
    expect(session.getCarry().kind).toBe("order");
    expect(session.getFloorItems()).toHaveLength(0);
    expect(session.interactInput().ok).toBe(true);

    expect(session.pickUpFromShelf("image-maker").ok).toBe(true);
    expect(session.dropToFloor(420, 320).ok).toBe(true);
    expect(session.getFloorItems()[0]!.item).toMatchObject({ kind: "moduleChip", moduleId: "image-maker" });
  });

  it("clears floor orders when the customer leaves", () => {
    const session = new KitchenSession("r01");
    session.tick(0.1);
    const customer = session.getWaitingCustomers()[0]!;
    session.pickUpFromCustomer(customer.id);
    session.dropToFloor(300, 280);
    expect(session.getFloorItems()).toHaveLength(1);
    for (const event of session.tick(50)) {
      if (event.leftCustomerId) break;
    }
    expect(session.getFloorItems()).toHaveLength(0);
  });

  it("clears carried and input orders when the customer leaves", () => {
    const session = new KitchenSession("r01");
    session.tick(0.1);
    const customer = session.getWaitingCustomers()[0]!;
    session.pickUpFromCustomer(customer.id);
    session.interactInput();
    expect(session.getInput().order?.customerId).toBe(customer.id);
    for (const event of session.tick(50)) {
      if (event.leftCustomerId) break;
    }
    expect(session.getInput().order).toBeNull();
    expect(session.getCarry().kind).toBe("none");
    expect(session.isProducing()).toBe(false);
  });

  it("allows only one copy of each module chip from the shelf per round", () => {
    const session = new KitchenSession("r01");
    session.tick(0.1);
    expect(session.pickUpFromShelf("image-maker").ok).toBe(true);
    expect(session.getShelfModuleIds()).not.toContain("image-maker");
    expect(session.pickUpFromShelf("image-maker").ok).toBe(false);
    expect(session.getCarry()).toMatchObject({ kind: "moduleChip", moduleId: "image-maker" });
  });

  it("returns shelf stock when the line is reset", () => {
    const session = new KitchenSession("r01");
    session.tick(0.1);
    session.pickUpFromShelf("image-maker");
    session.interactSlot(0);
    expect(session.getShelfModuleIds()).not.toContain("image-maker");
    session.resetLine();
    expect(session.getShelfModuleIds()).toContain("image-maker");
    expect(session.getSlots()[0]).toBeNull();
  });

  it("swaps a carried module chip with a filled slot", () => {
    const session = new KitchenSession("r02", ["image-maker", "style-processor"]);
    session.tick(0.1);
    expect(session.pickUpFromShelf("image-maker").ok).toBe(true);
    expect(session.interactSlot(0).ok).toBe(true);
    expect(session.getSlots()[0]).toBe("image-maker");
    expect(session.pickUpFromShelf("style-processor").ok).toBe(true);
    expect(session.interactSlot(0).ok).toBe(true);
    expect(session.getSlots()[0]).toBe("style-processor");
    expect(session.getCarry()).toMatchObject({ kind: "moduleChip", moduleId: "image-maker" });
  });

  it("rejects putting a non-chip item into a module slot", () => {
    const session = new KitchenSession("r01");
    session.tick(0.1);
    const customer = session.getWaitingCustomers()[0]!;
    session.pickUpFromCustomer(customer.id);
    const result = session.interactSlot(0);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/모듈 칩만/);
  });
});

class MemoryStorage implements StorageAdapter {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

describe("Module unlock tutorials", () => {
  it("queues image-maker on a fresh save", () => {
    const progression = ProgressionService.createDefault();
    expect(progression.pendingModuleTutorials("r00")).toEqual(["image-maker"]);
    expect(progression.pendingModuleTutorials("r01")).toEqual(["image-maker"]);
  });

  it("marks introduced modules so the tutorial does not repeat", () => {
    const progression = ProgressionService.createDefault();
    progression.markModulesIntroduced(["image-maker"]);
    expect(progression.pendingModuleTutorials("r01")).toEqual([]);
    progression.completeActiveRound(90, 100);
    progression.activateRound("r02");
    expect(progression.pendingModuleTutorials("r02")).toEqual(["style-processor"]);
  });
});

describe("SaveService v2", () => {
  it("restores defaults for a missing save", () => {
    expect(new SaveService(new MemoryStorage()).load().currentRoundId).toBe("r00");
  });

  it("persists round progression", () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage);
    const progression = ProgressionService.createDefault();
    progression.completeActiveRound(50, 50);
    progression.activateRound("r01");
    progression.completeActiveRound(92, 180);
    service.save(progression);
    const loaded = service.load();
    expect(loaded.credits).toBe(230);
    expect(loaded.bestRoundScores.r00).toBe(50);
    expect(loaded.bestRoundScores.r01).toBe(92);
    expect(loaded.unlockedModuleIds).toContain("style-processor");
  });

  it("persists introduced module tutorials", () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage);
    const progression = ProgressionService.createDefault();
    progression.markModulesIntroduced(["image-maker"]);
    service.save(progression);
    expect(service.load().pendingModuleTutorials("r01")).toEqual([]);
  });
});

describe("Tutorial round r00", () => {
  it("starts progression at r00 and advances to r01 on clear", () => {
    const progression = ProgressionService.createDefault();
    expect(progression.currentRoundId).toBe("r00");
    expect(rounds[0]?.id).toBe("r00");
    expect(rounds[0]?.isTutorial).toBe(true);
    progression.completeActiveRound(80, 50);
    expect(progression.isComplete("r00")).toBe(true);
    expect(progression.nextRoundId()).toBe("r01");
    progression.activateRound("r01");
    expect(progression.currentRoundId).toBe("r01");
  });

  it("does not drain patience during the tutorial round", () => {
    const session = new KitchenSession("r00");
    session.tick(1);
    const customer = session.getWaitingCustomers()[0];
    expect(customer).toBeTruthy();
    const before = customer!.patience;
    session.tick(20);
    expect(session.getWaitingCustomers()[0]?.patience).toBe(before);
    expect(session.getStats().leftCustomers).toBe(0);
  });
});

describe("TutorialGuide step lock", () => {
  it("advances only on the expected actions", () => {
    const guide = new TutorialGuide();
    const session = new KitchenSession("r00");
    session.tick(1);
    guide.reset(true);
    expect(guide.getStep()).toBe("pick-order");

    const customer = session.getWaitingCustomers()[0]!;
    expect(guide.matchesTarget(session, { kind: "input" })).toBe(false);
    expect(guide.matchesTarget(session, { kind: "customer", id: customer.id })).toBe(true);

    const pick = session.pickUpFromCustomer(customer.id);
    expect(guide.onAfterAction(pick, session)).toBe(true);
    expect(guide.getStep()).toBe("insert-input");

    const insert = session.interactInput();
    expect(guide.onAfterAction(insert, session)).toBe(true);
    expect(guide.getStep()).toBe("pick-chip");

    const chip = session.pickUpFromShelf("image-maker");
    expect(guide.onAfterAction(chip, session)).toBe(true);
    expect(guide.getStep()).toBe("insert-slot");

    const slot = session.interactSlot(0);
    expect(guide.onAfterAction(slot, session)).toBe(true);
    expect(guide.getStep()).toBe("produce");

    const produce = session.startProduce();
    expect(guide.onAfterAction(produce, session)).toBe(true);
    expect(guide.getStep()).toBe("wait-output");
    session.tick(3);
    expect(guide.sync(session)).toBe(true);
    expect(guide.getStep()).toBe("pick-output");

    const output = session.interactOutput();
    expect(guide.onAfterAction(output, session)).toBe(true);
    expect(guide.getStep()).toBe("deliver");

    const deliver = session.deliverToCustomer(customer.id);
    expect(guide.onAfterAction(deliver, session)).toBe(true);
    expect(guide.getStep()).toBe("done");
    expect(guide.isActive()).toBe(false);
  });
});
