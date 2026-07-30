import { ordersById } from "../../data/orders";
import { GenerationSimulator } from "../generation/GenerationSimulator";
import { OrderEvaluator } from "../orders/OrderEvaluator";
import type { OrderDefinition } from "../types";
import {
  CHIP_MODULE_IDS,
  DEFAULT_PATIENCE,
  emptyCarry,
  MAX_CUSTOMERS,
  SLOT_COUNT,
  type CarryItem,
  type CarryProduct,
  type Customer,
  type InputStation,
  type KitchenActionResult,
  type OutputStation,
} from "./types";

export class KitchenSession {
  private readonly simulator = new GenerationSimulator();
  private readonly evaluator = new OrderEvaluator();
  private customerSequence = 0;
  private carry: CarryItem = emptyCarry();
  private readonly customers: Customer[] = [];
  private readonly input: InputStation = { order: null };
  private readonly slots: Array<string | null>;
  private readonly output: OutputStation = { product: null };
  private shelfModuleIds: string[];
  private producing = false;
  private produceTimer = 0;
  private spawnCooldown = 0;
  private readonly activeOrderId: string;

  constructor(orderId: string, unlockedModuleIds: string[], slotCount = SLOT_COUNT) {
    this.activeOrderId = orderId;
    this.slots = Array.from({ length: slotCount }, () => null);
    this.shelfModuleIds = unlockedModuleIds.filter((id) => (CHIP_MODULE_IDS as readonly string[]).includes(id));
    if (!this.shelfModuleIds.includes("image-maker")) this.shelfModuleIds = ["image-maker", ...this.shelfModuleIds];
    this.spawnCustomer();
  }

  get order(): OrderDefinition {
    return ordersById.get(this.activeOrderId) ?? ordersById.get("o01")!;
  }

  getCarry(): CarryItem { return this.carry; }
  getCustomers(): Customer[] { return this.customers.map((customer) => ({ ...customer })); }
  getWaitingCustomers(): Customer[] { return this.getCustomers().filter((customer) => customer.state === "waiting"); }
  getInput(): InputStation { return { order: this.input.order ? { ...this.input.order } : null }; }
  getSlots(): Array<string | null> { return [...this.slots]; }
  getOutput(): OutputStation { return { product: this.output.product ? { ...this.output.product, result: { ...this.output.product.result }, evaluation: { ...this.output.product.evaluation, issues: [...this.output.product.evaluation.issues] } } : null }; }
  getShelfModuleIds(): string[] { return [...this.shelfModuleIds]; }
  isProducing(): boolean { return this.producing; }
  getProduceProgress(): number {
    if (!this.producing) return 0;
    const total = Math.max(0.5, this.estimateProcessingTime());
    return 1 - this.produceTimer / total;
  }

  setUnlockedModules(moduleIds: string[]): void {
    this.shelfModuleIds = moduleIds.filter((id) => (CHIP_MODULE_IDS as readonly string[]).includes(id));
    if (!this.shelfModuleIds.includes("image-maker")) this.shelfModuleIds = ["image-maker", ...this.shelfModuleIds];
  }

  /** Advance patience / spawn / production timers. dt in seconds. */
  tick(dt: number): KitchenActionResult[] {
    const events: KitchenActionResult[] = [];
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
      customer.patience = Math.max(0, customer.patience - dt);
      if (customer.patience <= 0) {
        customer.state = "left";
        events.push({ ok: false, leftCustomerId: customer.id, message: "손님이 떠났습니다. 너무 오래 기다렸어요.", tone: "error" });
        this.clearCustomerWork(customer.id);
      }
    }

    this.spawnCooldown = Math.max(0, this.spawnCooldown - dt);
    if (this.spawnCooldown <= 0 && this.getWaitingCustomers().length < MAX_CUSTOMERS) {
      this.spawnCustomer();
      this.spawnCooldown = 8;
    }

    return events;
  }

  pickUpFromCustomer(customerId: string): KitchenActionResult {
    if (this.carry.kind !== "none") return fail("이미 무언가를 들고 있습니다.");
    const customer = this.customers.find((item) => item.id === customerId);
    if (!customer || customer.state !== "waiting") return fail("받을 손님이 없습니다.");
    if (customer.orderTaken) return fail("이미 이 손님의 주문서를 가져갔습니다.");
    customer.orderTaken = true;
    this.carry = { kind: "order", orderId: customer.orderId, customerId: customer.id };
    return ok("주문서를 집어 들었습니다. 입력기에 넣으세요.", "info");
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
    if (!this.shelfModuleIds.includes(moduleId)) return fail("아직 해금되지 않은 모듈입니다.");
    this.carry = { kind: "moduleChip", moduleId };
    return ok("모듈 칩을 집었습니다. 빈 슬롯에 꽂으세요.", "info");
  }

  interactSlot(index: number): KitchenActionResult {
    if (index < 0 || index >= this.slots.length) return fail("잘못된 슬롯입니다.");
    if (this.producing) return fail("생산 중에는 슬롯을 바꿀 수 없습니다.");
    const current = this.slots[index];
    if (this.carry.kind === "moduleChip") {
      if (current) return fail("슬롯이 비어 있지 않습니다. 먼저 칩을 빼세요.");
      this.slots[index] = this.carry.moduleId;
      this.carry = emptyCarry();
      return ok("모듈 칩을 슬롯에 꽂았습니다.", "info");
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
    this.producing = true;
    this.produceTimer = Math.max(0.8, this.estimateProcessingTime() * 0.35);
    return ok("생산을 시작했습니다…", "info");
  }

  interactOutput(): KitchenActionResult {
    if (this.carry.kind !== "none") return fail("이미 무언가를 들고 있습니다.");
    if (!this.output.product) return fail("출구에 완성품이 없습니다.");
    this.carry = this.output.product;
    this.output.product = null;
    return ok("완성 이미지를 집었습니다. 손님에게 전달하세요.", "info");
  }

  deliverToCustomer(customerId: string): KitchenActionResult {
    if (this.carry.kind !== "product") return fail("전달할 이미지가 없습니다.");
    const customer = this.customers.find((item) => item.id === customerId);
    if (!customer || customer.state !== "waiting") return fail("받을 손님이 없습니다.");
    if (this.carry.customerId !== customer.id) {
      return fail("이 손님의 주문이 아닙니다. 다른 손님에게 가져가세요.");
    }
    const product = this.carry;
    this.carry = emptyCarry();
    customer.state = "served";
    const reward = product.evaluation.passed ? this.order.reward : Math.floor(this.order.reward * 0.25);
    return {
      ok: product.evaluation.passed,
      tone: product.evaluation.passed ? "success" : "error",
      message: product.evaluation.passed ? `납품 성공! +${reward} 크레딧` : `조건 미달 납품… +${reward} 크레딧`,
      delivered: {
        customerId: customer.id,
        reward,
        passed: product.evaluation.passed,
        evaluation: product.evaluation,
        result: product.result,
      },
    };
  }

  /** Discard held chip back to nowhere (shelf is infinite supply). */
  discardCarryChip(): KitchenActionResult {
    if (this.carry.kind !== "moduleChip") return fail("버릴 모듈 칩이 없습니다.");
    this.carry = emptyCarry();
    return ok("모듈 칩을 내려놓았습니다.", "info");
  }

  resetLine(): void {
    this.producing = false;
    this.produceTimer = 0;
    this.input.order = null;
    this.output.product = null;
    for (let i = 0; i < this.slots.length; i += 1) this.slots[i] = null;
    if (this.carry.kind === "order" || this.carry.kind === "product" || this.carry.kind === "moduleChip") {
      this.carry = emptyCarry();
    }
  }

  private spawnCustomer(): void {
    if (this.getWaitingCustomers().length >= MAX_CUSTOMERS) return;
    this.customerSequence += 1;
    this.customers.push({
      id: `customer-${this.customerSequence}`,
      orderId: this.activeOrderId,
      patience: DEFAULT_PATIENCE,
      maxPatience: DEFAULT_PATIENCE,
      state: "waiting",
      orderTaken: false,
    });
  }

  private estimateProcessingTime(): number {
    const chipIds = this.slots.filter((slot): slot is string => !!slot);
    const pipeline = ["order-input", ...chipIds, "delivery-bay"];
    return this.simulator.simulate(this.order, pipeline).processingTime;
  }

  private finishProduction(): KitchenActionResult | null {
    if (!this.input.order) return fail("생산할 주문서가 사라졌습니다.");
    const orderSlip = this.input.order;
    const chipIds = this.slots.filter((slot): slot is string => !!slot);
    const pipeline = ["order-input", ...chipIds, "delivery-bay"];
    const result = this.simulator.simulate(this.order, pipeline);
    const evaluation = this.evaluator.evaluate(this.order, result);
    const product: CarryProduct = {
      kind: "product",
      orderId: orderSlip.orderId,
      customerId: orderSlip.customerId,
      result,
      evaluation,
    };
    this.input.order = null;
    this.output.product = product;
    return ok(evaluation.passed ? "완성품이 출구에 나왔습니다!" : "이미지가 나왔지만 조건이 부족할 수 있습니다.", evaluation.passed ? "success" : "info");
  }

  private clearCustomerWork(customerId: string): void {
    if (this.carry.kind === "order" && this.carry.customerId === customerId) this.carry = emptyCarry();
    if (this.carry.kind === "product" && this.carry.customerId === customerId) this.carry = emptyCarry();
    if (this.input.order?.customerId === customerId) this.input.order = null;
    if (this.output.product?.customerId === customerId) this.output.product = null;
  }
}

function ok(message: string, tone: "info" | "success" | "error" = "info"): KitchenActionResult {
  return { ok: true, message, tone };
}

function fail(message: string): KitchenActionResult {
  return { ok: false, message, tone: "error" };
}
