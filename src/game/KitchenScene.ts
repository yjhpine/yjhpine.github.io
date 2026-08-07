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
const CUE_RANGE = 160;
const MAP_W = 720;
const MAP_H = 720;
const PLAYER_SCALE = 3;
const PLAYER_FRAME = 32;
const ART = "/assets/art";

const MODULE_SPRITE: Record<string, string> = {
  "image-maker": "module-image-maker",
  "style-processor": "module-style-processor",
  "ban-list": "module-ban-list",
  "composition-planner": "module-composition-planner",
  sharpener: "module-sharpener",
  "quality-checker": "module-quality-checker",
};

const CUSTOMER_KINDS = ["rabbit", "dog", "hamster", "duck"] as const;

export class KitchenScene extends Phaser.Scene {
  readonly eventBus = new GameEventBus<SceneEvents>();
  private session: KitchenSession | undefined;
  private player!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private carryIcon!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private zones: StationZone[] = [];
  private zoneViews = new Map<string, Phaser.GameObjects.Container>();
  private stationLamps = new Map<string, Phaser.GameObjects.Image>();
  private slotAvailableCues = new Map<number, Phaser.GameObjects.Image>();
  private ghostViews = new Map<string, Phaser.GameObjects.Image>();
  private customerViews = new Map<string, Phaser.GameObjects.Container>();
  private floorViews = new Map<string, Phaser.GameObjects.Container>();
  private highlight?: Phaser.GameObjects.Image;
  private softGlow?: Phaser.GameObjects.Image;
  private interactHint?: Phaser.GameObjects.Image;
  private guideArrow?: Phaser.GameObjects.Image;
  private produceSpark?: Phaser.GameObjects.Sprite;
  private produceReadyMark?: Phaser.GameObjects.Image;
  private produceProgressFrame?: Phaser.GameObjects.Image;
  private produceProgressFill?: Phaser.GameObjects.Image;
  private completeBadge?: Phaser.GameObjects.Image;
  private outputProductPop?: Phaser.GameObjects.Image;
  private counterBell?: Phaser.GameObjects.Sprite;
  private interactReady = true;
  private facingX = 0;
  private facingY = -1;
  private dashTimer = 0;
  private dashCooldown = 0;
  private dashDirX = 0;
  private dashDirY = -1;
  private isMoving = false;
  private currentAnimKey = "";
  private wasProducing = false;

  constructor() { super("Kitchen"); }

  preload(): void {
    const player = "/assets/characters/PlayerAnim";
    this.load.spritesheet("cat-idle", `${player}/Cat_Idle.png`, { frameWidth: PLAYER_FRAME, frameHeight: PLAYER_FRAME });
    this.load.spritesheet("cat-walk", `${player}/Cat_Walk.png`, { frameWidth: PLAYER_FRAME, frameHeight: PLAYER_FRAME });
    this.load.spritesheet("cat-handle-idle", `${player}/Cat_Handle_Idle.png`, { frameWidth: PLAYER_FRAME, frameHeight: PLAYER_FRAME });
    this.load.spritesheet("cat-handle-walk", `${player}/Cat_Handle_Walk.png`, { frameWidth: PLAYER_FRAME, frameHeight: PLAYER_FRAME });

    this.load.image("floor-tile", `${ART}/environment/floor_tile.png`);
    this.load.image("floor-dash", `${ART}/environment/floor_dash.png`);
    this.load.image("floor-flow", `${ART}/environment/floor_flow.png`);
    this.load.image("wall-rim", `${ART}/environment/wall_rim.png`);
    this.load.image("counter-desk", `${ART}/environment/counter_desk.png`);
    this.load.image("conveyor-belt", `${ART}/environment/conveyor_belt.png`);

    this.load.image("station-input", `${ART}/stations/station_input.png`);
    this.load.image("station-input-filled", `${ART}/stations/station_input_filled.png`);
    this.load.image("station-slot", `${ART}/stations/station_slot_empty.png`);
    this.load.image("station-produce-idle", `${ART}/stations/station_produce_idle.png`);
    this.load.image("station-produce-busy", `${ART}/stations/station_produce_busy.png`);
    this.load.image("station-produce-done", `${ART}/stations/station_produce_done.png`);
    this.load.image("station-output-empty", `${ART}/stations/station_output_empty.png`);
    this.load.image("station-output-ready", `${ART}/stations/station_output_ready.png`);
    this.load.image("station-module-shelf", `${ART}/stations/station_module_shelf.png`);

    this.load.image("item-order", `${ART}/items/item_order.png`);
    this.load.image("item-product", `${ART}/items/item_product.png`);
    this.load.image("item-shadow", `${ART}/items/item_shadow.png`);

    this.load.image("module-locked", `${ART}/modules/module_locked.png`);
    for (const [moduleId, key] of Object.entries(MODULE_SPRITE)) {
      const file = moduleId.replace(/-/g, "_");
      this.load.image(key, `${ART}/modules/module_${file}.png`);
    }

    for (const kind of CUSTOMER_KINDS) {
      this.load.spritesheet(`customer-${kind}-idle`, `${ART}/customers/customer_${kind}_idle.png`, {
        frameWidth: 32,
        frameHeight: 40,
      });
      this.load.spritesheet(`customer-${kind}-anxious`, `${ART}/customers/customer_${kind}_anxious.png`, {
        frameWidth: 32,
        frameHeight: 40,
      });
    }

    this.load.image("prompt-bubble", `${ART}/ui/prompt_bubble.png`);
    this.load.image("patience-frame", `${ART}/ui/patience_frame.png`);
    this.load.image("interact-hint", `${ART}/ui/keycap_z.png`);
    this.load.image("highlight-frame", `${ART}/ui/highlight_frame.png`);
    this.load.image("soft-glow", `${ART}/ui/soft_glow.png`);
    this.load.image("guide-arrow", `${ART}/ui/guide_arrow.png`);
    this.load.image("slot-available", `${ART}/ui/slot_available.png`);
    this.load.image("ghost-order", `${ART}/ui/ghost_order.png`);
    this.load.image("ghost-chip", `${ART}/ui/ghost_chip.png`);
    this.load.image("ghost-product", `${ART}/ui/ghost_product.png`);
    this.load.image("progress-frame", `${ART}/ui/progress_frame.png`);
    this.load.image("progress-fill", `${ART}/ui/progress_fill.png`);
    this.load.image("complete-badge", `${ART}/ui/complete_badge.png`);
    this.load.image("order-icon-small", `${ART}/ui/order_icon_small.png`);
    this.load.image("customer-sweat", `${ART}/ui/customer_sweat.png`);
    this.load.image("status-lamp-off", `${ART}/ui/status_lamp_off.png`);
    this.load.image("status-lamp-on", `${ART}/ui/status_lamp_on.png`);
    this.load.image("status-lamp-busy", `${ART}/ui/status_lamp_busy.png`);
    this.load.image("status-lamp-ready", `${ART}/ui/status_lamp_ready.png`);
    this.load.image("status-lamp-warn", `${ART}/ui/status_lamp_warn.png`);

    this.load.image("fx-pickup", `${ART}/effects/fx_pickup.png`);
    this.load.image("fx-insert", `${ART}/effects/fx_insert.png`);
    this.load.image("fx-complete", `${ART}/effects/fx_complete.png`);
    this.load.image("fx-success", `${ART}/effects/fx_success.png`);
    this.load.image("fx-error", `${ART}/effects/fx_error.png`);
    this.load.image("fx-ready", `${ART}/effects/fx_ready.png`);
    this.load.image("fx-sparkle", `${ART}/effects/fx_sparkle.png`);

    this.load.spritesheet("produce-spark", `${ART}/effects/produce_spark_sheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet("counter-bell", `${ART}/effects/counter_bell_sheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#d6a86a");
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    const pixelKeys = [
      "cat-idle", "cat-walk", "cat-handle-idle", "cat-handle-walk",
      "floor-tile", "floor-dash", "floor-flow", "wall-rim", "counter-desk", "conveyor-belt",
      "station-input", "station-input-filled", "station-slot",
      "station-produce-idle", "station-produce-busy", "station-produce-done",
      "station-output-empty", "station-output-ready", "station-module-shelf",
      "item-order", "item-product", "item-shadow", "module-locked",
      ...Object.values(MODULE_SPRITE),
      ...CUSTOMER_KINDS.flatMap((kind) => [`customer-${kind}-idle`, `customer-${kind}-anxious`]),
      "prompt-bubble", "patience-frame", "interact-hint", "highlight-frame",
      "soft-glow", "guide-arrow", "slot-available",
      "ghost-order", "ghost-chip", "ghost-product",
      "progress-frame", "progress-fill", "complete-badge",
      "order-icon-small", "customer-sweat",
      "status-lamp-off", "status-lamp-on", "status-lamp-busy", "status-lamp-ready", "status-lamp-warn",
      "fx-pickup", "fx-insert", "fx-complete", "fx-success", "fx-error", "fx-ready", "fx-sparkle",
      "produce-spark", "counter-bell",
    ];
    this.setNearestFilter(pixelKeys);
    this.drawFloor();
    this.buildStations();
    this.createPlayerAnimations();
    this.createWorldAnimations();
    this.playerSprite = this.add.sprite(0, 0, "cat-idle", 0).setOrigin(0.5, 0.7);
    this.playerSprite.setScale(PLAYER_SCALE);
    this.playerSprite.setFlipX(false);
    this.carryIcon = this.add.image(18, -4, "item-order").setScale(1.25).setVisible(false);
    this.player = this.add.container(MAP_W / 2, MAP_H * 0.62, [this.playerSprite, this.carryIcon]);
    this.player.setDepth(5);
    this.playPlayerAnim("player-idle");
    this.softGlow = this.add.image(0, 0, "soft-glow").setScale(2.2).setVisible(false).setDepth(0.5);
    this.highlight = this.add.image(0, 0, "highlight-frame").setScale(2.4).setVisible(false).setDepth(6);
    this.interactHint = this.add.image(0, 0, "interact-hint").setScale(1.5).setVisible(false).setDepth(7);
    this.guideArrow = this.add.image(0, 0, "guide-arrow").setScale(1.8).setVisible(false).setDepth(6.5);
    this.produceSpark = this.add.sprite(520, 318, "produce-spark", 0).setScale(2).setVisible(false).setDepth(4);
    this.produceReadyMark = this.add.image(520, 318, "fx-ready").setScale(2).setVisible(false).setDepth(4);
    this.produceProgressFrame = this.add.image(520, 308, "progress-frame").setScale(2).setVisible(false).setDepth(4);
    this.produceProgressFill = this.add.image(496, 308, "progress-fill").setOrigin(0, 0.5).setScale(2).setVisible(false).setDepth(4.1);
    this.completeBadge = this.add.image(520, 300, "complete-badge").setScale(1.6).setVisible(false).setDepth(8);
    this.outputProductPop = this.add.image(640, 330, "item-product").setScale(1.8).setVisible(false).setDepth(4);
    this.counterBell = this.add.sprite(560, 78, "counter-bell", 0).setScale(2).setDepth(2);

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
    this.wasProducing = false;
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
    this.updateCarryCues();
    this.updateGuideArrow();
    this.watchProductionTransitions();
  }

  private createPlayerAnimations(): void {
    if (this.anims.exists("player-idle")) return;
    this.anims.create({ key: "player-idle", frames: this.anims.generateFrameNumbers("cat-idle", { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: "player-walk", frames: this.anims.generateFrameNumbers("cat-walk", { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: "player-handle-idle", frames: this.anims.generateFrameNumbers("cat-handle-idle", { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: "player-handle-walk", frames: this.anims.generateFrameNumbers("cat-handle-walk", { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
  }

  private createWorldAnimations(): void {
    if (!this.anims.exists("produce-spark-play")) {
      this.anims.create({
        key: "produce-spark-play",
        frames: this.anims.generateFrameNumbers("produce-spark", { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1,
      });
    }
    if (!this.anims.exists("counter-bell-ring")) {
      this.anims.create({
        key: "counter-bell-ring",
        frames: this.anims.generateFrameNumbers("counter-bell", { start: 0, end: 3 }),
        frameRate: 12,
        repeat: 2,
      });
    }
    for (const kind of CUSTOMER_KINDS) {
      for (const mood of ["idle", "anxious"] as const) {
        const key = `customer-${kind}-${mood}-anim`;
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(`customer-${kind}-${mood}`, { start: 0, end: 1 }),
          frameRate: mood === "anxious" ? 4 : 2,
          repeat: -1,
        });
      }
    }
  }

  private ringCounterBell(): void {
    if (!this.counterBell) return;
    this.counterBell.play("counter-bell-ring", true);
    this.tweens.add({
      targets: this.counterBell,
      scaleX: 2.3,
      scaleY: 1.7,
      duration: 90,
      yoyo: true,
      repeat: 2,
    });
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
    let nx = Phaser.Math.Clamp(this.player.x + vx, 40, MAP_W - 40);
    let ny = Phaser.Math.Clamp(this.player.y + vy, 100, MAP_H - 40);
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
      // Nothing nearby and empty hands: no error FX (only wrong-target interactions react).
      return;
    }
    this.playActionFeedback(result, target);
    this.handleSessionEvent(result);
    this.syncFloorItems();
    this.eventBus.emit("sessionChanged", undefined);
  }

  private applyInteraction(target: InteractTarget): KitchenActionResult {
    const session = this.session!;
    switch (target.kind) {
      case "customer": {
        const carry = session.getCarry();
        if (carry.kind === "product") {
          const result = session.deliverToCustomer(target.id);
          if (result.delivered) this.ringCounterBell();
          return result;
        }
        const result = session.pickUpFromCustomer(target.id);
        if (result.tone !== "error") this.ringCounterBell();
        return result;
      }
      case "input": return session.interactInput();
      case "produce": return session.startProduce();
      case "output": return session.interactOutput();
      case "slot": return session.interactSlot(target.index);
      case "shelf": return session.pickUpFromShelf(target.moduleId);
      case "floor": return session.pickUpFromFloor(target.id);
    }
  }

  private playActionFeedback(result: KitchenActionResult, target?: InteractTarget): void {
    const pos = this.targetWorldPos(target) ?? { x: this.player.x, y: this.player.y - 20 };
    if (!result.ok || result.tone === "error") {
      if (result.message) {
        this.spawnFx("fx-error", pos.x, pos.y - 20, 1.8);
        this.shakeTarget(target);
      }
      return;
    }
    if (result.delivered) {
      this.spawnFx("fx-success", pos.x, pos.y - 28, 2.2);
      this.spawnFx("fx-sparkle", pos.x + 10, pos.y - 40, 1.6);
      const label = result.delivered.passed ? `Perfect! +${result.delivered.reward}C` : `+${result.delivered.reward}C`;
      this.floatCreditText(pos.x, pos.y - 50, label);
      const view = this.customerViews.get(result.delivered.customerId);
      if (view) this.tweens.add({ targets: view, y: view.y - 10, duration: 120, yoyo: true, ease: "Sine.easeOut" });
      return;
    }
    const message = result.message ?? "";
    if (message.includes("집어") || message.includes("집었") || message.includes("완성 이미지")) {
      this.spawnFx("fx-pickup", this.player.x, this.player.y - 28, 1.8);
      this.tweens.add({ targets: this.carryIcon, scaleX: 1.55, scaleY: 1.55, duration: 90, yoyo: true });
      return;
    }
    if (message.includes("입력기") || message.includes("슬롯") || message.includes("꽂") || message.includes("바꿨")) {
      this.spawnFx("fx-insert", pos.x, pos.y - 18, 1.8);
      this.shakeTarget(target, 4);
      return;
    }
    if (message.includes("생산 시작")) {
      this.spawnFx("fx-ready", pos.x, pos.y - 24, 1.8);
    }
  }

  private handleSessionEvent(event: KitchenActionResult): void {
    if (event.message) this.eventBus.emit("notice", { message: event.message, tone: event.tone });
    if (event.delivered) this.eventBus.emit("delivered", event.delivered);
    if (event.leftCustomerId) this.eventBus.emit("customerLeft", event.leftCustomerId);
    if (event.roundFinished) this.eventBus.emit("roundFinished", event.roundFinished);
  }

  private watchProductionTransitions(): void {
    if (!this.session) return;
    const producing = this.session.isProducing();
    const hasProduct = !!this.session.getOutput().product;
    if (this.wasProducing && !producing && hasProduct) {
      const out = this.zones.find((zone) => zone.target.kind === "output");
      const produce = this.zones.find((zone) => zone.target.kind === "produce");
      if (out) {
        this.spawnFx("fx-complete", out.x, out.y - 30, 2.6);
        this.spawnFx("fx-sparkle", out.x, out.y - 44, 2);
        if (this.outputProductPop) {
          this.outputProductPop.setPosition(out.x, out.y - 18).setVisible(true).setScale(1.4).setAlpha(1);
          this.tweens.add({
            targets: this.outputProductPop,
            y: out.y - 28,
            scaleX: 2,
            scaleY: 2,
            duration: 220,
            yoyo: true,
            repeat: 1,
            ease: "Back.easeOut",
          });
        }
      }
      if (produce && this.completeBadge) {
        this.completeBadge.setPosition(produce.x, produce.y - 56).setVisible(true).setAlpha(1).setScale(1.4);
        this.tweens.add({
          targets: this.completeBadge,
          y: produce.y - 72,
          alpha: 0,
          scale: 1.8,
          duration: 900,
          ease: "Sine.easeOut",
          onComplete: () => this.completeBadge?.setVisible(false),
        });
      }
    }
    this.wasProducing = producing;
  }

  private nearestTarget(options: { includeFloor?: boolean } = {}): InteractTarget | undefined {
    const includeFloor = options.includeFloor ?? true;
    let best: { target: InteractTarget; dist: number } | undefined;
    for (const zone of this.zones) {
      if (zone.target.kind === "shelf") {
        if (!this.session?.getShelfModuleIds().includes(zone.target.moduleId)) continue;
      }
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

  private targetWorldPos(target?: InteractTarget): { x: number; y: number } | undefined {
    if (!target) return undefined;
    if (target.kind === "customer") {
      const view = this.customerViews.get(target.id);
      return view ? { x: view.x, y: view.y } : undefined;
    }
    if (target.kind === "floor") {
      const item = this.session?.getFloorItems().find((entry) => entry.id === target.id);
      return item ? { x: item.x, y: item.y } : undefined;
    }
    const zone = this.zones.find((item) => JSON.stringify(item.target) === JSON.stringify(target));
    return zone ? { x: zone.x, y: zone.y } : undefined;
  }

  private updateHighlight(): void {
    const carry = this.session?.getCarry();
    const target = this.nearestTarget({ includeFloor: !carry || carry.kind === "none" });
    if (!target || !this.highlight || !this.interactHint || !this.softGlow) {
      this.highlight?.setVisible(false);
      this.interactHint?.setVisible(false);
      this.softGlow?.setVisible(false);
      return;
    }
    const pos = this.targetWorldPos(target);
    if (!pos) {
      this.highlight.setVisible(false);
      this.interactHint.setVisible(false);
      this.softGlow.setVisible(false);
      return;
    }
    let scale = 2.4;
    if (target.kind === "customer") scale = 2.8;
    else if (target.kind === "floor") scale = 1.6;
    else if (target.kind === "shelf") scale = 2.2;
    else scale = 2.6;
    const bob = Math.sin(this.time.now / 220) * 3;
    this.softGlow.setPosition(pos.x, pos.y + 8).setScale(scale * 0.95).setVisible(true).setAlpha(0.85);
    this.highlight.setPosition(pos.x, pos.y).setScale(scale).setVisible(true);
    this.interactHint.setPosition(pos.x, pos.y - 44 + bob).setVisible(true);
  }

  private updateCarryCues(): void {
    if (!this.session) return;
    const carry = this.session.getCarry();
    const slots = this.session.getSlots();
    const input = this.session.getInput();
    const near = (x: number, y: number) => Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) < CUE_RANGE;

    for (const [index, cue] of this.slotAvailableCues) {
      const empty = !slots[index];
      const zone = this.zones.find((item) => item.target.kind === "slot" && item.target.index === index);
      const show = carry.kind === "moduleChip" && empty && !!zone && near(zone.x, zone.y);
      cue.setVisible(show);
      if (show) cue.setAlpha(0.55 + Math.sin(this.time.now / 220) * 0.2);
    }

    for (const zone of this.zones) {
      const key = JSON.stringify(zone.target);
      const ghost = this.ghostViews.get(key);
      if (ghost) ghost.setVisible(false);
      const view = this.zoneViews.get(key);
      if (!view) continue;
      const body = view.list[this.bodyIndex(zone.target)] as Phaser.GameObjects.Image;
      body.clearTint();

      if (carry.kind === "order" && zone.target.kind === "input" && !input.order && near(zone.x, zone.y)) {
        body.setTint(0xfff2b0);
        if (ghost) {
          ghost.setTexture("ghost-order").setVisible(true);
          ghost.y = zone.y - 52 + Math.sin(this.time.now / 240) * 2;
        }
      } else if (carry.kind === "moduleChip" && zone.target.kind === "slot" && !slots[zone.target.index] && near(zone.x, zone.y)) {
        body.setTint(0xc8fff0);
        if (ghost) {
          ghost.setTexture("ghost-chip").setVisible(true);
          ghost.y = zone.y - 48 + Math.sin(this.time.now / 240) * 2;
        }
      } else if (carry.kind === "product" && zone.target.kind === "output") {
        // output is pickup, not insert
      }
    }

    if (carry.kind === "product") {
      for (const [id, view] of this.customerViews) {
        const customer = this.session.getCustomers().find((item) => item.id === id);
        const match = !!customer && customer.state === "waiting" && customer.id === carry.customerId;
        const sprite = view.list[0] as Phaser.GameObjects.Sprite;
        if (match && near(view.x, view.y)) {
          sprite.setTint(0xfff0b0);
          const ghostKey = `customer-${id}`;
          let ghost = this.ghostViews.get(ghostKey);
          if (!ghost) {
            ghost = this.add.image(view.x, view.y - 58, "ghost-product").setScale(1.6).setDepth(4);
            this.ghostViews.set(ghostKey, ghost);
          }
          ghost.setPosition(view.x, view.y - 58 + Math.sin(this.time.now / 240) * 2).setVisible(true);
        } else {
          sprite.clearTint();
          this.ghostViews.get(`customer-${id}`)?.setVisible(false);
        }
      }
    } else {
      for (const [id, view] of this.customerViews) {
        (view.list[0] as Phaser.GameObjects.Sprite).clearTint();
        this.ghostViews.get(`customer-${id}`)?.setVisible(false);
      }
    }
  }

  private updateGuideArrow(): void {
    if (!this.session || !this.guideArrow) return;
    const tip = this.nextGuidePoint();
    if (!tip) {
      this.guideArrow.setVisible(false);
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, tip.x, tip.y);
    if (dist < INTERACT_RANGE * 0.85) {
      this.guideArrow.setVisible(false);
      return;
    }
    const bob = Math.sin(this.time.now / 260) * 3;
    this.guideArrow.setPosition(tip.x, tip.y - 58 + bob).setVisible(true).setAlpha(0.9);
  }

  private nextGuidePoint(): { x: number; y: number } | undefined {
    if (!this.session) return undefined;
    const carry = this.session.getCarry();
    const input = this.session.getInput();
    const slots = this.session.getSlots();
    const output = this.session.getOutput();
    const producing = this.session.isProducing();
    const waiting = this.session.getWaitingCustomers();

    if (carry.kind === "product") {
      const customer = waiting.find((item) => item.id === carry.customerId);
      const view = customer ? this.customerViews.get(customer.id) : undefined;
      return view ? { x: view.x, y: view.y } : undefined;
    }
    if (output.product && carry.kind === "none") return this.zones.find((zone) => zone.target.kind === "output");
    if (producing) return this.zones.find((zone) => zone.target.kind === "produce");
    if (this.canProduceNow()) return this.zones.find((zone) => zone.target.kind === "produce");
    if (carry.kind === "moduleChip") {
      return this.zones.find((zone) => zone.target.kind === "slot" && !slots[zone.target.index]);
    }
    if (carry.kind === "order" && !input.order) return this.zones.find((zone) => zone.target.kind === "input");
    if (carry.kind === "none" && input.order && !slots.includes("image-maker")) {
      return this.zones.find((zone) => zone.target.kind === "shelf" && zone.target.moduleId === "image-maker");
    }
    if (carry.kind === "none") {
      const customer = waiting.find((item) => !item.orderTaken);
      const view = customer ? this.customerViews.get(customer.id) : undefined;
      if (view) return { x: view.x, y: view.y };
    }
    return undefined;
  }

  private canProduceNow(): boolean {
    if (!this.session) return false;
    if (this.session.isProducing()) return false;
    if (this.session.getOutput().product) return false;
    if (!this.session.getInput().order) return false;
    return this.session.getSlots().includes("image-maker");
  }

  private stationTexture(target: InteractTarget): string {
    if (target.kind === "input") return "station-input";
    if (target.kind === "produce") return "station-produce-idle";
    if (target.kind === "output") return "station-output-empty";
    if (target.kind === "slot") return "station-slot";
    if (target.kind === "shelf") return "module-locked";
    return "station-slot";
  }

  private buildStations(): void {
    this.zones = [
      { target: { kind: "input" }, x: 90, y: 360, w: 100, h: 70, label: "입력기" },
      { target: { kind: "slot", index: 0 }, x: 210, y: 360, w: 78, h: 70, label: "슬롯1" },
      { target: { kind: "slot", index: 1 }, x: 310, y: 360, w: 78, h: 70, label: "슬롯2" },
      { target: { kind: "slot", index: 2 }, x: 410, y: 360, w: 78, h: 70, label: "슬롯3" },
      { target: { kind: "produce" }, x: 520, y: 360, w: 88, h: 70, label: "생산" },
      { target: { kind: "output" }, x: 640, y: 360, w: 100, h: 70, label: "출구" },
    ];

    const shelfModules = ["image-maker", "style-processor", "ban-list", "composition-planner", "sharpener", "quality-checker"];
    shelfModules.forEach((moduleId, index) => {
      const x = 70 + index * 116;
      this.zones.push({
        target: { kind: "shelf", moduleId },
        x,
        y: 580,
        w: 100,
        h: 64,
        label: modulesById.get(moduleId)?.displayName ?? moduleId,
      });
    });

    for (const zone of this.zones) {
      const key = JSON.stringify(zone.target);
      const isShelf = zone.target.kind === "shelf";
      const scale = isShelf ? 2.1 : 2;
      const children: Phaser.GameObjects.GameObject[] = [];
      if (isShelf) children.push(this.add.image(0, 6, "station-module-shelf").setScale(2));
      const body = this.add.image(0, isShelf ? -8 : -4, this.stationTexture(zone.target)).setScale(scale);
      const text = this.add
        .text(0, isShelf ? 36 : 40, zone.label, {
          fontSize: "11px",
          color: "#3e2a18",
          align: "center",
          backgroundColor: "#ffe9c4ee",
          padding: { x: 4, y: 2 },
          wordWrap: { width: zone.w + 8 },
        })
        .setOrigin(0.5);
      children.push(body, text);
      const container = this.add.container(zone.x, zone.y, children);
      container.setDepth(1);
      this.zoneViews.set(key, container);

      if (!isShelf) {
        const lamp = this.add.image(zone.x + zone.w * 0.28, zone.y - 34, "status-lamp-off").setScale(2).setDepth(2);
        this.stationLamps.set(key, lamp);
        const ghost = this.add.image(zone.x, zone.y - 50, "ghost-order").setScale(1.6).setVisible(false).setDepth(3);
        this.ghostViews.set(key, ghost);
      }
      if (zone.target.kind === "slot") {
        const cue = this.add.image(zone.x, zone.y - 4, "slot-available").setScale(2.1).setVisible(false).setDepth(2);
        this.slotAvailableCues.set(zone.target.index, cue);
      }
    }

    this.add
      .text(MAP_W / 2, 24, "손님 카운터", {
        fontSize: "13px",
        color: "#3e2a18",
        backgroundColor: "#ffe9c4ee",
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(2);
  }

  private bodyIndex(target: InteractTarget): number {
    return target.kind === "shelf" ? 1 : 0;
  }

  private labelIndex(target: InteractTarget): number {
    return target.kind === "shelf" ? 2 : 1;
  }

  private refreshStationLabels(): void {
    if (!this.session) return;
    const input = this.session.getInput();
    const slots = this.session.getSlots();
    const output = this.session.getOutput();
    const producing = this.session.isProducing();
    const progress = this.session.getProduceProgress();
    const progressPct = Math.floor(progress * 100);
    const canProduce = this.canProduceNow();

    for (const zone of this.zones) {
      const key = JSON.stringify(zone.target);
      const view = this.zoneViews.get(key);
      if (!view) continue;
      const body = view.list[this.bodyIndex(zone.target)] as Phaser.GameObjects.Image;
      const label = view.list[this.labelIndex(zone.target)] as Phaser.GameObjects.Text;
      const lamp = this.stationLamps.get(key);

      if (zone.target.kind === "input") {
        body.setTexture(input.order ? "station-input-filled" : "station-input");
        label.setText("입력기");
        lamp?.setTexture(input.order ? "status-lamp-on" : "status-lamp-off");
      }
      if (zone.target.kind === "slot") {
        const moduleId = slots[zone.target.index];
        const spriteKey = moduleId ? MODULE_SPRITE[moduleId] : undefined;
        body.setTexture(spriteKey ?? "station-slot");
        label.setText(moduleId ? (modulesById.get(moduleId)?.displayName ?? moduleId) : `슬롯${zone.target.index + 1}`);
        lamp?.setTexture(moduleId ? "status-lamp-on" : "status-lamp-off");
      }
      if (zone.target.kind === "produce") {
        if (producing) body.setTexture("station-produce-busy");
        else if (canProduce) body.setTexture("station-produce-done");
        else body.setTexture("station-produce-idle");
        label.setText(producing ? `생산 ${progressPct}%` : canProduce ? "READY" : "생산");
        lamp?.setTexture(producing ? "status-lamp-busy" : canProduce ? "status-lamp-ready" : "status-lamp-off");
        if (this.produceSpark) {
          this.produceSpark.setVisible(producing);
          if (producing) {
            if (this.produceSpark.anims.currentAnim?.key !== "produce-spark-play") {
              this.produceSpark.play("produce-spark-play", true);
            }
            body.setPosition(Math.sin(this.time.now / 50) * 1.2, -4);
          } else {
            this.produceSpark.stop();
            this.produceSpark.setFrame(0);
            body.setPosition(0, -4);
          }
        }
        if (this.produceReadyMark) {
          const showReady = canProduce && !producing;
          this.produceReadyMark.setVisible(showReady);
          if (showReady) {
            this.produceReadyMark.setPosition(zone.x, zone.y - 48);
            this.produceReadyMark.setAlpha(0.7 + Math.sin(this.time.now / 180) * 0.25);
          }
        }
        if (this.produceProgressFrame && this.produceProgressFill) {
          this.produceProgressFrame.setVisible(producing);
          this.produceProgressFill.setVisible(producing);
          if (producing) {
            this.produceProgressFrame.setPosition(zone.x, zone.y - 54);
            this.produceProgressFill.setPosition(zone.x - 36, zone.y - 54);
            this.produceProgressFill.setScale(2 * Math.max(0.05, progress), 2);
          }
        }
      }
      if (zone.target.kind === "output") {
        const ready = !!output.product;
        body.setTexture(ready ? "station-output-ready" : "station-output-empty");
        label.setText(ready ? "가져가기" : "출구");
        lamp?.setTexture(ready ? "status-lamp-ready" : "status-lamp-off");
        if (this.outputProductPop) {
          this.outputProductPop.setVisible(ready);
          if (ready) {
            const bob = Math.sin(this.time.now / 220) * 3;
            this.outputProductPop.setPosition(zone.x, zone.y - 22 + bob).setAlpha(1);
          }
        }
      }
      if (zone.target.kind === "shelf") {
        const unlocked = this.session.getUnlockedModuleIds().includes(zone.target.moduleId);
        const inStock = this.session.getShelfModuleIds().includes(zone.target.moduleId);
        const spriteKey = MODULE_SPRITE[zone.target.moduleId] ?? "module-locked";
        if (!unlocked) {
          body.setTexture("module-locked");
          body.setAlpha(0.55);
          label.setText("잠김");
        } else if (!inStock) {
          body.setTexture(spriteKey);
          body.setAlpha(0.28);
          label.setText("없음");
        } else {
          body.setTexture(spriteKey);
          body.setAlpha(1);
          const def = modulesById.get(zone.target.moduleId);
          label.setText(def?.displayName ?? zone.target.moduleId);
        }
      }
    }
  }

  private syncCustomers(): void {
    if (!this.session) return;
    const waiting = this.session.getWaitingCustomers();
    const live = new Set(waiting.map((customer) => customer.id));
    for (const [id, view] of this.customerViews) {
      if (!live.has(id)) {
        view.destroy(true);
        this.customerViews.delete(id);
        this.ghostViews.get(`customer-${id}`)?.destroy();
        this.ghostViews.delete(`customer-${id}`);
      }
    }
    waiting.forEach((customer, index) => {
      let view = this.customerViews.get(customer.id);
      const x = 150 + index * 140;
      const y = 110;
      const kind = CUSTOMER_KINDS[index % CUSTOMER_KINDS.length]!;
      if (!view) {
        const sprite = this.add.sprite(0, 10, `customer-${kind}-idle`, 0).setScale(2.2).setOrigin(0.5, 0.85);
        sprite.play(`customer-${kind}-idle-anim`, true);
        const promptBubble = this.createPromptBubble(customer.prompt);
        const barBg = this.add.image(0, 34, "patience-frame").setScale(1.15);
        const barEmpty = this.add.rectangle(0, 34, 48, 6, 0x5a4e44).setOrigin(0.5);
        const bar = this.add.rectangle(-24, 34, 48, 6, 0x60ba6e).setOrigin(0, 0.5);
        const orderIcon = this.add.image(18, -8, "order-icon-small").setScale(1.4);
        const sweat = this.add.image(-18, -6, "customer-sweat").setScale(1.5).setVisible(false);
        view = this.add.container(x, y, [sprite, promptBubble, barBg, barEmpty, bar, orderIcon, sweat]);
        view.setData("kind", kind);
        view.setDepth(3);
        this.customerViews.set(customer.id, view);
      } else {
        view.setPosition(x, y);
      }
      const moodKind = (view.getData("kind") as (typeof CUSTOMER_KINDS)[number]) ?? kind;
      const promptBubble = view.list[1] as Phaser.GameObjects.Container;
      this.updatePromptBubble(promptBubble, customer.prompt, !customer.orderTaken);
      const bar = view.list[4] as Phaser.GameObjects.Rectangle;
      const orderIcon = view.list[5] as Phaser.GameObjects.Image;
      const sweat = view.list[6] as Phaser.GameObjects.Image;
      const sprite = view.list[0] as Phaser.GameObjects.Sprite;
      const ratio = customer.patience / customer.maxPatience;
      // Deplete from the right so the empty dark track reads as remaining wait time.
      const width = Math.max(1, 48 * ratio);
      bar.setSize(width, 6);
      bar.setPosition(-24, 34);
      if (ratio < 0.25) bar.setFillStyle(0xdc5454);
      else if (ratio < 0.5) bar.setFillStyle(0xf0b040);
      else bar.setFillStyle(0x60ba6e);
      // Pulse when critically low so decrease is noticeable.
      bar.setAlpha(ratio < 0.25 ? 0.65 + Math.sin(this.time.now / 120) * 0.35 : 1);
      orderIcon.setVisible(!customer.orderTaken);
      if (!customer.orderTaken) orderIcon.y = -8 + Math.sin(this.time.now / 250) * 2;
      sweat.setVisible(ratio < 0.35);
      const animKey = ratio < 0.35 ? `customer-${moodKind}-anxious-anim` : `customer-${moodKind}-idle-anim`;
      if (sprite.anims.currentAnim?.key !== animKey) sprite.play(animKey, true);
      sprite.x = ratio < 0.2 ? Math.sin(this.time.now / 60) * 1.5 : 0;
    });
  }

  private createPromptBubble(prompt: string): Phaser.GameObjects.Container {
    const bg = this.add.image(0, 0, "prompt-bubble").setScale(2.4, 1.2);
    const text = this.add.text(0, -1, "", {
      fontFamily: "IBM Plex Sans KR, Pretendard, sans-serif",
      fontSize: "10px",
      color: "#3e2a18",
    }).setOrigin(0.5);
    const bubble = this.add.container(0, -46, [bg, text]);
    this.updatePromptBubble(bubble, prompt, true);
    return bubble;
  }

  private updatePromptBubble(bubble: Phaser.GameObjects.Container, prompt: string, visible: boolean): void {
    const bg = bubble.list[0] as Phaser.GameObjects.Image;
    const text = bubble.list[1] as Phaser.GameObjects.Text;
    text.setText(shortPrompt(prompt));
    const width = Phaser.Math.Clamp(text.width + 18, 72, 160);
    bg.setDisplaySize(width, 22);
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
      const key = carrySpriteKey(item.item);
      const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y) < INTERACT_RANGE + 20;
      if (!view) {
        const shadow = this.add.image(0, 10, "item-shadow").setScale(2).setAlpha(0.85);
        const icon = this.add.image(0, 0, key).setScale(1.5);
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
        const icon = view.list[1] as Phaser.GameObjects.Image;
        if (icon.texture.key !== key) icon.setTexture(key);
        icon.setTint(near ? 0xfff4c8 : 0xffffff);
      }
    }
  }

  private syncCarryVisual(): void {
    if (!this.session) return;
    const carry = this.session.getCarry();
    if (carry.kind === "none") {
      this.carryIcon.setVisible(false);
      return;
    }
    this.carryIcon.setTexture(carrySpriteKey(carry)).setVisible(true);
    this.carryIcon.setScale(1.25);

    // Hold at hand/front of body, not above the head.
    const facingSide = this.facingX !== 0 ? Math.sign(this.facingX) : (this.playerSprite.flipX ? 1 : -1);
    let x = facingSide * 18;
    let y = -4;
    if (Math.abs(this.facingY) > Math.abs(this.facingX)) {
      x = facingSide * 14;
      y = this.facingY > 0 ? 6 : -12;
    }
    this.carryIcon.setPosition(x, y);

    // Facing up: tuck item behind the cat so it reads as held, not floating on the face.
    if (this.facingY < 0 && Math.abs(this.facingY) >= Math.abs(this.facingX)) {
      this.player.sendToBack(this.carryIcon);
    } else {
      this.player.bringToTop(this.carryIcon);
    }
  }

  private spawnFx(key: string, x: number, y: number, scale = 2): void {
    if (!this.textures.exists(key)) return;
    const fx = this.add.image(x, y, key).setScale(scale).setDepth(8);
    this.tweens.add({
      targets: fx,
      y: y - 16,
      alpha: 0,
      scaleX: scale * 1.35,
      scaleY: scale * 1.35,
      duration: 420,
      ease: "Sine.easeOut",
      onComplete: () => fx.destroy(),
    });
  }

  private floatCreditText(x: number, y: number, text: string): void {
    const label = this.add.text(x, y, text, {
      fontSize: "14px",
      color: "#b07a00",
      fontStyle: "bold",
      stroke: "#fff6df",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9);
    this.tweens.add({
      targets: label,
      y: y - 28,
      alpha: 0,
      duration: 700,
      onComplete: () => label.destroy(),
    });
  }

  private shakeTarget(target?: InteractTarget, amplitude = 5): void {
    if (!target) {
      this.shakeAt(this.player, amplitude);
      return;
    }
    if (target.kind === "customer") {
      const view = this.customerViews.get(target.id);
      if (view) this.shakeAt(view, amplitude);
      return;
    }
    if (target.kind === "floor") return;
    const view = this.zoneViews.get(JSON.stringify(target));
    if (view) this.shakeAt(view, amplitude);
  }

  private shakeAt(target: Phaser.GameObjects.Container | Phaser.GameObjects.Image, amplitude = 5): void {
    const originX = target.x;
    this.tweens.add({
      targets: target,
      x: originX - amplitude,
      duration: 45,
      yoyo: true,
      repeat: 3,
      onComplete: () => { target.x = originX; },
    });
  }

  private drawFloor(): void {
    this.add.tileSprite(0, 0, MAP_W, MAP_H, "floor-tile").setOrigin(0, 0).setDepth(-20);
    this.add.tileSprite(0, 0, MAP_W, 28, "wall-rim").setOrigin(0, 0).setDepth(-19);
    this.add.tileSprite(0, MAP_H - 28, MAP_W, 28, "wall-rim").setOrigin(0, 0).setDepth(-19);
    this.add.tileSprite(MAP_W / 2, 88, 620, 36, "counter-desk").setOrigin(0.5).setDepth(-18);
    this.add.tileSprite(MAP_W / 2, 360, 620, 56, "conveyor-belt").setOrigin(0.5).setDepth(-17);
    this.add.tileSprite(MAP_W / 2, 620, 660, 40, "counter-desk").setOrigin(0.5).setDepth(-18);

    // Soft dashed factory flow along the production line (not a forced path).
    for (const x of [140, 230, 320, 410, 500, 580]) {
      this.add.image(x, 392, "floor-dash").setScale(1.5).setAlpha(0.4).setDepth(-16.5);
    }
    this.add.image(560, 392, "floor-flow").setScale(1.5).setAlpha(0.45).setDepth(-16.5);
    this.add.image(MAP_W / 2, 240, "floor-dash").setScale(1.3).setAlpha(0.25).setAngle(90).setDepth(-16.5);
  }
}

function carrySpriteKey(carry: CarryItem): string {
  if (carry.kind === "order") return "item-order";
  if (carry.kind === "product") return "item-product";
  if (carry.kind === "moduleChip") return MODULE_SPRITE[carry.moduleId] ?? "module-locked";
  return "item-order";
}

function shortPrompt(prompt: string, maxChars = 20): string {
  const oneLine = prompt.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxChars) return oneLine;
  return `${oneLine.slice(0, Math.max(1, maxChars - 1))}…`;
}
