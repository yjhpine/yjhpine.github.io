import Phaser from "phaser";
import { KitchenSession } from "../core/kitchen/KitchenSession";
import type { CarryItem } from "../core/kitchen/types";
import type { GenerationResult, OrderDefinition, QualityScores } from "../core/types";
import { SaveService } from "../core/save/SaveService";
import { ProgressionService } from "../core/progression/ProgressionService";
import { modulesById } from "../data/modules";
import { orders, ordersById } from "../data/orders";
import { KitchenScene } from "../game/KitchenScene";

export class UIController {
  private readonly saveService = new SaveService();
  private progression: ProgressionService;
  private scene: KitchenScene | undefined;
  private session: KitchenSession | undefined;
  private inspectOpen = false;

  constructor(private readonly root: HTMLElement) {
    this.progression = this.saveService.load();
    this.root.innerHTML = shell();
    this.bindDom();
    this.renderMenu();
  }

  attachGame(game: Phaser.Game): void {
    game.events.on("kitchen-ready", (scene: KitchenScene) => this.attachScene(scene));
    const existing = game.scene.getScene("Kitchen") as KitchenScene | undefined;
    if (existing?.sys.isActive()) this.attachScene(existing);
  }

  attachScene(scene: KitchenScene): void {
    if (this.scene === scene) return;
    this.scene = scene;
    scene.eventBus.on("notice", ({ message, tone }) => this.showNotice(message, tone));
    scene.eventBus.on("sessionChanged", () => {
      this.renderHud();
      if (this.inspectOpen) this.renderInspect();
    });
    scene.eventBus.on("delivered", (payload) => this.onDelivered(payload));
    scene.eventBus.on("customerLeft", () => this.renderHud());
    scene.eventBus.on("inspectToggle", () => this.toggleInspect());
  }

  private bindDom(): void {
    this.byId<HTMLButtonElement>("start-game").addEventListener("click", () => this.startActiveOrder(true));
    this.byId<HTMLButtonElement>("continue-game").addEventListener("click", () => this.startActiveOrder(false));
    this.byId<HTMLButtonElement>("next-order").addEventListener("click", () => this.advance());
    this.byId<HTMLButtonElement>("clear-save").addEventListener("click", () => this.clearSave());
    this.byId<HTMLButtonElement>("back-to-menu").addEventListener("click", () => this.showMenu());
    this.byId<HTMLButtonElement>("reset-line").addEventListener("click", () => {
      this.session?.resetLine();
      this.closeInspect();
      this.renderHud();
      this.showNotice("생산 라인을 비웠습니다.", "info");
    });
    this.byId<HTMLButtonElement>("inspect-close").addEventListener("click", () => this.closeInspect());
    this.byId("inspect-modal").addEventListener("click", (event) => {
      if (event.target === this.byId("inspect-modal")) this.closeInspect();
    });
  }

  private startActiveOrder(fresh: boolean): void {
    if (!this.scene) { this.showNotice("주방 화면을 준비하고 있습니다.", "info"); return; }
    if (fresh) {
      this.progression = ProgressionService.createDefault();
      this.saveService.save(this.progression);
    }
    this.session = new KitchenSession(this.progression.currentOrderId, this.progression.unlockedModuleIds);
    this.closeInspect();
    this.scene.loadSession(this.session);
    this.byId("menu-screen").classList.add("is-hidden");
    this.byId("game-screen").classList.remove("is-hidden");
    this.renderOrder();
    this.renderHud();
    this.byId<HTMLButtonElement>("next-order").hidden = true;
  }

  private renderMenu(): void {
    const completed = this.progression.snapshot.completedOrderIds.length;
    this.byId("menu-progress").textContent = completed
      ? `${completed}개 의뢰를 완료했습니다. 손님 응대를 이어가세요.`
      : "손님이 가져온 프롬프트를 공장에서 이미지로 바꿔 전달하는 오버쿡드형 퍼즐입니다.";
    this.byId<HTMLButtonElement>("continue-game").hidden = completed === 0;
  }

  private renderOrder(): void {
    const order = this.order;
    this.byId("order-title").textContent = order.title;
    this.byId("order-request").textContent = order.request;
    this.byId("tutorial-message").textContent = order.tutorial;
    this.byId("order-step").textContent = `${orders.findIndex((item) => item.id === order.id) + 1} / ${orders.length}`;
    this.byId("shelf-guide").innerHTML = order.availableModuleIds.map((moduleId) => {
      const definition = modulesById.get(moduleId)!;
      return `<li><span>${definition.iconKey}</span><b>${definition.displayName}</b><small>${definition.description}</small></li>`;
    }).join("");
  }

  private renderHud(): void {
    if (!this.session) return;
    const carry = this.session.getCarry();
    const waiting = this.session.getWaitingCustomers().length;
    this.byId("credits").textContent = `${this.progression.credits} C`;
    this.byId("waiting-count").textContent = `대기 ${waiting}명`;
    this.byId("carry-status").textContent = carryLabel(carry);
  }

  private toggleInspect(): void {
    if (this.inspectOpen) {
      this.closeInspect();
      return;
    }
    if (!this.session) return;
    const carry = this.session.getCarry();
    if (carry.kind !== "order" && carry.kind !== "product") {
      this.showNotice("프롬프트나 이미지를 들고 있을 때 X로 확인할 수 있습니다.", "info");
      return;
    }
    this.inspectOpen = true;
    this.renderInspect();
    this.byId("inspect-modal").classList.remove("is-hidden");
  }

  private closeInspect(): void {
    this.inspectOpen = false;
    this.byId("inspect-modal").classList.add("is-hidden");
    this.byId("inspect-body").innerHTML = "";
  }

  private renderInspect(): void {
    if (!this.session) return;
    const carry = this.session.getCarry();
    const body = this.byId("inspect-body");
    if (carry.kind === "order") {
      body.innerHTML = `
        <p class="inspect-eyebrow">손님 프롬프트</p>
        <h2>주문서 확인</h2>
        <blockquote class="inspect-prompt">“${escapeHtml(carry.prompt)}”</blockquote>
        <p class="inspect-hint">이 조건에 맞춰 모듈 칩을 꽂아 이미지를 만드세요.</p>`;
      return;
    }
    if (carry.kind === "product") {
      const passed = carry.evaluation.passed;
      body.innerHTML = `
        <p class="inspect-eyebrow">들고 있는 이미지</p>
        <h2>결과 확인</h2>
        <blockquote class="inspect-prompt">요청: “${escapeHtml(carry.prompt)}”</blockquote>
        ${preview(carry.result)}
        <div class="result-summary ${passed ? "success" : "failure"}">
          <b>${passed ? "조건 충족" : "조건 미달"}</b>
          <span>${escapeHtml(carry.evaluation.summary)}</span>
        </div>
        ${scoreGrid(carry.result)}
        <p class="inspect-hint">맞는 손님에게 전달하세요. X로 닫습니다.</p>`;
      return;
    }
    this.closeInspect();
  }

  private onDelivered(payload: { reward: number; passed: boolean; evaluation: { summary: string }; result: GenerationResult }): void {
    this.closeInspect();
    if (payload.passed) {
      this.progression.completeActiveOrder(payload.reward);
      this.session?.setUnlockedModules(this.progression.unlockedModuleIds);
    } else {
      this.progression.addCredits(payload.reward);
    }
    this.saveService.save(this.progression);
    this.renderHud();
    this.renderMenu();
    const next = this.progression.nextOrderId();
    this.byId<HTMLButtonElement>("next-order").hidden = !(payload.passed && this.progression.isComplete(this.order.id) && next);
    this.showNotice(payload.passed ? `납품 성공! +${payload.reward} C` : `조건 미달… +${payload.reward} C`, payload.passed ? "success" : "error");
  }

  private advance(): void {
    const next = this.progression.nextOrderId();
    if (!next) { this.showNotice("모든 MVP 의뢰를 완료했습니다!", "info"); return; }
    this.progression.activateOrder(next);
    this.saveService.save(this.progression);
    this.startActiveOrder(false);
  }

  private clearSave(): void {
    this.saveService.clear();
    this.progression = ProgressionService.createDefault();
    this.session = undefined;
    this.closeInspect();
    this.showMenu();
    this.renderMenu();
  }

  private showMenu(): void {
    this.closeInspect();
    this.byId("game-screen").classList.add("is-hidden");
    this.byId("menu-screen").classList.remove("is-hidden");
  }

  private showNotice(message: string, tone: "error" | "info" | "success" = "info"): void {
    const notice = this.byId("toast");
    notice.textContent = message;
    notice.className = `toast is-visible ${tone}`;
    window.setTimeout(() => notice.classList.remove("is-visible"), 2800);
  }

  private get order(): OrderDefinition {
    return this.session?.order ?? ordersById.get(this.progression.currentOrderId) ?? orders[0];
  }

  private byId<T extends HTMLElement = HTMLElement>(id: string): T {
    return this.root.querySelector<T>(`#${id}`)!;
  }
}

function carryLabel(carry: CarryItem): string {
  if (carry.kind === "none") return "손: 비움";
  if (carry.kind === "order") return "손: 주문서 📜 (X 확인)";
  if (carry.kind === "moduleChip") return `손: ${modulesById.get(carry.moduleId)?.displayName ?? "칩"} ${modulesById.get(carry.moduleId)?.iconKey ?? ""}`;
  return "손: 이미지 🖼️ (X 확인)";
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function scoreGrid(result: GenerationResult): string {
  const scores: [keyof QualityScores, string][] = [["subjectAccuracy", "대상"], ["styleMatch", "스타일"], ["composition", "구도"], ["sharpness", "선명도"]];
  return `<div class="score-grid">${scores.map(([key, label]) => `<div><span>${label}</span><b>${result[key]}</b></div>`).join("")}<div><span>처리 시간</span><b>${result.processingTime}초</b></div></div>`;
}

function preview(result: GenerationResult): string {
  const tags = new Set(result.appliedTags);
  const classes = [
    "preview",
    tags.has("style-fairytale") ? "preview--fairytale" : "preview--plain",
    tags.has("no-hat") ? "preview--no-hat" : "preview--hat",
    tags.has("centered-composition") ? "preview--center" : "preview--offset",
    tags.has("sharpness") ? "preview--sharp" : "preview--soft",
    tags.has("quality-inspection") ? "preview--checked" : "preview--unchecked",
  ].join(" ");
  return `<div class="${classes}" aria-label="${result.previewKey}"><span class="moon"></span><span class="cloud cloud-a"></span><span class="cloud cloud-b"></span><span class="cat"><i class="ear left"></i><i class="ear right"></i><i class="face"></i><i class="hat"></i></span><span class="result-label">${result.appliedTags.includes("quality-inspection") ? "검사 완료" : "제작 완료"}</span></div>`;
}

function shell(): string {
  return `<main class="app-shell">
  <section id="menu-screen" class="menu-screen">
    <div class="brand-chip">AI FACTORY</div>
    <h1>AI Factory</h1>
    <p class="hero-copy">손님이 가져온 프롬프트를<br>공장 라인으로 이미지로 바꿔 전달하세요</p>
    <p id="menu-progress" class="menu-progress"></p>
    <div class="menu-actions">
      <button id="start-game" class="primary">새 게임 시작</button>
      <button id="continue-game" class="secondary">이어서 하기</button>
    </div>
    <p class="menu-note">WASD 이동 · Z 상호작용 · C 대시 · X로 프롬프트/이미지 확인</p>
  </section>
  <section id="game-screen" class="game-screen is-hidden">
    <header class="topbar">
      <div>
        <span class="brand-chip small">AI FACTORY</span>
        <span id="order-step" class="order-step">1 / 6</span>
      </div>
      <div class="top-actions">
        <span id="credits" class="credits">0 C</span>
        <span id="waiting-count" class="factory-status">대기 0명</span>
        <span id="carry-status" class="factory-status">손: 비움</span>
        <button id="next-order" class="secondary" hidden>다음 의뢰 →</button>
        <button id="reset-line" class="ghost">라인 비우기</button>
        <button id="clear-save" class="ghost danger">저장 초기화</button>
        <button id="back-to-menu" class="ghost">메뉴</button>
      </div>
    </header>
    <div class="game-layout kitchen-layout kitchen-layout--wide">
      <aside class="left-panel panel">
        <div class="panel-heading"><span>현재 의뢰</span><small>해금 모듈 칩</small></div>
        <h2 id="order-title" class="side-title"></h2>
        <p id="order-request" class="side-copy"></p>
        <p id="tutorial-message" class="tutorial-message side-tutorial"></p>
        <ul id="shelf-guide" class="shelf-guide"></ul>
      </aside>
      <section class="factory-column">
        <div class="order-card kitchen-card">
          <div>
            <span class="eyebrow">조작</span>
            <h2>오버쿡드 공장</h2>
            <p>손님 주문서 → 입력기 → 칩 슬롯 → 생산 → 출구 → 손님</p>
          </div>
          <div class="controls-chip">WASD 이동 · Z 상호작용 · C 대시 · X 들여다보기</div>
        </div>
        <div id="game-canvas" class="game-canvas" aria-label="주방 공장 공간"></div>
        <p class="canvas-help">주문서나 이미지를 든 채 X를 누르면 프롬프트/결과를 확인할 수 있습니다. C로 짧게 대시합니다.</p>
      </section>
    </div>
  </section>
  <div id="inspect-modal" class="inspect-modal is-hidden" role="dialog" aria-modal="true" aria-label="들여다보기">
    <div class="inspect-card">
      <button id="inspect-close" class="ghost inspect-close" type="button">닫기 (X)</button>
      <div id="inspect-body"></div>
    </div>
  </div>
  <div id="toast" class="toast" role="status"></div>
</main>`;
}
