import Phaser from "phaser";
import { ConnectionValidator } from "../core/graph/ConnectionValidator";
import { GameSession } from "../core/GameSession";
import type { FactorySnapshot, ModuleDefinition, ModuleInstance, PortDataType, PortDefinition } from "../core/types";
import { modulesById } from "../data/modules";
import { GameEventBus } from "./events/GameEventBus";

type SceneEvents = {
  graphChanged: FactorySnapshot;
  moduleSelected: string | undefined;
  notice: { message: string; tone?: "error" | "info" };
};

type ActivePort = { instanceId: string; portId: string };

const PORT_COLORS: Record<PortDataType, number> = { order: 0x23b5c5, textCondition: 0x23b5c5, style: 0x9467df, composition: 0x3b82f6, image: 0xf2a900, evaluatedImage: 0x34a576, finalProduct: 0x34a576 };

export class FactoryScene extends Phaser.Scene {
  readonly eventBus = new GameEventBus<SceneEvents>();
  private session: GameSession | undefined;
  private readonly moduleViews = new Map<string, ModuleView>();
  private grid!: Phaser.GameObjects.Graphics;
  private connections!: Phaser.GameObjects.Graphics;
  private transientLine!: Phaser.GameObjects.Graphics;
  private activePort: ActivePort | undefined;
  private selectedInstanceId: string | undefined;
  private panOrigin: { x: number; y: number; scrollX: number; scrollY: number } | undefined;

  constructor() { super("Factory"); }

  create(): void {
    this.cameras.main.setBackgroundColor("#102b46");
    this.grid = this.add.graphics(); this.connections = this.add.graphics(); this.transientLine = this.add.graphics();
    this.drawGrid();
    this.scale.on("resize", () => this.drawGrid());
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    this.input.on("pointerup", () => { if (this.activePort) this.cancelPortDrag(); this.panOrigin = undefined; });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[]) => {
      if (pointer.middleButtonDown() || objects.length === 0) this.panOrigin = { x: pointer.x, y: pointer.y, scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY };
    });
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      const camera = this.cameras.main; camera.setZoom(Phaser.Math.Clamp(camera.zoom - deltaY * 0.001, 0.6, 1.35));
    });
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (event.key === "Escape") this.cancelPortDrag();
      if (event.key === "Delete") this.removeSelected();
      if (event.ctrlKey && event.key.toLowerCase() === "z") { event.preventDefault(); this.undo(); }
    });
    this.game.events.emit("factory-ready", this);
  }

  loadSession(session: GameSession): void {
    this.session = session; this.selectedInstanceId = undefined; this.activePort = undefined; this.refresh();
    this.cameras.main.setScroll(0, 0); this.cameras.main.setZoom(1);
  }

  addModule(moduleId: string): void {
    if (!this.session) return;
    const index = this.session.graph.modules.length;
    const instance = this.session.addModule(moduleId, 150 + index * 160, 265);
    this.refresh(); this.select(instance.instanceId); this.notifyGraphChanged();
  }

  resetFactory(): void { if (!this.session) return; this.session.reset(); this.refresh(); this.notifyGraphChanged(); }
  undo(): void { if (!this.session) return; if (this.session.undo()) { this.refresh(); this.notifyGraphChanged(); } else this.eventBus.emit("notice", { message: "되돌릴 변경이 없습니다.", tone: "info" }); }

  getSelectedModule(): ModuleInstance | undefined { return this.selectedInstanceId ? this.session?.graph.getInstance(this.selectedInstanceId) : undefined; }

  async animatePipeline(instanceIds: string[]): Promise<void> {
    for (const instanceId of instanceIds) {
      const view = this.moduleViews.get(instanceId); if (!view) continue;
      await new Promise<void>((resolve) => this.tweens.add({ targets: view.container, scaleX: 1.08, scaleY: 1.08, duration: 180, yoyo: true, onComplete: () => resolve() }));
    }
  }

  private refresh(): void {
    if (!this.session) return;
    const live = new Set(this.session.graph.modules.map((module) => module.instanceId));
    for (const [id, view] of this.moduleViews) if (!live.has(id)) { view.destroy(); this.moduleViews.delete(id); }
    for (const instance of this.session.graph.modules) {
      const existing = this.moduleViews.get(instance.instanceId);
      if (existing) existing.setPosition(instance.x, instance.y);
      else {
        const definition = modulesById.get(instance.moduleId); if (!definition) continue;
        this.moduleViews.set(instance.instanceId, new ModuleView(this, instance, definition, {
          select: () => this.select(instance.instanceId),
          moveStart: () => this.session?.checkpoint(),
          move: (x, y) => this.moveModule(instance.instanceId, x, y),
          startPort: (portId) => this.beginPortDrag(instance.instanceId, portId),
          endPort: (portId) => this.finishPortDrag(instance.instanceId, portId),
        }));
      }
    }
    this.redrawConnections(); this.refreshHighlights();
  }

  private select(instanceId: string | undefined): void {
    this.selectedInstanceId = instanceId;
    for (const [id, view] of this.moduleViews) view.setSelected(id === instanceId);
    this.eventBus.emit("moduleSelected", instanceId);
  }

  private moveModule(instanceId: string, x: number, y: number): void {
    if (!this.session) return;
    const snappedX = Math.round(x / 16) * 16; const snappedY = Math.round(y / 16) * 16;
    this.session.moveModule(instanceId, snappedX, snappedY); this.moduleViews.get(instanceId)?.setPosition(snappedX, snappedY); this.redrawConnections(); this.notifyGraphChanged();
  }

  private beginPortDrag(instanceId: string, portId: string): void {
    if (!this.session || this.session.graph.getPort(instanceId, portId)?.direction !== "output") return;
    this.activePort = { instanceId, portId }; this.refreshHighlights();
  }

  private finishPortDrag(instanceId: string, portId: string): void {
    if (!this.session || !this.activePort) return;
    const active = this.activePort; this.activePort = undefined;
    const validation = ConnectionValidator.validate(this.session.graph, active.instanceId, active.portId, instanceId, portId);
    if (!validation.valid) this.eventBus.emit("notice", { message: validation.reason ?? "연결할 수 없습니다.", tone: "error" });
    else { this.session.connect(active.instanceId, active.portId, instanceId, portId); this.notifyGraphChanged(); }
    this.transientLine.clear(); this.redrawConnections(); this.refreshHighlights();
  }

  private cancelPortDrag(): void { this.activePort = undefined; this.transientLine.clear(); this.refreshHighlights(); }

  private removeSelected(): void {
    if (!this.session || !this.selectedInstanceId) return;
    this.session.removeModule(this.selectedInstanceId); this.select(undefined); this.refresh(); this.notifyGraphChanged();
  }

  private redrawConnections(): void {
    this.connections.clear(); if (!this.session) return;
    for (const edge of this.session.graph.connections) {
      const from = this.moduleViews.get(edge.fromInstanceId)?.getPortPosition(edge.fromPortId); const to = this.moduleViews.get(edge.toInstanceId)?.getPortPosition(edge.toPortId); const type = this.session.graph.getPort(edge.fromInstanceId, edge.fromPortId)?.dataType;
      if (!from || !to || !type) continue;
      this.connections.lineStyle(4, PORT_COLORS[type], 0.95); this.connections.beginPath(); this.connections.moveTo(from.x, from.y); this.connections.lineTo(to.x, to.y); this.connections.strokePath();
    }
  }

  private refreshHighlights(): void {
    for (const view of this.moduleViews.values()) {
      for (const port of view.ports) {
        const valid = this.activePort ? ConnectionValidator.validate(this.session!.graph, this.activePort.instanceId, this.activePort.portId, view.instanceId, port.definition.id).valid : false;
        port.setHighlighted(valid);
      }
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.panOrigin && pointer.isDown) { this.cameras.main.setScroll(this.panOrigin.scrollX - (pointer.x - this.panOrigin.x) / this.cameras.main.zoom, this.panOrigin.scrollY - (pointer.y - this.panOrigin.y) / this.cameras.main.zoom); return; }
    if (!this.activePort) return;
    const start = this.moduleViews.get(this.activePort.instanceId)?.getPortPosition(this.activePort.portId); if (!start) return;
    const target = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.transientLine.clear(); this.transientLine.lineStyle(3, 0xffffff, 0.65); this.transientLine.beginPath(); this.transientLine.moveTo(start.x, start.y); this.transientLine.lineTo(target.x, target.y); this.transientLine.strokePath();
  }

  private drawGrid(): void {
    this.grid.clear(); this.grid.lineStyle(1, 0x274963, 0.5);
    for (let x = -800; x <= 2400; x += 32) this.grid.lineBetween(x, -800, x, 1800);
    for (let y = -800; y <= 1800; y += 32) this.grid.lineBetween(-800, y, 2400, y);
  }

  private notifyGraphChanged(): void { if (this.session) this.eventBus.emit("graphChanged", this.session.snapshot()); }
}

class ModuleView {
  readonly container: Phaser.GameObjects.Container;
  readonly ports: PortView[] = [];
  private readonly body: Phaser.GameObjects.Rectangle;

  constructor(private readonly scene: FactoryScene, readonly instance: ModuleInstance, readonly definition: ModuleDefinition, private readonly callbacks: { select: () => void; moveStart: () => void; move: (x: number, y: number) => void; startPort: (portId: string) => void; endPort: (portId: string) => void }) {
    this.container = scene.add.container(instance.x, instance.y);
    this.body = scene.add.rectangle(0, 0, 148, 76, 0x173a58, 1).setStrokeStyle(3, 0x6e9ab8, 1).setInteractive({ useHandCursor: true });
    const icon = scene.add.text(-61, -22, definition.iconKey, { fontSize: "25px" });
    const name = scene.add.text(-25, -27, definition.displayName, { fontSize: "15px", color: "#eff9ff", fontStyle: "bold", wordWrap: { width: 88 } });
    const detail = scene.add.text(-61, 23, `${definition.processingTime ? `${definition.processingTime}초` : "즉시"} · ${definition.portHint}`, { fontSize: "11px", color: "#9fc1d7" });
    this.container.add([this.body, icon, name, detail]);
    this.body.on("pointerdown", () => callbacks.select());
    this.body.on("dragstart", () => callbacks.moveStart());
    this.body.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => callbacks.move(dragX, dragY));
    scene.input.setDraggable(this.body);
    this.addPorts();
  }

  setPosition(x: number, y: number): void { this.container.setPosition(x, y); }
  setSelected(value: boolean): void { this.body.setStrokeStyle(3, value ? 0x22d3ee : 0x6e9ab8, 1); }
  get instanceId(): string { return this.instance.instanceId; }
  getPortPosition(portId: string): Phaser.Math.Vector2 | undefined { const port = this.ports.find((item) => item.definition.id === portId); return port ? new Phaser.Math.Vector2(this.container.x + port.dot.x, this.container.y + port.dot.y) : undefined; }
  destroy(): void { this.container.destroy(true); }

  private addPorts(): void {
    const add = (ports: PortDefinition[], direction: "input" | "output") => ports.forEach((port, index) => {
      const x = direction === "input" ? -74 : 74; const y = -17 + index * 28;
      const dot = this.scene.add.circle(x, y, 10, PORT_COLORS[port.dataType], 1).setStrokeStyle(2, 0xffffff, 0.7).setInteractive({ useHandCursor: true });
      dot.on("pointerdown", () => { if (port.direction === "output") this.callbacks.startPort(port.id); });
      dot.on("pointerup", () => { if (port.direction === "input") this.callbacks.endPort(port.id); });
      this.container.add(dot); this.ports.push(new PortView(port, dot));
    });
    add(this.definition.inputPorts, "input"); add(this.definition.outputPorts, "output");
  }
}

class PortView {
  constructor(readonly definition: PortDefinition, readonly dot: Phaser.GameObjects.Arc) {}
  setHighlighted(value: boolean): void { this.dot.setScale(value ? 1.45 : 1); this.dot.setStrokeStyle(value ? 3 : 2, value ? 0xf7d047 : 0xffffff, value ? 1 : 0.7); }
}
