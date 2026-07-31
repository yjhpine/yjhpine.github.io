import Phaser from "phaser";
import { KitchenSession } from "../core/kitchen/KitchenSession";
import type { CarryItem, KitchenActionResult } from "../core/kitchen/types";
import { modulesById } from "../data/modules";
import { GameEventBus } from "./events/GameEventBus";

type SceneEvents = {
  notice: { message: string; tone?: "error" | "info" | "success" };
  sessionChanged: void;
  delivered: NonNullable<KitchenActionResult["delivered"]>;
  customerLeft: string;
  inspectToggle: void;
};

type InteractTarget =
  | { kind: "customer"; id: string }
  | { kind: "input" }
  | { kind: "produce" }
  | { kind: "output" }
  | { kind: "slot"; index: number }
  | { kind: "shelf"; moduleId: string };

interface StationZone {
  target: InteractTarget;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

const SPEED = 220;
const DASH_SPEED = 780;
const DASH_DURATION = 0.12;
const DASH_COOLDOWN = 0.55;
const INTERACT_RANGE = 70;
const MAP_W = 960;
const MAP_H = 540;

export class KitchenScene extends Phaser.Scene {
  readonly eventBus = new GameEventBus<SceneEvents>();
  private session: KitchenSession | undefined;
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Rectangle;
  private carryIcon!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private zones: StationZone[] = [];
  private zoneViews = new Map<string, Phaser.GameObjects.Container>();
  private customerViews = new Map<string, Phaser.GameObjects.Container>();
  private highlight?: Phaser.GameObjects.Rectangle;
  private floor!: Phaser.GameObjects.Graphics;
  private interactReady = true;
  private facingX = 0;
  private facingY = -1;
  private dashTimer = 0;
  private dashCooldown = 0;
  private dashDirX = 0;
  private dashDirY = -1;

  constructor() { super("Kitchen"); }

  create(): void {
    this.cameras.main.setBackgroundColor("#0b2137");
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.floor = this.add.graphics();
    this.drawFloor();
    this.buildStations();
    this.playerBody = this.add.rectangle(0, 0, 28, 36, 0xf7d047).setStrokeStyle(2, 0xffffff, 0.9);
    this.carryIcon = this.add.text(0, -34, "", { fontSize: "18px", align: "center" }).setOrigin(0.5);
    const face = this.add.text(0, -2, "🙂", { fontSize: "16px" }).setOrigin(0.5);
    this.player = this.add.container(MAP_W / 2, MAP_H * 0.62, [this.playerBody, face, this.carryIcon]);
    this.highlight = this.add.rectangle(0, 0, 10, 10, 0x22d3ee, 0).setStrokeStyle(2, 0x22d3ee, 0.9).setVisible(false);

    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keyW = keyboard.addKey("W");
    this.keyA = keyboard.addKey("A");
    this.keyS = keyboard.addKey("S");
    this.keyD = keyboard.addKey("D");
    keyboard.on("keydown-Z", () => this.tryInteract());
    keyboard.on("keydown-X", () => this.eventBus.emit("inspectToggle", undefined));
    keyboard.on("keydown-C", () => this.tryDash());

    this.game.events.emit("kitchen-ready", this);
  }

  loadSession(session: KitchenSession): void {
    this.session = session;
    this.player.setPosition(MAP_W / 2, MAP_H * 0.62);
    this.refreshStationLabels();
    this.syncCustomers();
    this.syncCarryVisual();
    this.eventBus.emit("sessionChanged", undefined);
  }

  getSession(): KitchenSession | undefined { return this.session; }

  update(_time: number, delta: number): void {
    if (!this.session) return;
    const dt = delta / 1000;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.movePlayer(dt);
    for (const event of this.session.tick(dt)) this.handleSessionEvent(event);
    this.syncCustomers();
    this.refreshStationLabels();
    this.syncCarryVisual();
    this.updateHighlight();
  }

  private tryDash(): void {
    if (!this.session || this.dashCooldown > 0 || this.dashTimer > 0) return;
    const input = this.readMoveInput();
    if (input.x !== 0 || input.y !== 0) {
      const len = Math.hypot(input.x, input.y);
      this.dashDirX = input.x / len;
      this.dashDirY = input.y / len;
      this.facingX = this.dashDirX;
      this.facingY = this.dashDirY;
    } else {
      this.dashDirX = this.facingX;
      this.dashDirY = this.facingY;
    }
    this.dashTimer = DASH_DURATION;
    this.dashCooldown = DASH_COOLDOWN;
    this.playerBody.setFillStyle(0xffffff);
    this.tweens.add({
      targets: this.player,
      scaleX: 1.12,
      scaleY: 0.9,
      duration: 80,
      yoyo: true,
      onComplete: () => this.playerBody.setFillStyle(0xf7d047),
    });
  }

  private readMoveInput(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.cursors.left.isDown || this.keyA.isDown) x -= 1;
    if (this.cursors.right.isDown || this.keyD.isDown) x += 1;
    if (this.cursors.up.isDown || this.keyW.isDown) y -= 1;
    if (this.cursors.down.isDown || this.keyS.isDown) y += 1;
    return { x, y };
  }

  private movePlayer(dt: number): void {
    let vx = 0;
    let vy = 0;
    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      vx = this.dashDirX * DASH_SPEED * dt;
      vy = this.dashDirY * DASH_SPEED * dt;
    } else {
      const input = this.readMoveInput();
      if (input.x === 0 && input.y === 0) return;
      const len = Math.hypot(input.x, input.y);
      this.facingX = input.x / len;
      this.facingY = input.y / len;
      vx = this.facingX * SPEED * dt;
      vy = this.facingY * SPEED * dt;
    }
    let nx = Phaser.Math.Clamp(this.player.x + vx, 30, MAP_W - 30);
    let ny = Phaser.Math.Clamp(this.player.y + vy, 80, MAP_H - 30);
    for (const zone of this.zones) {
      if (zone.target.kind === "customer" || zone.target.kind === "shelf") continue;
      const near = Math.abs(nx - zone.x) < zone.w / 2 + 16 && Math.abs(ny - zone.y) < zone.h / 2 + 16;
      if (near) {
        const pushX = nx - zone.x;
        const pushY = ny - zone.y;
        if (Math.abs(pushX) > Math.abs(pushY)) nx = zone.x + Math.sign(pushX || 1) * (zone.w / 2 + 16);
        else ny = zone.y + Math.sign(pushY || 1) * (zone.h / 2 + 16);
      }
    }
    this.player.setPosition(nx, ny);
  }

  private tryInteract(): void {
    if (!this.session || !this.interactReady) return;
    this.interactReady = false;
    this.time.delayedCall(120, () => { this.interactReady = true; });
    const target = this.nearestTarget();
    if (!target) {
      this.eventBus.emit("notice", { message: "근처에 상호작용할 대상이 없습니다.", tone: "info" });
      return;
    }
    const result = this.applyInteraction(target);
    this.handleSessionEvent(result);
    this.eventBus.emit("sessionChanged", undefined);
  }

  private applyInteraction(target: InteractTarget): KitchenActionResult {
    const session = this.session!;
    switch (target.kind) {
      case "customer": {
        const carry = session.getCarry();
        if (carry.kind === "product") return session.deliverToCustomer(target.id);
        return session.pickUpFromCustomer(target.id);
      }
      case "input": return session.interactInput();
      case "produce": return session.startProduce();
      case "output": return session.interactOutput();
      case "slot": return session.interactSlot(target.index);
      case "shelf": return session.pickUpFromShelf(target.moduleId);
    }
  }

  private handleSessionEvent(event: KitchenActionResult): void {
    if (event.message) this.eventBus.emit("notice", { message: event.message, tone: event.tone });
    if (event.delivered) this.eventBus.emit("delivered", event.delivered);
    if (event.leftCustomerId) this.eventBus.emit("customerLeft", event.leftCustomerId);
  }

  private nearestTarget(): InteractTarget | undefined {
    let best: { target: InteractTarget; dist: number } | undefined;
    for (const zone of this.zones) {
      if (zone.target.kind === "shelf" && this.session && !this.session.getShelfModuleIds().includes(zone.target.moduleId)) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, zone.x, zone.y);
      if (dist > INTERACT_RANGE) continue;
      if (!best || dist < best.dist) best = { target: zone.target, dist };
    }
    for (const [id, view] of this.customerViews) {
      const customer = this.session?.getCustomers().find((item) => item.id === id);
      if (!customer || customer.state !== "waiting") continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, view.x, view.y);
      if (dist > INTERACT_RANGE) continue;
      if (!best || dist < best.dist) best = { target: { kind: "customer", id }, dist };
    }
    return best?.target;
  }

  private updateHighlight(): void {
    const target = this.nearestTarget();
    if (!target || !this.highlight) { this.highlight?.setVisible(false); return; }
    let x = 0; let y = 0; let w = 40; let h = 40;
    if (target.kind === "customer") {
      const view = this.customerViews.get(target.id);
      if (!view) { this.highlight.setVisible(false); return; }
      x = view.x; y = view.y; w = 54; h = 70;
    } else {
      const zone = this.zones.find((item) => JSON.stringify(item.target) === JSON.stringify(target));
      if (!zone) { this.highlight.setVisible(false); return; }
      x = zone.x; y = zone.y; w = zone.w + 8; h = zone.h + 8;
    }
    this.highlight.setPosition(x, y).setSize(w, h).setVisible(true);
  }

  private buildStations(): void {
    this.zones = [
      { target: { kind: "input" }, x: 220, y: 270, w: 100, h: 70, label: "입력기" },
      { target: { kind: "slot", index: 0 }, x: 360, y: 270, w: 78, h: 70, label: "슬롯1" },
      { target: { kind: "slot", index: 1 }, x: 460, y: 270, w: 78, h: 70, label: "슬롯2" },
      { target: { kind: "slot", index: 2 }, x: 560, y: 270, w: 78, h: 70, label: "슬롯3" },
      { target: { kind: "produce" }, x: 660, y: 270, w: 88, h: 70, label: "생산" },
      { target: { kind: "output" }, x: 780, y: 270, w: 100, h: 70, label: "출구" },
    ];

    const shelfModules = ["image-maker", "style-processor", "ban-list", "composition-planner", "sharpener", "quality-checker"];
    shelfModules.forEach((moduleId, index) => {
      const x = 120 + index * 130;
      this.zones.push({ target: { kind: "shelf", moduleId }, x, y: 430, w: 110, h: 64, label: modulesById.get(moduleId)?.displayName ?? moduleId });
    });

    for (const zone of this.zones) {
      const key = JSON.stringify(zone.target);
      const color = zone.target.kind === "shelf" ? 0x1e526e : zone.target.kind === "produce" ? 0x8a5a12 : 0x173a58;
      const body = this.add.rectangle(0, 0, zone.w, zone.h, color).setStrokeStyle(2, 0x6e9ab8, 1);
      const text = this.add.text(0, 0, zone.label, { fontSize: "12px", color: "#eaf8ff", align: "center", wordWrap: { width: zone.w - 8 } }).setOrigin(0.5);
      const container = this.add.container(zone.x, zone.y, [body, text]);
      this.zoneViews.set(key, container);
    }

    // Counter banner
    this.add.rectangle(MAP_W / 2, 56, 820, 56, 0x12324a).setStrokeStyle(2, 0x3f6f89, 1);
    this.add.text(MAP_W / 2, 42, "손님 카운터", { fontSize: "14px", color: "#8ec6df" }).setOrigin(0.5);
  }

  private refreshStationLabels(): void {
    if (!this.session) return;
    const input = this.session.getInput();
    const slots = this.session.getSlots();
    const output = this.session.getOutput();
    const producing = this.session.isProducing();
    const progress = Math.floor(this.session.getProduceProgress() * 100);

    for (const zone of this.zones) {
      const view = this.zoneViews.get(JSON.stringify(zone.target));
      if (!view) continue;
      const label = view.list[1] as Phaser.GameObjects.Text;
      const body = view.list[0] as Phaser.GameObjects.Rectangle;
      if (zone.target.kind === "input") label.setText(input.order ? "입력기\n📜" : "입력기");
      if (zone.target.kind === "slot") {
        const moduleId = slots[zone.target.index];
        const icon = moduleId ? modulesById.get(moduleId)?.iconKey ?? "?" : "·";
        label.setText(`슬롯${zone.target.index + 1}\n${icon}`);
      }
      if (zone.target.kind === "produce") label.setText(producing ? `생산중\n${progress}%` : "생산 ▶");
      if (zone.target.kind === "output") label.setText(output.product ? "출구\n🖼️" : "출구");
      if (zone.target.kind === "shelf") {
        const unlocked = this.session.getShelfModuleIds().includes(zone.target.moduleId);
        body.setAlpha(unlocked ? 1 : 0.35);
        const def = modulesById.get(zone.target.moduleId);
        label.setText(unlocked ? `${def?.iconKey ?? ""}\n${def?.displayName ?? ""}` : "잠김");
      }
    }
  }

  private syncCustomers(): void {
    if (!this.session) return;
    const waiting = this.session.getWaitingCustomers();
    const live = new Set(waiting.map((customer) => customer.id));
    for (const [id, view] of this.customerViews) {
      if (!live.has(id)) { view.destroy(true); this.customerViews.delete(id); }
    }
    waiting.forEach((customer, index) => {
      let view = this.customerViews.get(customer.id);
      const x = 280 + index * 180;
      const y = 70;
      if (!view) {
        const body = this.add.rectangle(0, 8, 48, 56, 0x34a576).setStrokeStyle(2, 0xffffff, 0.7);
        const face = this.add.text(0, 0, "🧑", { fontSize: "22px" }).setOrigin(0.5);
        const slip = this.add.text(0, -28, customer.orderTaken ? "" : "📜", { fontSize: "16px" }).setOrigin(0.5);
        const barBg = this.add.rectangle(0, 42, 50, 6, 0x0a1d30);
        const bar = this.add.rectangle(-25, 42, 50, 6, 0xf7d047).setOrigin(0, 0.5);
        view = this.add.container(x, y, [body, face, slip, barBg, bar]);
        this.customerViews.set(customer.id, view);
      } else {
        view.setPosition(x, y);
      }
      const slip = view.list[2] as Phaser.GameObjects.Text;
      const bar = view.list[4] as Phaser.GameObjects.Rectangle;
      slip.setText(customer.orderTaken ? "" : "📜");
      const ratio = customer.patience / customer.maxPatience;
      bar.setSize(Math.max(2, 50 * ratio), 6);
      bar.setFillStyle(ratio < 0.3 ? 0xff6b6b : 0xf7d047);
    });
  }

  private syncCarryVisual(): void {
    if (!this.session) return;
    this.carryIcon.setText(carryGlyph(this.session.getCarry()));
  }

  private drawFloor(): void {
    this.floor.clear();
    this.floor.fillStyle(0x0d2740, 1);
    this.floor.fillRect(0, 0, MAP_W, MAP_H);
    this.floor.lineStyle(1, 0x1d4560, 0.55);
    for (let x = 0; x < MAP_W; x += 32) this.floor.lineBetween(x, 0, x, MAP_H);
    for (let y = 0; y < MAP_H; y += 32) this.floor.lineBetween(0, y, MAP_W, y);
    // production line path
    this.floor.fillStyle(0x143552, 1);
    this.floor.fillRoundedRect(160, 230, 680, 80, 12);
  }
}

function carryGlyph(carry: CarryItem): string {
  if (carry.kind === "order") return "📜";
  if (carry.kind === "moduleChip") return modulesById.get(carry.moduleId)?.iconKey ?? "⬡";
  if (carry.kind === "product") return "🖼️";
  return "";
}
