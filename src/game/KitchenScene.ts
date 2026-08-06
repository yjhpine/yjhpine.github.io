import Phaser from "phaser";
import { KitchenSession } from "../core/kitchen/KitchenSession";
import type { CarryItem, KitchenActionResult, RoundStats } from "../core/kitchen/types";
import { modulesById } from "../data/modules";
import { GameEventBus } from "./events/GameEventBus";

type SceneEvents = {
  notice: { message: string; tone?: "error" | "info" | "success" };
  sessionChanged: void;
  delivered: NonNullable<KitchenActionResult["delivered"]>;
  customerLeft: string;
  inspectToggle: void;
  roundFinished: RoundStats;
};

type InteractTarget =
  | { kind: "customer"; id: string }
  | { kind: "input" }
  | { kind: "produce" }
  | { kind: "output" }
  | { kind: "slot"; index: number }
  | { kind: "shelf"; moduleId: string }
  | { kind: "floor"; id: string };

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
const PLAYER_SCALE = 3;
const PLAYER_FRAME = 32;
const FACTORY = "/assets/factory";

const MODULE_SPRITE: Record<string, string> = {
  "image-maker": "module-image-maker",
  "style-processor": "module-style-processor",
  "ban-list": "module-ban-list",
  "composition-planner": "module-composition-planner",
  sharpener: "module-sharpener",
  "quality-checker": "module-quality-checker",
};

export class KitchenScene extends Phaser.Scene {
  readonly eventBus = new GameEventBus<SceneEvents>();
  private session: KitchenSession | undefined;
  private player!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private carryIcon!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private zones: StationZone[] = [];
  private zoneViews = new Map<string, Phaser.GameObjects.Container>();
  private customerViews = new Map<string, Phaser.GameObjects.Container>();
  private floorViews = new Map<string, Phaser.GameObjects.Container>();
  private highlight?: Phaser.GameObjects.Rectangle;
  private interactReady = true;
  private facingX = 0;
  private facingY = -1;
  private dashTimer = 0;
  private dashCooldown = 0;
  private dashDirX = 0;
  private dashDirY = -1;
  private isMoving = false;
  private currentAnimKey = "";

  constructor() { super("Kitchen"); }

  preload(): void {
    const player = "/assets/characters/PlayerAnim";
    this.load.spritesheet("cat-idle", `${player}/Cat_Idle.png`, { frameWidth: PLAYER_FRAME, frameHeight: PLAYER_FRAME });
    this.load.spritesheet("cat-walk", `${player}/Cat_Walk.png`, { frameWidth: PLAYER_FRAME, frameHeight: PLAYER_FRAME });
    this.load.spritesheet("cat-handle-idle", `${player}/Cat_Handle_Idle.png`, { frameWidth: PLAYER_FRAME, frameHeight: PLAYER_FRAME });
    this.load.spritesheet("cat-handle-walk", `${player}/Cat_Handle_Walk.png`, { frameWidth: PLAYER_FRAME, frameHeight: PLAYER_FRAME });

    this.load.image("box-floor", `${FACTORY}/Box_Floor.png`);
    this.load.image("conveyor", `${FACTORY}/conveyor.png`);
    this.load.image("counter", `${FACTORY}/counter.png`);
    this.load.image("station-input", `${FACTORY}/station-input.png`);
    this.load.image("station-slot", `${FACTORY}/station-slot.png`);
    this.load.image("station-produce", `${FACTORY}/station-produce.png`);
    this.load.image("station-output", `${FACTORY}/station-output.png`);
    this.load.image("customer", `${FACTORY}/customer.png`);
    this.load.image("module-locked", `${FACTORY}/module-locked.png`);
    this.load.image("drop-shadow", `${FACTORY}/drop-shadow.png`);
    for (const [moduleId, key] of Object.entries(MODULE_SPRITE)) {
      this.load.image(key, `${FACTORY}/module-${moduleId}.png`);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1a2a38");
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.setNearestFilter([
      "cat-idle", "cat-walk", "cat-handle-idle", "cat-handle-walk",
      "conveyor", "counter",
      "station-input", "station-slot", "station-produce", "station-output",
      "customer", "module-locked", "drop-shadow",
      ...Object.values(MODULE_SPRITE),
    ]);
    // Box_Floor is a detailed cardboard texture — keep bilinear sampling.
    if (this.textures.exists("box-floor")) {
      this.textures.get("box-floor").setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    this.drawFloor();
    this.buildStations();
    this.createPlayerAnimations();
    this.playerSprite = this.add.sprite(0, 0, "cat-idle", 0).setOrigin(0.5, 0.7);
    this.playerSprite.setScale(PLAYER_SCALE);
    this.playerSprite.setFlipX(false);
    this.carryIcon = this.add.text(0, -38, "", { fontSize: "16px", align: "center" }).setOrigin(0.5);
    this.player = this.add.container(MAP_W / 2, MAP_H * 0.62, [this.playerSprite, this.carryIcon]);
    this.player.setDepth(5);
    this.playPlayerAnim("player-idle");
    this.highlight = this.add.rectangle(0, 0, 10, 10, 0xf0c060, 0).setStrokeStyle(2, 0xf0c060, 0.95).setVisible(false);

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

  private setNearestFilter(keys: string[]): void {
    for (const key of keys) {
      if (this.textures.exists(key)) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  loadSession(session: KitchenSession): void {
    this.session = session;
    this.player.setPosition(MAP_W / 2, MAP_H * 0.62);
    this.refreshStationLabels();
    this.syncCustomers();
    this.syncFloorItems();
    this.syncCarryVisual();
    this.syncPlayerAnim();
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
    this.syncFloorItems();
    this.refreshStationLabels();
    this.syncCarryVisual();
    this.syncPlayerAnim();
    this.updateHighlight();
  }

  private createPlayerAnimations(): void {
    if (this.anims.exists("player-idle")) return;
    this.anims.create({ key: "player-idle", frames: this.anims.generateFrameNumbers("cat-idle", { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: "player-walk", frames: this.anims.generateFrameNumbers("cat-walk", { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: "player-handle-idle", frames: this.anims.generateFrameNumbers("cat-handle-idle", { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: "player-handle-walk", frames: this.anims.generateFrameNumbers("cat-handle-walk", { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
  }

  private playPlayerAnim(key: string): void {
    if (this.currentAnimKey === key) return;
    this.currentAnimKey = key;
    this.playerSprite.play(key, true);
  }

  private syncPlayerAnim(): void {
    const carrying = !!this.session && this.session.getCarry().kind !== "none";
    const moving = this.isMoving || this.dashTimer > 0;
    if (carrying) this.playPlayerAnim(moving ? "player-handle-walk" : "player-handle-idle");
    else this.playPlayerAnim(moving ? "player-walk" : "player-idle");
    // Right = flipped, left/idle = original sheet direction.
    this.playerSprite.setFlipX(this.facingX > 0);
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
    this.tweens.add({
      targets: this.player,
      scaleX: 1.12,
      scaleY: 0.9,
      duration: 80,
      yoyo: true,
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
    this.isMoving = false;
    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      vx = this.dashDirX * DASH_SPEED * dt;
      vy = this.dashDirY * DASH_SPEED * dt;
      this.isMoving = true;
    } else {
      const input = this.readMoveInput();
      if (input.x === 0 && input.y === 0) return;
      const len = Math.hypot(input.x, input.y);
      this.facingX = input.x / len;
      this.facingY = input.y / len;
      vx = this.facingX * SPEED * dt;
      vy = this.facingY * SPEED * dt;
      this.isMoving = true;
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
    const carry = this.session.getCarry();
    const target = this.nearestTarget({ includeFloor: carry.kind === "none" });
    let result: KitchenActionResult;
    if (target) {
      result = this.applyInteraction(target);
    } else if (carry.kind !== "none") {
      const dropX = Phaser.Math.Clamp(this.player.x + this.facingX * 28, 40, MAP_W - 40);
      const dropY = Phaser.Math.Clamp(this.player.y + this.facingY * 28, 100, MAP_H - 40);
      result = this.session.dropToFloor(dropX, dropY);
    } else {
      this.eventBus.emit("notice", { message: "근처에 상호작용할 대상이 없습니다.", tone: "info" });
      return;
    }
    this.handleSessionEvent(result);
    this.syncFloorItems();
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
      case "floor": return session.pickUpFromFloor(target.id);
    }
  }

  private handleSessionEvent(event: KitchenActionResult): void {
    if (event.message) this.eventBus.emit("notice", { message: event.message, tone: event.tone });
    if (event.delivered) this.eventBus.emit("delivered", event.delivered);
    if (event.leftCustomerId) this.eventBus.emit("customerLeft", event.leftCustomerId);
    if (event.roundFinished) this.eventBus.emit("roundFinished", event.roundFinished);
  }

  private nearestTarget(options: { includeFloor?: boolean } = {}): InteractTarget | undefined {
    const includeFloor = options.includeFloor ?? true;
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
    if (includeFloor && this.session) {
      for (const item of this.session.getFloorItems()) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
        if (dist > INTERACT_RANGE) continue;
        if (!best || dist < best.dist) best = { target: { kind: "floor", id: item.id }, dist };
      }
    }
    return best?.target;
  }

  private updateHighlight(): void {
    const carry = this.session?.getCarry();
    const target = this.nearestTarget({ includeFloor: !carry || carry.kind === "none" });
    if (!target || !this.highlight) { this.highlight?.setVisible(false); return; }
    let x = 0; let y = 0; let w = 40; let h = 40;
    if (target.kind === "customer") {
      const view = this.customerViews.get(target.id);
      if (!view) { this.highlight.setVisible(false); return; }
      x = view.x; y = view.y - 8; w = 64; h = 86;
    } else if (target.kind === "floor") {
      const item = this.session?.getFloorItems().find((entry) => entry.id === target.id);
      if (!item) { this.highlight.setVisible(false); return; }
      x = item.x; y = item.y; w = 36; h = 36;
    } else {
      const zone = this.zones.find((item) => JSON.stringify(item.target) === JSON.stringify(target));
      if (!zone) { this.highlight.setVisible(false); return; }
      x = zone.x; y = zone.y; w = zone.w + 8; h = zone.h + 8;
    }
    this.highlight.setPosition(x, y).setSize(w, h).setVisible(true);
  }

  private stationTexture(target: InteractTarget): string {
    if (target.kind === "input") return "station-input";
    if (target.kind === "produce") return "station-produce";
    if (target.kind === "output") return "station-output";
    if (target.kind === "slot") return "station-slot";
    if (target.kind === "shelf") return "module-locked";
    return "station-slot";
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
      this.zones.push({
        target: { kind: "shelf", moduleId },
        x,
        y: 430,
        w: 110,
        h: 64,
        label: modulesById.get(moduleId)?.displayName ?? moduleId,
      });
    });

    for (const zone of this.zones) {
      const key = JSON.stringify(zone.target);
      const scale = zone.target.kind === "shelf" ? 2.2 : 2;
      const body = this.add.image(0, -4, this.stationTexture(zone.target)).setScale(scale);
      const text = this.add
        .text(0, zone.target.kind === "shelf" ? 34 : 38, zone.label, {
          fontSize: "11px",
          color: "#fff8f0",
          align: "center",
          backgroundColor: "#3a2a1acc",
          padding: { x: 4, y: 2 },
          wordWrap: { width: zone.w + 8 },
        })
        .setOrigin(0.5);
      const container = this.add.container(zone.x, zone.y, [body, text]);
      container.setDepth(1);
      this.zoneViews.set(key, container);
    }

    this.add
      .text(MAP_W / 2, 22, "손님 카운터", {
        fontSize: "13px",
        color: "#fff8f0",
        backgroundColor: "#3a2a1acc",
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(2);
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
      const body = view.list[0] as Phaser.GameObjects.Image;
      const label = view.list[1] as Phaser.GameObjects.Text;

      if (zone.target.kind === "input") {
        body.setTexture("station-input");
        label.setText(input.order ? "입력기 · 📜" : "입력기");
      }
      if (zone.target.kind === "slot") {
        const moduleId = slots[zone.target.index];
        const spriteKey = moduleId ? MODULE_SPRITE[moduleId] : undefined;
        body.setTexture(spriteKey ?? "station-slot");
        label.setText(moduleId ? (modulesById.get(moduleId)?.displayName ?? moduleId) : `슬롯${zone.target.index + 1}`);
      }
      if (zone.target.kind === "produce") {
        body.setTexture("station-produce");
        label.setText(producing ? `생산 ${progress}%` : "생산");
      }
      if (zone.target.kind === "output") {
        body.setTexture("station-output");
        label.setText(output.product ? "출구 · 🖼️" : "출구");
      }
      if (zone.target.kind === "shelf") {
        const unlocked = this.session.getShelfModuleIds().includes(zone.target.moduleId);
        const spriteKey = MODULE_SPRITE[zone.target.moduleId] ?? "module-locked";
        body.setTexture(unlocked ? spriteKey : "module-locked");
        body.setAlpha(unlocked ? 1 : 0.55);
        const def = modulesById.get(zone.target.moduleId);
        label.setText(unlocked ? (def?.displayName ?? zone.target.moduleId) : "잠김");
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
      const y = 78;
      if (!view) {
        const sprite = this.add.image(0, 10, "customer").setScale(2.4).setOrigin(0.5, 0.85);
        const promptBubble = this.createPromptBubble(customer.prompt);
        const barBg = this.add.rectangle(0, 28, 50, 6, 0x2a1c12, 0.9);
        const bar = this.add.rectangle(-25, 28, 50, 6, 0xf0c060).setOrigin(0, 0.5);
        view = this.add.container(x, y, [sprite, promptBubble, barBg, bar]);
        view.setDepth(3);
        this.customerViews.set(customer.id, view);
      } else {
        view.setPosition(x, y);
      }
      const promptBubble = view.list[1] as Phaser.GameObjects.Container;
      this.updatePromptBubble(promptBubble, customer.prompt, !customer.orderTaken);
      const bar = view.list[3] as Phaser.GameObjects.Rectangle;
      const ratio = customer.patience / customer.maxPatience;
      bar.setSize(Math.max(2, 50 * ratio), 6);
      bar.setFillStyle(ratio < 0.3 ? 0xff6b6b : 0xf0c060);
    });
  }

  private createPromptBubble(prompt: string): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, 120, 18, 0x3a2a1a, 0.92).setStrokeStyle(1, 0xd7b48a, 0.95);
    const text = this.add.text(0, 0, "", {
      fontFamily: "IBM Plex Sans KR, Pretendard, sans-serif",
      fontSize: "11px",
      color: "#fff8f0",
    }).setOrigin(0.5);
    const bubble = this.add.container(0, -42, [bg, text]);
    this.updatePromptBubble(bubble, prompt, true);
    return bubble;
  }

  private updatePromptBubble(bubble: Phaser.GameObjects.Container, prompt: string, visible: boolean): void {
    const bg = bubble.list[0] as Phaser.GameObjects.Rectangle;
    const text = bubble.list[1] as Phaser.GameObjects.Text;
    text.setText(shortPrompt(prompt));
    const width = Phaser.Math.Clamp(text.width + 14, 72, 168);
    bg.setSize(width, 18);
    bubble.setVisible(visible);
  }

  private syncFloorItems(): void {
    if (!this.session) return;
    const items = this.session.getFloorItems();
    const live = new Set(items.map((item) => item.id));
    for (const [id, view] of this.floorViews) {
      if (!live.has(id)) { view.destroy(true); this.floorViews.delete(id); }
    }
    for (const item of items) {
      let view = this.floorViews.get(item.id);
      const glyph = carryGlyph(item.item);
      if (!view) {
        const shadow = this.add.image(0, 10, "drop-shadow").setScale(2).setAlpha(0.75);
        const icon = this.add.text(0, 0, glyph, { fontSize: "18px" }).setOrigin(0.5);
        view = this.add.container(item.x, item.y, [shadow, icon]);
        view.setDepth(1);
        this.floorViews.set(item.id, view);
        this.tweens.add({
          targets: icon,
          y: -3,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      } else {
        view.setPosition(item.x, item.y);
        const icon = view.list[1] as Phaser.GameObjects.Text;
        icon.setText(glyph);
      }
    }
  }

  private syncCarryVisual(): void {
    if (!this.session) return;
    this.carryIcon.setText(carryGlyph(this.session.getCarry()));
  }

  private drawFloor(): void {
    const floor = this.add.image(MAP_W / 2, MAP_H / 2, "box-floor").setDepth(-20);
    const tex = this.textures.get("box-floor").getSourceImage() as HTMLImageElement;
    const scale = Math.max(MAP_W / tex.width, MAP_H / tex.height);
    floor.setScale(scale);
    this.add.tileSprite(MAP_W / 2, 56, 840, 36, "counter").setOrigin(0.5).setDepth(-18);
    this.add.tileSprite(MAP_W / 2, 270, 700, 56, "conveyor").setOrigin(0.5).setDepth(-17);
    this.add.tileSprite(MAP_W / 2, 470, 860, 40, "counter").setOrigin(0.5).setDepth(-18);
  }
}

function carryGlyph(carry: CarryItem): string {
  if (carry.kind === "order") return "📜";
  if (carry.kind === "moduleChip") return modulesById.get(carry.moduleId)?.iconKey ?? "⬡";
  if (carry.kind === "product") return "🖼️";
  return "";
}

function shortPrompt(prompt: string, maxChars = 20): string {
  const oneLine = prompt.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxChars) return oneLine;
  return `${oneLine.slice(0, Math.max(1, maxChars - 1))}…`;
}
