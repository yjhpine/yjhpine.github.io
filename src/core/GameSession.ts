import { ordersById } from "../data/orders";
import { DEFAULT_MODULE_POSITIONS, isDefaultModuleId } from "./defaults";
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
    if (snapshot?.modules.length) this.graph.restore(snapshot);
    this.ensureDefaults();
  }

  get order(): OrderDefinition { return this._order; }

  setOrder(orderId: string): void {
    this._order = ordersById.get(orderId) ?? this._order;
    this.reset();
  }

  addModule(moduleId: string, x: number, y: number): ModuleInstance {
    if (isDefaultModuleId(moduleId)) throw new Error("입력기와 배송대는 기본 장치라서 추가로 배치할 수 없습니다.");
    this.remember();
    return this.graph.addModule(moduleId, x, y);
  }

  checkpoint(): void { this.remember(); }

  moveModule(instanceId: string, x: number, y: number): boolean {
    return this.graph.moveModule(instanceId, x, y);
  }

  removeModule(instanceId: string): boolean {
    if (this.isDefaultInstance(instanceId)) return false;
    this.remember();
    return this.graph.removeModule(instanceId);
  }

  connect(fromInstanceId: string, fromPortId: string, toInstanceId: string, toPortId: string): ModuleConnection {
    this.remember();
    return this.graph.addConnection(fromInstanceId, fromPortId, toInstanceId, toPortId);
  }

  undo(): boolean {
    const previous = this.history.pop();
    if (!previous) return false;
    this.graph.restore(previous);
    this.ensureDefaults();
    return true;
  }

  reset(): void {
    this.history = [];
    this.graph.clear();
    this.seedDefaults();
  }

  execute(): PipelineExecution { return this.executor.execute(this.graph, this.order); }
  snapshot(): FactorySnapshot { return this.graph.snapshot(); }

  isDefaultInstance(instanceId: string): boolean {
    const instance = this.graph.getInstance(instanceId);
    return !!instance && isDefaultModuleId(instance.moduleId);
  }

  private remember(): void {
    this.history.push(this.graph.snapshot());
    if (this.history.length > 10) this.history.shift();
  }

  private seedDefaults(): void {
    for (const [moduleId, position] of Object.entries(DEFAULT_MODULE_POSITIONS)) {
      this.graph.addModule(moduleId, position.x, position.y);
    }
  }

  /** Keep input/delivery present even when restoring older snapshots. */
  private ensureDefaults(): void {
    for (const [moduleId, position] of Object.entries(DEFAULT_MODULE_POSITIONS)) {
      if (this.graph.modules.some((module) => module.moduleId === moduleId)) continue;
      this.graph.addModule(moduleId, position.x, position.y);
    }
  }
}
