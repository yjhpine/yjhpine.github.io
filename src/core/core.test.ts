import { describe, expect, it } from "vitest";
import { GameSession } from "./GameSession";
import { ConnectionValidator } from "./graph/ConnectionValidator";
import { FactoryGraph } from "./graph/FactoryGraph";
import { GenerationSimulator } from "./generation/GenerationSimulator";
import { OrderEvaluator } from "./orders/OrderEvaluator";
import { PipelineExecutor } from "./pipeline/PipelineExecutor";
import { ProgressionService } from "./progression/ProgressionService";
import { SaveService, type StorageAdapter } from "./save/SaveService";
import { ordersById } from "../data/orders";

function addBaseLine(graph: FactoryGraph): { order: string; maker: string; delivery: string } {
  const order = graph.addModule("order-input", 0, 0); const maker = graph.addModule("image-maker", 200, 0); const delivery = graph.addModule("delivery-bay", 400, 0);
  graph.addConnection(order.instanceId, "order-out", maker.instanceId, "order-in"); graph.addConnection(maker.instanceId, "image-out", delivery.instanceId, "image-in");
  return { order: order.instanceId, maker: maker.instanceId, delivery: delivery.instanceId };
}

describe("FactoryGraph and connection rules", () => {
  it("allows a compatible output-to-input connection", () => {
    const graph = new FactoryGraph(); const order = graph.addModule("order-input", 0, 0); const maker = graph.addModule("image-maker", 0, 0);
    expect(ConnectionValidator.validate(graph, order.instanceId, "order-out", maker.instanceId, "order-in")).toEqual({ valid: true });
  });

  it("rejects incompatible port data types", () => {
    const graph = new FactoryGraph(); const line = addBaseLine(graph); const style = graph.addModule("style-processor", 0, 0);
    expect(ConnectionValidator.validate(graph, line.order, "order-out", style.instanceId, "image-in").valid).toBe(false);
  });

  it("rejects duplicate input connections", () => {
    const graph = new FactoryGraph(); const line = addBaseLine(graph);
    expect(ConnectionValidator.validate(graph, line.maker, "image-out", line.delivery, "image-in").valid).toBe(false);
  });

  it("rejects self connections", () => {
    const graph = new FactoryGraph(); const style = graph.addModule("style-processor", 0, 0);
    expect(ConnectionValidator.validate(graph, style.instanceId, "image-out", style.instanceId, "image-in").valid).toBe(false);
  });

  it("rejects cyclic connections", () => {
    const graph = new FactoryGraph(); const maker = graph.addModule("image-maker", 0, 0); const style = graph.addModule("style-processor", 0, 0); const styleB = graph.addModule("style-processor", 0, 0);
    graph.addConnection(maker.instanceId, "image-out", style.instanceId, "image-in");
    graph.addConnection(style.instanceId, "image-out", styleB.instanceId, "image-in");
    expect(ConnectionValidator.validate(graph, styleB.instanceId, "image-out", style.instanceId, "image-in")).toMatchObject({ valid: false, reason: "순환하는 생산 라인은 만들 수 없습니다." });
  });

  it("removes related connections when a module is removed", () => {
    const graph = new FactoryGraph(); const line = addBaseLine(graph);
    graph.removeModule(line.maker);
    expect(graph.connections).toHaveLength(0);
  });
});

describe("Pipeline execution", () => {
  it("rejects a pipeline without a delivery path", () => {
    const session = new GameSession("o01"); const order = session.addModule("order-input", 0, 0); const maker = session.addModule("image-maker", 0, 0);
    session.connect(order.instanceId, "order-out", maker.instanceId, "order-in");
    expect(session.execute()).toMatchObject({ valid: false });
  });

  it("executes a valid production route", () => {
    const graph = new FactoryGraph(); addBaseLine(graph);
    const execution = new PipelineExecutor().execute(graph, ordersById.get("o01")!);
    expect(execution.valid).toBe(true); expect(execution.evaluation?.passed).toBe(true); expect(execution.result?.processingTime).toBe(4);
  });

  it("supports the intended production route for every MVP order", () => {
    const routes: Record<string, string[]> = {
      o01: ["order-input", "image-maker", "delivery-bay"],
      o02: ["order-input", "image-maker", "style-processor", "delivery-bay"],
      o03: ["order-input", "image-maker", "ban-list", "delivery-bay"],
      o04: ["order-input", "image-maker", "composition-planner", "delivery-bay"],
      o05: ["order-input", "image-maker", "sharpener", "delivery-bay"],
      o06: ["order-input", "image-maker", "quality-checker", "delivery-bay"],
    };
    for (const [orderId, route] of Object.entries(routes)) {
      const graph = new FactoryGraph(); const instances = route.map((moduleId) => graph.addModule(moduleId, 0, 0));
      graph.addConnection(instances[0].instanceId, "order-out", instances[1].instanceId, "order-in");
      for (let index = 1; index < instances.length - 1; index += 1) {
        const from = instances[index]; const to = instances[index + 1];
        graph.addConnection(from.instanceId, from.moduleId === "quality-checker" ? "evaluated-out" : "image-out", to.instanceId, from.moduleId === "quality-checker" ? "evaluated-in" : "image-in");
      }
      const execution = new PipelineExecutor().execute(graph, ordersById.get(orderId)!);
      expect(execution.evaluation?.passed, orderId).toBe(true);
    }
  });

  it("accumulates data-driven module effects", () => {
    const simulator = new GenerationSimulator(); const order = ordersById.get("o02")!;
    const first = simulator.simulate(order, ["order-input", "image-maker", "style-processor", "delivery-bay"]);
    expect(first.styleMatch).toBe(72); expect(first.processingTime).toBe(6);
  });

  it("returns the same result for the same pipeline", () => {
    const simulator = new GenerationSimulator(); const order = ordersById.get("o02")!;
    const first = simulator.simulate(order, ["order-input", "image-maker", "style-processor", "delivery-bay"]);
    const second = simulator.simulate(order, ["order-input", "image-maker", "style-processor", "delivery-bay"]);
    expect(first).toEqual(second);
  });

  it("evaluates a failed order with a recommendation", () => {
    const simulator = new GenerationSimulator(); const evaluator = new OrderEvaluator(); const order = ordersById.get("o02")!;
    const failed = evaluator.evaluate(order, simulator.simulate(order, ["order-input", "image-maker", "delivery-bay"]));
    expect(failed.passed).toBe(false); expect(failed.issues[0]?.recommendationModuleId).toBe("style-processor");
  });

  it("evaluates a successful order", () => {
    const simulator = new GenerationSimulator(); const evaluator = new OrderEvaluator(); const order = ordersById.get("o02")!;
    const passed = evaluator.evaluate(order, simulator.simulate(order, ["order-input", "image-maker", "style-processor", "delivery-bay"]));
    expect(passed.passed).toBe(true);
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
    const storage = new MemoryStorage(); const service = new SaveService(storage);
    expect(service.load().currentOrderId).toBe("o01");
  });

  it("restores defaults for a version-mismatched save", () => {
    const storage = new MemoryStorage(); const service = new SaveService(storage);
    storage.setItem("ai-factory-save-v1", JSON.stringify({ version: 0 }));
    expect(service.load().currentOrderId).toBe("o01");
  });

  it("persists progression data", () => {
    const storage = new MemoryStorage(); const service = new SaveService(storage); const progression = ProgressionService.createDefault();
    progression.completeActiveOrder(100); service.save(progression);
    expect(service.load().credits).toBe(100);
  });
});
