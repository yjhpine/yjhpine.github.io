import { modulesById } from "../../data/modules";
import { ordersById } from "../../data/orders";
import { pickPromptForOrder } from "../../data/prompts";
import { roundsById, buildRoundOrderQueue, type RoundDefinition } from "../../data/rounds";
import {
  computeDeliveryCredits,
  emptyUpgradeEffects,
  type UpgradeEffects,
} from "../../data/upgrades";
import { GenerationSimulator } from "../generation/GenerationSimulator";
import { OrderEvaluator } from "../orders/OrderEvaluator";
import type { OrderDefinition } from "../types";
import { produceSlowdownMultiplier, slotVramCost } from "./RoundScoreService";
import {
  CHIP_MODULE_IDS,
  DEFAULT_PATIENCE,
  emptyCarry,
  MAX_CUSTOMERS,
  SLOT_COUNT,
  type CarryItem,
  type CarryProduct,
  type Customer,
  type FloorItem,
  type InputStation,
  type KitchenActionResult,
  type OutputStation,
  type RoundStats,
} from "./types";

export class KitchenSession {
  private readonly simulator = new GenerationSimulator();
  private readonly evaluator = new OrderEvaluator();
  private customerSequence = 0;
  private floorSequence = 0;
  private carry: CarryItem = emptyCarry();
  private readonly customers: Customer[] = [];
  private readonly floorItems: FloorItem[] = [];
  private readonly input: InputStation = { order: null };
  private readonly slots: Array<string | null>;
  private readonly output: OutputStation = { product: null };
  private shelfModuleIds: string[];
  private unlockedModuleIds: string[];
  private producing = false;
  private produceTimer = 0;
  private plannedProduceDuration = 1;
  private spawnCooldown = 0;
  private readonly round: RoundDefinition;
  private readonly orderQueue: string[];
  private queueIndex = 0;
  private vramUsed = 0;
  private passedDeliveries = 0;
  private failedDeliveries = 0;
  private leftCustomers = 0;
  private resolvedCustomers = 0;
  private readonly assignedOrderIds: string[] = [];
  private roundFinished = false;
  private pendingSpend = 0;
  private upgrades: UpgradeEffects;

  constructor(
    roundId: string,
    unlockedModuleIds?: string[],
    slotCount = SLOT_COUNT,
    upgrades: UpgradeEffects = emptyUpgradeEffects(),
  ) {
    this.round = roundsById.get(roundId) ?? roundsById.get("r01")!;
    this.slots = Array.from({ length: slotCount }, () => null);
    const unlocked = unlockedModuleIds ?? this.round.availableModuleIds;
    this.unlockedModuleIds = unlocked.filter((id) => (CHIP_MODULE_IDS as readonly string[]).includes(id));
    if (!this.unlockedModuleIds.includes("image-maker")) {
      this.unlockedModuleIds = ["image-maker", ...this.unlockedModuleIds];
    }
    this.shelfModuleIds = [...this.unlockedModuleIds];
    this.orderQueue = buildRoundOrderQueue(this.round);
    this.upgrades = { ...upgrades };
    this.spawnCustomer();
  }

  setUpgrades(upgrades: UpgradeEffects): void {
    this.upgrades = { ...upgrades };
  }

  getUpgradeEffects(): UpgradeEffects {
    return { ...this.upgrades };
  }

  get roundDefinition(): RoundDefinition { return this.round; }
  get order(): OrderDefinition {
    const orderId = this.input.order?.orderId ?? this.assignedOrderIds[0] ?? this.round.customerOrderPool[0]!;
    return ordersById.get(orderId) ?? ordersById.get("o01")!;
  }

  getCarry(): CarryItem { return this.carry; }
  getFloorItems(): FloorItem[] {
    return this.floorItems.map((item) => ({ ...item, item: { ...item.item } as FloorItem["item"] }));
  }
  getCustomers(): Customer[] { return this.customers.map((customer) => ({ ...customer })); }
  getWaitingCustomers(): Customer[] { return this.getCustomers().filter((customer) => customer.state === "waiting"); }
  getInput(): InputStation { return { order: this.input.order ? { ...this.input.order } : null }; }
  getSlots(): Array<string | null> { return [...this.slots]; }
  getOutput(): OutputStation {
    return {
      product: this.output.product
        ? { ...this.output.product, result: { ...this.output.product.result }, evaluation: { ...this.output.product.evaluation, issues: [...this.output.product.evaluation.issues] } }
        : null,
    };
  }
  getShelfModuleIds(): string[] { return [...this.shelfModuleIds]; }
  getUnlockedModuleIds(): string[] { return [...this.unlockedModuleIds]; }
  isProducing(): boolean { return this.producing; }
  getProduceProgress(): number {
    if (!this.producing) return 0;
    return 1 - this.produceTimer / Math.max(this.plannedProduceDuration, 0.01);
  }
  getVramUsed(): number { return this.vramUsed; }
  getVramBudget(): number { return this.round.vramBudget; }
  getSlotVramPreview(): number { return slotVramCost(this.slots); }
  isRoundFinished(): boolean { return this.roundFinished; }

  getStats(): RoundStats {
    return {
      roundId: this.round.id,
      targetCustomers: this.round.targetCustomers,
      vramBudget: this.round.vramBudget,
      vramUsed: this.vramUsed,
      passedDeliveries: this.passedDeliveries,
      failedDeliveries: this.failedDeliveries,
      leftCustomers: this.leftCustomers,
      resolvedCustomers: this.resolvedCustomers,
      assignedOrderIds: [...this.assignedOrderIds],
      finished: this.roundFinished,
    };
  }

  setUnlockedModules(moduleIds: string[]): void {
    this.unlockedModuleIds = moduleIds.filter((id) => (CHIP_MODULE_IDS as readonly string[]).includes(id));
    if (!this.unlockedModuleIds.includes("image-maker")) {
      this.unlockedModuleIds = ["image-maker", ...this.unlockedModuleIds];
    }
    this.shelfModuleIds = [...this.unlockedModuleIds];
  }

  tick(dt: number): KitchenActionResult[] {
    const events: KitchenActionResult[] = [];
    if (this.roundFinished) return events;

    if (this.producing) {
      this.produceTimer -= dt;
      if (this.produceTimer <= 0) {
        this.producing = false;
        this.produceTimer = 0;
        const finished = this.finishProduction();
        if (finished) events.push(finished);
      }
    }

    for (const customer of this.customers) {
      if (customer.state !== "waiting") continue;
      if (this.round.isTutorial) continue;
      customer.patience = Math.max(0, customer.patience - dt);
      if (customer.patience <= 0) {
        customer.state = "left";
        this.leftCustomers += 1;
        this.resolvedCustomers += 1;
        this.spawnCooldown = Math.min(this.spawnCooldown, 0.4);
        events.push({ ok: false, leftCustomerId: customer.id, message: "손님이 떠났습니다. 너무 오래 기다렸어요.", tone: "error" });
        this.clearCustomerWork(customer.id);
        const finished = this.maybeFinishRound();
        if (finished) events.push(finished);
      }
    }

    this.spawnCooldown = Math.max(0, this.spawnCooldown - dt);
    if (this.spawnCooldown <= 0 && this.canSpawnMore() && this.getWaitingCustomers().length < MAX_CUSTOMERS) {
      this.spawnCustomer();
      this.spawnCooldown = 2.5;
    }

    return events;
  }

  pickUpFromCustomer(customerId: string): KitchenActionResult {
    if (this.roundFinished) return fail("라운드가 종료되었습니다.");
    if (this.carry.kind !== "none") return fail("이미 무언가를 들고 있습니다.");
    const customer = this.customers.find((item) => item.id === customerId);
    if (!customer || customer.state !== "waiting") return fail("받을 손님이 없습니다.");
    if (customer.orderTaken) return fail("이미 이 손님의 주문서를 가져갔습니다.");
    customer.orderTaken = true;
    this.carry = { kind: "order", orderId: customer.orderId, customerId: customer.id, prompt: customer.prompt };
    return ok("주문서를 집어 들었습니다. X로 요청을 다시 확인할 수 있습니다.", "info");
  }

  interactInput(): KitchenActionResult {
    if (this.carry.kind === "order") {
      if (this.input.order) return fail("입력기에 이미 주문서가 있습니다.");
      this.input.order = this.carry;
      this.carry = emptyCarry();
      return ok("주문서를 입력기에 넣었습니다.", "info");
    }
    if (this.carry.kind === "none" && this.input.order) {
      this.carry = this.input.order;
      this.input.order = null;
      return ok("입력기에서 주문서를 다시 집었습니다.", "info");
    }
    if (this.carry.kind === "none") return fail("넣을 주문서가 없습니다.");
    return fail("입력기에는 주문서만 넣을 수 있습니다.");
  }

  pickUpFromShelf(moduleId: string): KitchenActionResult {
    if (this.carry.kind !== "none") return fail("손을 비운 뒤에 모듈 칩을 집으세요.");
    if (!this.unlockedModuleIds.includes(moduleId)) return fail("아직 해금되지 않은 모듈입니다.");
    if (!this.shelfModuleIds.includes(moduleId)) return fail("이 모듈 칩은 이미 꺼냈습니다. 라운드당 1개뿐입니다.");
    this.carry = { kind: "moduleChip", moduleId };
    this.shelfModuleIds = this.shelfModuleIds.filter((id) => id !== moduleId);
    const cost = modulesById.get(moduleId)?.vramCost ?? 0;
    return ok(`모듈 칩을 집었습니다. (VRAM ${cost}) 빈 슬롯에 꽂으세요.`, "info");
  }

  dropToFloor(x: number, y: number): KitchenActionResult {
    if (this.roundFinished) return fail("라운드가 종료되었습니다.");
    if (this.carry.kind === "none") return fail("내려놓을 것이 없습니다.");
    this.floorSequence += 1;
    const item = this.carry;
    this.carry = emptyCarry();
    this.floorItems.push({ id: `floor-${this.floorSequence}`, x, y, item });
    return ok(`${carryObjectLabel(item.kind)} 바닥에 내려놓았습니다.`, "info");
  }

  pickUpFromFloor(floorItemId: string): KitchenActionResult {
    if (this.roundFinished) return fail("라운드가 종료되었습니다.");
    if (this.carry.kind !== "none") return fail("이미 무언가를 들고 있습니다.");
    const index = this.floorItems.findIndex((item) => item.id === floorItemId);
    if (index < 0) return fail("바닥에 집힐 물건이 없습니다.");
    const [floorItem] = this.floorItems.splice(index, 1);
    if (!floorItem) return fail("바닥에 집힐 물건이 없습니다.");
    this.carry = floorItem.item;
    return ok(`바닥에서 ${carryObjectLabel(floorItem.item.kind)} 집었습니다.`, "info");
  }

  interactSlot(index: number): KitchenActionResult {
    if (index < 0 || index >= this.slots.length) return fail("잘못된 슬롯입니다.");
    if (this.producing) return fail("생산 중에는 슬롯을 바꿀 수 없습니다.");
    const current = this.slots[index];
    if (this.carry.kind === "moduleChip") {
      if (current === this.carry.moduleId) return fail("이미 같은 모듈 칩이 꽂혀 있습니다.");
      if (current) {
        const previous = current;
        this.slots[index] = this.carry.moduleId;
        this.carry = { kind: "moduleChip", moduleId: previous };
        return ok(`모듈 칩을 바꿨습니다. 이번 생산 VRAM ${this.getSlotVramPreview()}`, "info");
      }
      this.slots[index] = this.carry.moduleId;
      this.carry = emptyCarry();
      return ok(`모듈 칩을 슬롯에 꽂았습니다. 이번 생산 VRAM ${this.getSlotVramPreview()}`, "info");
    }
    if (this.carry.kind === "none" && current) {
      this.slots[index] = null;
      this.carry = { kind: "moduleChip", moduleId: current };
      return ok("슬롯에서 모듈 칩을 뺐습니다.", "info");
    }
    if (this.carry.kind === "none") return fail("꽂을 모듈 칩이 없습니다.");
    return fail("모듈 칩만 슬롯에 꽂을 수 있습니다.");
  }

  startProduce(): KitchenActionResult {
    if (this.producing) return fail("이미 생산 중입니다.");
    if (this.output.product) return fail("출구에 완성품이 남아 있습니다. 먼저 집으세요.");
    if (!this.input.order) return fail("입력기에 주문서가 없습니다.");
    const chipIds = this.slots.filter((slot): slot is string => !!slot);
    if (!chipIds.includes("image-maker")) return fail("그림 제작기 칩을 슬롯에 꽂아야 생산할 수 있습니다.");

    this.pendingSpend = slotVramCost(this.slots);
    const projectedUsed = this.vramUsed + this.pendingSpend;
    const slowdown = produceSlowdownMultiplier(projectedUsed, this.round.vramBudget);
    const base = Math.max(0.8, this.estimateProcessingTime(this.input.order.orderId) * 0.35);
    const produceMul = Math.max(0.4, 1 - this.upgrades.produceTimeReduction);
    this.plannedProduceDuration = base * slowdown * produceMul;
    this.produceTimer = this.plannedProduceDuration;
    this.producing = true;
    const over = Math.max(0, projectedUsed - this.round.vramBudget);
    return ok(
      over > 0
        ? `생산 시작… VRAM +${this.pendingSpend} (예산 초과! 속도 ${slowdown.toFixed(1)}x)`
        : `생산 시작… VRAM +${this.pendingSpend}`,
      over > 0 ? "error" : "info",
    );
  }

  interactOutput(): KitchenActionResult {
    if (this.carry.kind !== "none") return fail("이미 무언가를 들고 있습니다.");
    if (!this.output.product) return fail("출구에 완성품이 없습니다.");
    this.carry = this.output.product;
    this.output.product = null;
    return ok("완성 이미지를 집었습니다. X로 확인하고 손님에게 전달하세요.", "info");
  }

  deliverToCustomer(customerId: string): KitchenActionResult {
    if (this.carry.kind !== "product") return fail("전달할 이미지가 없습니다.");
    const customer = this.customers.find((item) => item.id === customerId);
    if (!customer || customer.state !== "waiting") return fail("받을 손님이 없습니다.");
    if (this.carry.customerId !== customer.id) return fail("이 손님의 주문이 아닙니다. 다른 손님에게 가져가세요.");

    const product = this.carry;
    this.carry = emptyCarry();
    customer.state = "served";
    this.resolvedCustomers += 1;
    if (product.evaluation.passed) this.passedDeliveries += 1;
    else this.failedDeliveries += 1;
    this.spawnCooldown = Math.min(this.spawnCooldown, 0.4);

    const patienceRatio = customer.maxPatience > 0 ? customer.patience / customer.maxPatience : 0;
    const breakdown = computeDeliveryCredits({
      passed: product.evaluation.passed,
      perfect: product.evaluation.passed,
      patienceRatio,
    });
    const reward = breakdown.total;
    const result: KitchenActionResult = {
      ok: product.evaluation.passed,
      tone: product.evaluation.passed ? "success" : "error",
      message: product.evaluation.passed
        ? `납품 성공! +${reward} 크레딧`
        : "조건 미달 납품… +0 크레딧",
      delivered: {
        customerId: customer.id,
        reward,
        passed: product.evaluation.passed,
        breakdown,
        evaluation: product.evaluation,
        result: product.result,
      },
    };
    const finished = this.maybeFinishRound();
    if (finished) return { ...result, roundFinished: finished.roundFinished, message: `${result.message} · 라운드 종료!` };
    return result;
  }

  resetLine(): void {
    this.producing = false;
    this.produceTimer = 0;
    this.pendingSpend = 0;
    this.input.order = null;
    this.output.product = null;
    for (let i = 0; i < this.slots.length; i += 1) {
      const moduleId = this.slots[i];
      if (moduleId) this.returnChipToShelf(moduleId);
      this.slots[i] = null;
    }
    if (this.carry.kind === "moduleChip") {
      this.returnChipToShelf(this.carry.moduleId);
      this.carry = emptyCarry();
    } else if (this.carry.kind !== "none") {
      this.carry = emptyCarry();
    }
  }

  private canSpawnMore(): boolean {
    return this.queueIndex < this.orderQueue.length;
  }

  private spawnCustomer(): void {
    if (!this.canSpawnMore() || this.getWaitingCustomers().length >= MAX_CUSTOMERS) return;
    const orderId = this.orderQueue[this.queueIndex]!;
    this.queueIndex += 1;
    this.customerSequence += 1;
    this.assignedOrderIds.push(orderId);
    const patience = DEFAULT_PATIENCE * (1 + this.upgrades.patienceBonus);
    this.customers.push({
      id: `customer-${this.customerSequence}`,
      orderId,
      prompt: pickPromptForOrder(orderId, this.customerSequence),
      patience,
      maxPatience: patience,
      state: "waiting",
      orderTaken: false,
    });
  }

  private estimateProcessingTime(orderId: string): number {
    const chipIds = this.slots.filter((slot): slot is string => !!slot);
    const order = ordersById.get(orderId) ?? this.order;
    return this.simulator.simulate(order, ["order-input", ...chipIds, "delivery-bay"]).processingTime;
  }

  private finishProduction(): KitchenActionResult | null {
    if (!this.input.order) return fail("생산할 주문서가 사라졌습니다.");
    const orderSlip = this.input.order;
    const chipIds = this.slots.filter((slot): slot is string => !!slot);
    const order = ordersById.get(orderSlip.orderId) ?? this.order;
    const result = this.simulator.simulate(order, ["order-input", ...chipIds, "delivery-bay"]);
    const evaluation = this.evaluator.evaluate(order, result);
    const spend = this.pendingSpend || slotVramCost(this.slots);
    this.vramUsed += spend;
    this.pendingSpend = 0;
    const product: CarryProduct = {
      kind: "product",
      orderId: orderSlip.orderId,
      customerId: orderSlip.customerId,
      prompt: orderSlip.prompt,
      result,
      evaluation,
      vramSpend: spend,
    };
    this.input.order = null;
    this.output.product = product;
    const over = Math.max(0, this.vramUsed - this.round.vramBudget);
    return ok(
      evaluation.passed
        ? `완성품 출구 도착! (누적 VRAM ${this.vramUsed}/${this.round.vramBudget})`
        : `이미지 출구 도착. 조건 부족 가능 (VRAM ${this.vramUsed}/${this.round.vramBudget}${over ? `, 초과 ${over}` : ""})`,
      evaluation.passed ? "success" : "info",
    );
  }

  private maybeFinishRound(): KitchenActionResult | null {
    if (this.roundFinished) return null;
    if (this.resolvedCustomers < this.round.targetCustomers) return null;
    this.roundFinished = true;
    return {
      ok: true,
      tone: "success",
      message: "라운드 종료! 효율 점수를 확인하세요.",
      roundFinished: this.getStats(),
    };
  }

  private clearCustomerWork(customerId: string): void {
    if (this.carry.kind === "order" && this.carry.customerId === customerId) this.carry = emptyCarry();
    if (this.carry.kind === "product" && this.carry.customerId === customerId) this.carry = emptyCarry();
    if (this.input.order?.customerId === customerId) {
      this.input.order = null;
      // Abort in-flight production tied to the left customer's order slip.
      if (this.producing) {
        this.producing = false;
        this.produceTimer = 0;
        this.pendingSpend = 0;
      }
    }
    if (this.output.product?.customerId === customerId) this.output.product = null;
    for (let i = this.floorItems.length - 1; i >= 0; i -= 1) {
      const item = this.floorItems[i]!.item;
      if ((item.kind === "order" || item.kind === "product") && item.customerId === customerId) {
        this.floorItems.splice(i, 1);
      }
    }
  }

  private returnChipToShelf(moduleId: string): void {
    if (!this.unlockedModuleIds.includes(moduleId)) return;
    if (this.shelfModuleIds.includes(moduleId)) return;
    this.shelfModuleIds = [...this.shelfModuleIds, moduleId];
  }
}

function carryObjectLabel(kind: "order" | "moduleChip" | "product"): string {
  if (kind === "order") return "주문서를";
  if (kind === "moduleChip") return "모듈 칩을";
  return "이미지를";
}

function ok(message: string, tone: "info" | "success" | "error" = "info"): KitchenActionResult {
  return { ok: true, message, tone };
}

function fail(message: string): KitchenActionResult {
  return { ok: false, message, tone: "error" };
}
