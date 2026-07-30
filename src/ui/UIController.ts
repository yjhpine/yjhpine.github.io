import Phaser from "phaser";
import { GameSession } from "../core/GameSession";
import type { GenerationResult, ModuleInstance, OrderDefinition, QualityScores } from "../core/types";
import { SaveService } from "../core/save/SaveService";
import { ProgressionService } from "../core/progression/ProgressionService";
import { modulesById } from "../data/modules";
import { orders, ordersById } from "../data/orders";
import { FactoryScene } from "../game/FactoryScene";

export class UIController {
  private readonly saveService = new SaveService();
  private progression: ProgressionService;
  private scene: FactoryScene | undefined;
  private session: GameSession | undefined;
  private priorResult: GenerationResult | undefined;
  private currentResult: GenerationResult | undefined;
  private canDeliver = false;

  constructor(private readonly root: HTMLElement) {
    this.progression = this.saveService.load();
    this.root.innerHTML = shell();
    this.bindDom(); this.renderMenu();
  }

  attachGame(game: Phaser.Game): void {
    game.events.on("factory-ready", (scene: FactoryScene) => this.attachScene(scene));
    const existing = game.scene.getScene("Factory") as FactoryScene | undefined;
    if (existing?.sys.isActive()) this.attachScene(existing);
  }

  attachScene(scene: FactoryScene): void {
    if (this.scene === scene) return;
    this.scene = scene;
    scene.eventBus.on("graphChanged", (snapshot) => {
      this.progression.saveFactory(snapshot); this.saveService.save(this.progression); this.renderStatus();
    });
    scene.eventBus.on("moduleSelected", (instanceId) => this.renderModuleDetail(instanceId ? scene.getSelectedModule() : undefined));
    scene.eventBus.on("notice", ({ message, tone }) => this.showNotice(message, tone));
  }

  private bindDom(): void {
    this.byId<HTMLButtonElement>("start-game").addEventListener("click", () => this.startActiveOrder());
    this.byId<HTMLButtonElement>("continue-game").addEventListener("click", () => this.startActiveOrder());
    this.byId<HTMLButtonElement>("produce").addEventListener("click", () => void this.produce());
    this.byId<HTMLButtonElement>("reset-factory").addEventListener("click", () => { this.scene?.resetFactory(); this.clearResult(); });
    this.byId<HTMLButtonElement>("undo-action").addEventListener("click", () => this.scene?.undo());
    this.byId<HTMLButtonElement>("delivery").addEventListener("click", () => this.deliver());
    this.byId<HTMLButtonElement>("next-order").addEventListener("click", () => this.advance());
    this.byId<HTMLButtonElement>("clear-save").addEventListener("click", () => this.clearSave());
    this.byId<HTMLButtonElement>("back-to-menu").addEventListener("click", () => this.showMenu());
    this.byId<HTMLElement>("module-palette").addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-module-id]");
      if (!button || !this.session) return;
      this.scene?.addModule(button.dataset.moduleId!);
    });
  }

  private startActiveOrder(): void {
    if (!this.scene) { this.showNotice("공장 화면을 준비하고 있습니다.", "info"); return; }
    const savedSnapshot = this.progression.snapshot.factorySnapshot;
    this.session = new GameSession(this.progression.currentOrderId, savedSnapshot);
    this.priorResult = undefined; this.currentResult = undefined; this.canDeliver = false;
    this.scene.loadSession(this.session); this.byId("menu-screen").classList.add("is-hidden"); this.byId("game-screen").classList.remove("is-hidden");
    this.renderOrder(); this.renderPalette(); this.renderModuleDetail(undefined); this.clearResult(); this.renderStatus();
  }

  private renderMenu(): void {
    const completed = this.progression.snapshot.completedOrderIds.length;
    this.byId("menu-progress").textContent = completed ? `${completed}개 의뢰를 완료했습니다. 이어서 공장을 개선해 보세요.` : "AI 지식 없이도 시작할 수 있는 공장 퍼즐입니다.";
    this.byId<HTMLButtonElement>("continue-game").hidden = completed === 0 && !this.progression.snapshot.factorySnapshot;
  }

  private renderOrder(): void {
    const order = this.order;
    this.byId("order-title").textContent = order.title;
    this.byId("order-request").textContent = order.request;
    this.byId("tutorial-message").textContent = order.tutorial;
    this.byId("order-step").textContent = `${orders.findIndex((item) => item.id === order.id) + 1} / ${orders.length}`;
  }

  private renderPalette(): void {
    const palette = this.byId("module-palette");
    const middleIds = this.order.availableModuleIds.filter((moduleId) => moduleId !== "order-input" && moduleId !== "delivery-bay");
    palette.innerHTML = middleIds.map((moduleId) => {
      const definition = modulesById.get(moduleId)!;
      return `<button class="module-button" data-module-id="${definition.id}" aria-label="${definition.displayName} 배치"><span class="module-icon">${definition.iconKey}</span><span><b>${definition.displayName}</b><small>${definition.description}</small></span><em>${definition.price ? `${definition.price} C` : "지급"}</em></button>`;
    }).join("");
  }

  private renderModuleDetail(instance: ModuleInstance | undefined): void {
    const panel = this.byId("module-detail");
    if (!instance) { panel.innerHTML = `<p class="empty-state">입력기·배송대는 기본 장치입니다. 중간 장치를 배치·연결해 파이프라인을 구성하세요.</p>`; return; }
    const definition = modulesById.get(instance.moduleId)!;
    const fixed = instance.moduleId === "order-input" || instance.moduleId === "delivery-bay";
    panel.innerHTML = `<div class="detail-title"><span>${definition.iconKey}</span><div><h3>${definition.displayName}${fixed ? " · 기본" : ""}</h3><p>${definition.description}</p></div></div><dl><div><dt>입력</dt><dd>${definition.inputPorts.length ? definition.inputPorts.map((port) => `${port.label} · ${port.dataType}`).join("<br>") : "없음"}</dd></div><div><dt>출력</dt><dd>${definition.outputPorts.map((port) => `${port.label} · ${port.dataType}`).join("<br>")}</dd></div><div><dt>처리 시간</dt><dd>${definition.processingTime ? `${definition.processingTime}초` : "즉시"}</dd></div>${fixed ? `<div><dt>고정</dt><dd>삭제·추가 배치 불가. 위치 이동과 연결만 가능합니다.</dd></div>` : ""}</dl>`;
  }

  private async produce(): Promise<void> {
    if (!this.session || !this.scene) return;
    const execution = this.session.execute();
    if (!execution.valid || !execution.result || !execution.evaluation) { this.showResultMessage(execution.reason ?? "생산 라인을 확인해 주세요.", "error"); return; }
    this.byId<HTMLButtonElement>("produce").disabled = true; this.showResultMessage("생산 라인을 실행하고 있습니다…", "info");
    await this.scene.animatePipeline(execution.executionInstanceIds);
    this.byId<HTMLButtonElement>("produce").disabled = false;
    this.priorResult = this.currentResult; this.currentResult = execution.result; this.canDeliver = execution.evaluation.passed;
    this.renderResult(execution.evaluation.summary); this.progression.saveFactory(this.session.snapshot()); this.saveService.save(this.progression);
  }

  private renderResult(summary: string): void {
    if (!this.currentResult) return;
    const result = this.currentResult; const scoreMarkup = this.order.id === "o01" ? `<p class="simple-score">주문과 맞음: <b>${this.canDeliver ? "좋음" : "확인 필요"}</b></p>` : scoreGrid(result);
    const issues = result.issues.length ? result.issues.map((issue) => `<li><b>${issue.message}</b><span>${issue.detail}</span>${issue.recommendationModuleId ? `<button class="recommendation" data-recommendation="${issue.recommendationModuleId}">${modulesById.get(issue.recommendationModuleId)?.displayName ?? "추천 장치"} 보기</button>` : ""}</li>`).join("") : `<li><b>문제가 없습니다.</b><span>모든 납품 기준을 만족했습니다.</span></li>`;
    const container = this.byId("result-content");
    container.innerHTML = `<div class="result-comparison"><section><h3>이전 결과</h3>${this.priorResult ? preview(this.priorResult) : `<div class="preview placeholder">이전 결과 없음</div>`}</section><section><h3>현재 결과</h3>${preview(result)}</section></div><div class="result-summary ${this.canDeliver ? "success" : "failure"}"><b>${this.canDeliver ? "납품 준비 완료" : "개선이 필요합니다"}</b><span>${summary}</span></div>${scoreMarkup}<h3 class="issue-heading">문제 분석</h3><ul class="issues">${issues}</ul>`;
    container.querySelectorAll<HTMLButtonElement>("[data-recommendation]").forEach((button) => button.addEventListener("click", () => this.showNotice(`${modulesById.get(button.dataset.recommendation!)?.displayName}를 생산 라인에 추가해 보세요.`, "info")));
    this.byId<HTMLButtonElement>("delivery").disabled = !this.canDeliver || this.progression.isComplete(this.order.id);
    this.byId("next-order").hidden = true;
  }

  private showResultMessage(message: string, tone: "error" | "info"): void {
    this.byId("result-content").innerHTML = `<div class="result-message ${tone}">${message}</div>`;
    this.byId<HTMLButtonElement>("delivery").disabled = true;
  }

  private deliver(): void {
    if (!this.currentResult || !this.canDeliver || this.progression.isComplete(this.order.id)) return;
    const next = this.progression.nextOrderId(); this.progression.completeActiveOrder(this.order.reward); this.saveService.save(this.progression);
    this.byId("result-content").insertAdjacentHTML("afterbegin", `<div class="delivery-banner">납품 완료! <b>+${this.order.reward} 크레딧</b>를 받았습니다.</div>`);
    this.byId<HTMLButtonElement>("delivery").disabled = true; this.byId<HTMLButtonElement>("next-order").hidden = !next;
    this.renderStatus(); this.renderMenu();
  }

  private advance(): void {
    const next = this.progression.nextOrderId(); if (!next) { this.showNotice("모든 MVP 의뢰를 완료했습니다!", "info"); return; }
    this.progression.activateOrder(next); this.saveService.save(this.progression); this.startActiveOrder();
  }

  private renderStatus(): void {
    this.byId("credits").textContent = `${this.progression.credits} C`;
    this.byId("factory-status").textContent = this.session ? `${this.session.graph.modules.length}개 장치 · ${this.session.graph.connections.length}개 연결` : "공장 대기 중";
  }

  private clearResult(): void { this.currentResult = undefined; this.priorResult = undefined; this.canDeliver = false; this.showResultMessage("생산 버튼을 눌러 공장 라인을 실행하세요.", "info"); }
  private clearSave(): void { this.saveService.clear(); this.progression = ProgressionService.createDefault(); this.session = undefined; this.scene?.resetFactory(); this.showMenu(); this.renderMenu(); }
  private showMenu(): void { this.byId("game-screen").classList.add("is-hidden"); this.byId("menu-screen").classList.remove("is-hidden"); }
  private showNotice(message: string, tone: "error" | "info" = "info"): void { const notice = this.byId("toast"); notice.textContent = message; notice.className = `toast is-visible ${tone}`; window.setTimeout(() => notice.classList.remove("is-visible"), 3200); }
  private get order(): OrderDefinition { return this.session?.order ?? ordersById.get(this.progression.currentOrderId) ?? orders[0]; }
  private byId<T extends HTMLElement = HTMLElement>(id: string): T { return this.root.querySelector<T>(`#${id}`)!; }
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
  return `<main class="app-shell"><section id="menu-screen" class="menu-screen"><div class="brand-chip">AI FACTORY</div><h1>AI Factory</h1><p class="hero-copy">주문서를 읽고 중간 장치를 연결해<br>더 좋은 그림을 납품하는 공장 퍼즐</p><p id="menu-progress" class="menu-progress"></p><div class="menu-actions"><button id="start-game" class="primary">새 게임 시작</button><button id="continue-game" class="secondary">이어서 하기</button></div><p class="menu-note">입력기와 배송대는 기본 장치입니다. 중간 장치만 구성해 보세요.</p></section><section id="game-screen" class="game-screen is-hidden"><header class="topbar"><div><span class="brand-chip small">AI FACTORY</span><span id="order-step" class="order-step">1 / 6</span></div><div class="top-actions"><span id="credits" class="credits">0 C</span><span id="factory-status" class="factory-status">공장 대기 중</span><button id="undo-action" class="ghost">↶ 되돌리기</button><button id="reset-factory" class="ghost">초기화</button><button id="clear-save" class="ghost danger">저장 초기화</button><button id="back-to-menu" class="ghost">메뉴</button></div></header><div class="game-layout"><aside class="left-panel panel"><div class="panel-heading"><span>중간 장치</span><small>입력·배송은 기본 배치</small></div><div id="module-palette" class="module-palette"></div></aside><section class="factory-column"><div class="order-card"><div><span class="eyebrow">현재 의뢰</span><h2 id="order-title"></h2><p id="order-request"></p></div><button id="produce" class="primary production">▶ 생산 실행</button></div><p id="tutorial-message" class="tutorial-message"></p><div id="game-canvas" class="game-canvas" aria-label="공장 설계 공간"></div><p class="canvas-help">입력기·배송대는 고정 · 중간 장치만 추가 · 포트 드래그로 연결 · Delete 삭제 · Ctrl+Z 되돌리기</p></section><aside class="right-panel panel"><div class="panel-heading"><span>선택 장치</span><small>연결 규칙과 효과</small></div><div id="module-detail"></div></aside></div><section class="result-panel panel"><div class="result-header"><div><span class="eyebrow">결과 비교 및 문제 해결</span><h2>생산 결과</h2></div><div class="result-actions"><button id="delivery" class="primary" disabled>📦 납품하기</button><button id="next-order" class="secondary" hidden>다음 의뢰 →</button></div></div><div id="result-content"></div></section></section><div id="toast" class="toast" role="status"></div></main>`;
}
