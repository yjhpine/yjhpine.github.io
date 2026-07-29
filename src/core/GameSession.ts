import { ordersById } from "../data/orders";
import { FactoryGraph } from "./graph/FactoryGraph";
import { PipelineExecutor, type PipelineExecution } from "./pipeline/PipelineExecutor";
import type { FactorySnapshot, ModuleConnection, ModuleInstance, OrderDefinition } from "./types";

export class GameSession {
  readonly graph = new FactoryGraph();
  private readonly executor = new PipelineExecutor();
  private history: FactorySnapshot[] = [];
  private _order: OrderDefinition;

  constructor(orderId: string, snapshot?: FactorySnapshot) {
    this._order = ordersById.get(orderId) ?? ordersById.get("o01")!;
    if (snapshot) this.graph.restore(snapshot);
  }

  get order(): OrderDefinition { return this._order; }
  setOrder(orderId: string): void { this._order = ordersById.get(orderId) ?? this._order; this.reset(); }
  addModule(moduleId: string, x: number, y: number): ModuleInstance { this.remember(); return this.graph.addModule(moduleId, x, y); }
  checkpoint(): void { this.remember(); }
  moveModule(instanceId: string, x: number, y: number): boolean { return this.graph.moveModule(instanceId, x, y); }
  removeModule(instanceId: string): boolean { this.remember(); return this.graph.removeModule(instanceId); }
  connect(fromInstanceId: string, fromPortId: string, toInstanceId: string, toPortId: string): ModuleConnection { this.remember(); return this.graph.addConnection(fromInstanceId, fromPortId, toInstanceId, toPortId); }
  undo(): boolean { const previous = this.history.pop(); if (!previous) return false; this.graph.restore(previous); return true; }
  reset(): void { this.history = []; this.graph.clear(); }
  execute(): PipelineExecution { return this.executor.execute(this.graph, this.order); }
  snapshot(): FactorySnapshot { return this.graph.snapshot(); }

  private remember(): void { this.history.push(this.graph.snapshot()); if (this.history.length > 10) this.history.shift(); }
}
