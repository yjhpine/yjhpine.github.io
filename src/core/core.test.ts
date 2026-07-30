import { describe, expect, it } from "vitest";
import { GenerationSimulator } from "./generation/GenerationSimulator";
import { KitchenSession } from "./kitchen/KitchenSession";
import { OrderEvaluator } from "./orders/OrderEvaluator";
import { ProgressionService } from "./progression/ProgressionService";
import { SaveService, type StorageAdapter } from "./save/SaveService";
import { ordersById } from "../data/orders";

describe("KitchenSession carry rules", () => {
  it("starts with a waiting customer and empty hands", () => {
    const session = new KitchenSession("o01", ["image-maker"]);
    expect(session.getCarry().kind).toBe("none");
    expect(session.getWaitingCustomers()).toHaveLength(1);
    expect(session.getSlots()).toEqual([null, null, null]);
  });

  it("picks up an order only with empty hands", () => {
    const session = new KitchenSession("o01", ["image-maker"]);
    const customerId = session.getWaitingCustomers()[0].id;
    expect(session.pickUpFromCustomer(customerId).ok).toBe(true);
    expect(session.getCarry().kind).toBe("order");
    expect(session.pickUpFromShelf("image-maker").ok).toBe(false);
  });

  it("rejects shelf pickup while carrying", () => {
    const session = new KitchenSession("o01", ["image-maker"]);
    const customerId = session.getWaitingCustomers()[0].id;
    session.pickUpFromCustomer(customerId);
    expect(session.pickUpFromShelf("image-maker")).toMatchObject({ ok: false });
  });

  it("places order into input and chips into slots", () => {
    const session = new KitchenSession("o01", ["image-maker"]);
    const customerId = session.getWaitingCustomers()[0].id;
    session.pickUpFromCustomer(customerId);
    expect(session.interactInput().ok).toBe(true);
    expect(session.getInput().order?.customerId).toBe(customerId);
    expect(session.pickUpFromShelf("image-maker").ok).toBe(true);
    expect(session.interactSlot(0).ok).toBe(true);
    expect(session.getSlots()[0]).toBe("image-maker");
  });

  it("cannot produce without input order", () => {
    const session = new KitchenSession("o01", ["image-maker"]);
    session.pickUpFromShelf("image-maker");
    session.interactSlot(0);
    expect(session.startProduce()).toMatchObject({ ok: false });
  });

  it("cannot produce without image-maker chip", () => {
    const session = new KitchenSession("o02", ["image-maker", "style-processor"]);
    const customerId = session.getWaitingCustomers()[0].id;
    session.pickUpFromCustomer(customerId);
    session.interactInput();
    session.pickUpFromShelf("style-processor");
    session.interactSlot(0);
    expect(session.startProduce()).toMatchObject({ ok: false });
  });

  it("produces a product onto the output tray", () => {
    const session = new KitchenSession("o01", ["image-maker"]);
    const customerId = session.getWaitingCustomers()[0].id;
    session.pickUpFromCustomer(customerId);
    session.interactInput();
    session.pickUpFromShelf("image-maker");
    session.interactSlot(0);
    expect(session.startProduce().ok).toBe(true);
    const events = session.tick(30);
    expect(events.some((event) => event.message?.includes("출구"))).toBe(true);
    expect(session.getOutput().product?.customerId).toBe(customerId);
  });

  it("rejects delivery to the wrong customer", () => {
    const session = new KitchenSession("o01", ["image-maker"]);
    const first = session.getWaitingCustomers()[0].id;
    session.pickUpFromCustomer(first);
    session.interactInput();
    session.pickUpFromShelf("image-maker");
    session.interactSlot(0);
    session.startProduce();
    session.tick(30);
    session.interactOutput();
    session.tick(10);
    const waiting = session.getWaitingCustomers().filter((customer) => customer.id !== first);
    if (waiting.length === 0) {
      // force another customer for the test
      session.tick(10);
    }
    const other = session.getWaitingCustomers().find((customer) => customer.id !== first);
    if (other) {
      expect(session.deliverToCustomer(other.id)).toMatchObject({ ok: false });
    }
    expect(session.deliverToCustomer(first).ok).toBe(true);
  });

  it("marks customer as left when patience runs out", () => {
    const session = new KitchenSession("o01", ["image-maker"]);
    const customerId = session.getWaitingCustomers()[0].id;
    const events = session.tick(60);
    expect(events.some((event) => event.leftCustomerId === customerId)).toBe(true);
    expect(session.getCustomers().find((customer) => customer.id === customerId)?.state).toBe("left");
  });
});

describe("Kitchen production routes", () => {
  const routes: Record<string, string[]> = {
    o01: ["image-maker"],
    o02: ["image-maker", "style-processor"],
    o03: ["image-maker", "ban-list"],
    o04: ["image-maker", "composition-planner"],
    o05: ["image-maker", "sharpener"],
    o06: ["image-maker", "quality-checker"],
  };

  it("passes evaluation for intended chip combinations", () => {
    const simulator = new GenerationSimulator();
    const evaluator = new OrderEvaluator();
    for (const [orderId, chips] of Object.entries(routes)) {
      const order = ordersById.get(orderId)!;
      const result = simulator.simulate(order, ["order-input", ...chips, "delivery-bay"]);
      expect(evaluator.evaluate(order, result).passed, orderId).toBe(true);
    }
  });
});

class MemoryStorage implements StorageAdapter {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

describe("SaveService", () => {
  it("restores defaults for a missing save", () => {
    const storage = new MemoryStorage();
    expect(new SaveService(storage).load().currentOrderId).toBe("o01");
  });

  it("restores defaults for a version-mismatched save", () => {
    const storage = new MemoryStorage();
    storage.setItem("ai-factory-save-v1", JSON.stringify({ version: 0 }));
    expect(new SaveService(storage).load().currentOrderId).toBe("o01");
  });

  it("persists progression data", () => {
    const storage = new MemoryStorage();
    const service = new SaveService(storage);
    const progression = ProgressionService.createDefault();
    progression.completeActiveOrder(100);
    service.save(progression);
    expect(service.load().credits).toBe(100);
  });
});
