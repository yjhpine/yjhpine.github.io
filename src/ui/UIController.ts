import Phaser from "phaser";
import { KitchenSession } from "../core/kitchen/KitchenSession";
import { RoundScoreService, type RoundScoreBreakdown } from "../core/kitchen/RoundScoreService";
import type { CarryItem, RoundStats } from "../core/kitchen/types";
import { SaveService } from "../core/save/SaveService";
import { ProgressionService } from "../core/progression/ProgressionService";
import { modulesById } from "../data/modules";
import { ordersById } from "../data/orders";
import { rounds, roundsById } from "../data/rounds";
import type { UpgradeId } from "../data/upgrades";
import { KitchenScene } from "../game/KitchenScene";
import { orderAnalysisRows, productAnalysisRows } from "./analysisView";
import { activateNextRoundForPrep } from "./prepFlow";
import { isUiBlockingOverlay } from "./overlayGate";
import { renderPreview } from "./renderPreview";

export class UIController {
  private readonly saveService = new SaveService();
  private readonly scorer = new RoundScoreService();
  private progression: ProgressionService;
  private scene: KitchenScene | undefined;
  private session: KitchenSession | undefined;
  private inspectOpen = false;
  private roundSummaryOpen = false;
  private unlockTutorialOpen = false;
  private prepOpen = false;
  private analysisOpen = false;
  private pendingUnlockModuleIds: string[] = [];

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
    scene.setInputBlocked(() => this.isBlockingOverlay());
    scene.eventBus.on("notice", ({ message, tone }) => this.showNotice(message, tone));
    scene.eventBus.on("sessionChanged", () => {
      this.renderHud();
      if (this.inspectOpen) this.renderInspect();
    });
    scene.eventBus.on("delivered", (payload) => this.onDelivered(payload));
    scene.eventBus.on("customerLeft", () => this.renderHud());
    scene.eventBus.on("inspectToggle", () => this.toggleInspect());
    scene.eventBus.on("roundFinished", (stats) => this.onRoundFinished(stats));
    scene.eventBus.on("tutorialStep", ({ hint, active }) => this.onTutorialStep(hint, active));
    scene.eventBus.on("productAnalysis", () => this.openProductAnalysis());
    scene.eventBus.on("orderAnalysis", () => this.openOrderAnalysis());
  }

  isBlockingOverlay(): boolean {
    return isUiBlockingOverlay({
      inspectOpen: this.inspectOpen,
      roundSummaryOpen: this.roundSummaryOpen,
      unlockTutorialOpen: this.unlockTutorialOpen,
      prepOpen: this.prepOpen,
      analysisOpen: this.analysisOpen,
    });
  }

  private bindDom(): void {
    this.byId<HTMLButtonElement>("start-game").addEventListener("click", () => this.startRound(true));
    this.byId<HTMLButtonElement>("continue-game").addEventListener("click", () => this.openPrep());
    this.byId<HTMLButtonElement>("next-round").addEventListener("click", () => this.advanceToPrep());
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
    this.byId<HTMLButtonElement>("round-summary-close").addEventListener("click", () => this.closeRoundSummary());
    this.byId<HTMLButtonElement>("unlock-tutorial-ok").addEventListener("click", () => this.closeUnlockTutorial(true));
    this.byId<HTMLButtonElement>("prep-start").addEventListener("click", () => this.confirmPrepStart());
    this.byId("prep-shop-list").addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-upgrade-id]");
      if (!button) return;
      this.purchaseUpgrade(button.dataset.upgradeId as UpgradeId);
    });
    this.byId<HTMLButtonElement>("analysis-close").addEventListener("click", () => this.closeAnalysis());
    this.byId("analysis-modal").addEventListener("click", (event) => {
      if (event.target === this.byId("analysis-modal")) this.closeAnalysis();
    });
    window.addEventListener("keydown", (event) => this.onGlobalKeyDown(event));
  }

  private onGlobalKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;
    const isZ = event.code === "KeyZ" || event.key === "z" || event.key === "Z";
    if (!isZ) return;
    if (!this.analysisOpen) return;
    event.preventDefault();
    this.closeAnalysis();
  }

  private startRound(fresh: boolean): void {
    if (!this.scene) { this.showNotice("주방 화면을 준비하고 있습니다.", "info"); return; }
    if (fresh) {
      this.progression = ProgressionService.createDefault();
      this.saveService.save(this.progression);
    }
    this.session = new KitchenSession(
      this.progression.currentRoundId,
      this.progression.unlockedModuleIds,
      undefined,
      this.progression.upgradeEffects,
    );
    this.closeInspect();
    this.closeRoundSummary();
    this.closeUnlockTutorial(false);
    this.closePrep(false);
    this.closeAnalysis();
    this.scene.loadSession(this.session);
    this.byId("menu-screen").classList.add("is-hidden");
    this.byId("game-screen").classList.remove("is-hidden");
    this.scene.scale.refresh();
    this.renderRoundInfo();
    this.renderHud();
    if (this.session?.roundDefinition.isTutorial) {
      // Guided round uses step banners; skip the blocking unlock modal.
      const pending = this.progression.pendingModuleTutorials();
      if (pending.length > 0) {
        this.progression.markModulesIntroduced(pending);
        this.saveService.save(this.progression);
      }
      const hint = this.scene.getTutorialHint();
      if (hint) this.syncTutorialMessage(hint);
    } else {
      this.maybeShowUnlockTutorial();
    }
  }

  private onTutorialStep(hint: string, active: boolean): void {
    if (!this.session?.roundDefinition.isTutorial) return;
    this.syncTutorialMessage(hint);
    if (!active && hint.includes("완료")) {
      this.showNotice("튜토리얼 완료! 본 라운드로 넘어갑니다.", "success");
    }
  }

  private syncTutorialMessage(hint: string): void {
    this.byId("tutorial-message").innerHTML = `
      <img class="tutorial-flow" src="/assets/art/ui/tutorial_flow.png" alt="" width="128" height="40" />
      <span>${escapeHtml(hint)}</span>`;
  }

  private renderMenu(): void {
    const completed = this.progression.snapshot.completedRoundIds.length;
    this.byId("menu-progress").textContent = completed
      ? `${completed}개 라운드를 완료했습니다. VRAM을 아끼며 이어서 응대하세요.`
      : "라운드마다 손님이 오고, 생산마다 VRAM이 닳습니다. 최적 파이프라인으로 높은 점수를 노리세요.";
    this.byId<HTMLButtonElement>("continue-game").hidden = completed === 0;
  }

  private renderRoundInfo(): void {
    const round = this.session?.roundDefinition ?? roundsById.get(this.progression.currentRoundId)!;
    this.byId("order-title").textContent = round.title;
    this.byId("order-request").textContent = `목표 손님 ${round.targetCustomers}명 · VRAM 예산 ${round.vramBudget}`;
    this.byId("tutorial-message").innerHTML = `
      <img class="tutorial-flow" src="/assets/art/ui/tutorial_flow.png" alt="" width="128" height="40" />
      <span>${escapeHtml(round.tutorial)}</span>`;
    this.byId("order-step").textContent = `${rounds.findIndex((item) => item.id === round.id) + 1} / ${rounds.length}`;
    this.byId("shelf-guide").innerHTML = round.availableModuleIds.map((moduleId) => {
      const definition = modulesById.get(moduleId)!;
      return `<li><img class="chip-icon" src="${definition.iconKey}" alt="" width="28" height="28" /><b>${definition.displayName}</b><small>VRAM ${definition.vramCost} · ${definition.description}</small></li>`;
    }).join("");
  }

  private renderHud(): void {
    if (!this.session) return;
    const stats = this.session.getStats();
    const carry = this.session.getCarry();
    const over = stats.vramUsed > stats.vramBudget;
    this.byId("credits").textContent = `${this.progression.credits} C`;
    this.byId("waiting-count").textContent = `손님 ${stats.resolvedCustomers}/${stats.targetCustomers}`;
    this.byId("vram-status").textContent = `VRAM ${stats.vramUsed}/${stats.vramBudget}`;
    this.byId("vram-status").classList.toggle("is-over", over);
    const carryIcon = this.byId<HTMLImageElement>("carry-icon");
    const carryLabelEl = this.byId("carry-label");
    const iconSrc = carryIconSrc(carry);
    if (iconSrc) {
      carryIcon.src = iconSrc;
      carryIcon.classList.remove("is-hidden");
    } else {
      carryIcon.removeAttribute("src");
      carryIcon.classList.add("is-hidden");
    }
    carryLabelEl.textContent = carryLabel(carry);
    const preview = this.session.getSlotVramPreview();
    this.byId("vram-preview").textContent = preview ? `이번 생산 ${preview}` : "이번 생산 0";
  }

  private maybeShowUnlockTutorial(): void {
    const pending = this.progression.pendingModuleTutorials();
    if (pending.length === 0) return;
    this.pendingUnlockModuleIds = pending;
    this.unlockTutorialOpen = true;
    this.byId("unlock-tutorial-body").innerHTML = pending.map((moduleId) => {
      const definition = modulesById.get(moduleId);
      if (!definition) return "";
      return `<article class="unlock-item">
        <img class="unlock-item-icon" src="${definition.iconKey}" alt="" width="40" height="40" aria-hidden="true" />
        <div>
          <b>${escapeHtml(definition.displayName)}</b>
          <p>${escapeHtml(definition.unlockTutorial)}</p>
          <small>VRAM ${definition.vramCost} · 왼쪽 선반에서 집어 슬롯에 꽂으세요</small>
        </div>
      </article>`;
    }).join("");
    this.byId("unlock-tutorial").classList.remove("is-hidden");
    this.byId("game-screen").classList.add("is-tutorial-locked");
    // Pause kitchen so customers/patience/input wait until the player confirms.
    this.scene?.scene.pause();
  }

  private closeUnlockTutorial(markSeen: boolean): void {
    if (markSeen && this.pendingUnlockModuleIds.length > 0) {
      this.progression.markModulesIntroduced(this.pendingUnlockModuleIds);
      this.saveService.save(this.progression);
    }
    this.pendingUnlockModuleIds = [];
    this.unlockTutorialOpen = false;
    this.byId("unlock-tutorial").classList.add("is-hidden");
    this.byId("unlock-tutorial-body").innerHTML = "";
    this.byId("game-screen").classList.remove("is-tutorial-locked");
    this.resumeSceneIfIdle();
  }

  private toggleInspect(): void {
    if (this.roundSummaryOpen || this.unlockTutorialOpen || this.prepOpen || this.analysisOpen) return;
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
    this.scene?.scene.pause();
    if (carry.kind === "product") this.scene?.notifyTutorialInspect();
  }

  private closeInspect(): void {
    this.inspectOpen = false;
    this.byId("inspect-modal").classList.add("is-hidden");
    this.byId("inspect-body").innerHTML = "";
    this.resumeSceneIfIdle();
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
        <p class="inspect-hint">필요한 칩만 꽂아 VRAM을 아끼세요.</p>`;
      return;
    }
    if (carry.kind === "product") {
      const passed = carry.evaluation.passed;
      body.innerHTML = `
        <p class="inspect-eyebrow">들고 있는 이미지</p>
        <h2>결과 확인</h2>
        <blockquote class="inspect-prompt">요청: “${escapeHtml(carry.prompt)}”</blockquote>
        ${renderPreview(carry.result)}
        <div class="result-summary ${passed ? "success" : "failure"}">
          <b>${passed ? "조건 충족" : "조건 미달"}</b>
          <span>${escapeHtml(carry.evaluation.summary)}</span>
        </div>
        <p class="inspect-hint">이 생산 VRAM ${carry.vramSpend} · X로 닫기</p>`;
      bindPreviewPhotoFallbacks(body);
      return;
    }
    this.closeInspect();
  }

  private onDelivered(payload: {
    reward: number;
    passed: boolean;
    breakdown?: { success: number; perfect: number; patience: number; total: number };
  }): void {
    this.closeInspect();
    this.progression.addCredits(payload.reward);
    this.saveService.save(this.progression);
    this.renderHud();
    if (payload.breakdown && payload.passed) {
      const parts = [
        `성공 +${payload.breakdown.success}`,
        payload.breakdown.perfect ? `통과 보너스 +${payload.breakdown.perfect}` : null,
        payload.breakdown.patience ? `인내심 +${payload.breakdown.patience}` : null,
      ].filter(Boolean);
      this.showNotice(`납품 보상 ${parts.join(" · ")} = +${payload.breakdown.total}C`, "success");
    }
  }

  private openPrep(): void {
    if (!this.scene) { this.showNotice("주방 화면을 준비하고 있습니다.", "info"); return; }
    this.closeInspect();
    this.closeAnalysis();
    this.closeRoundSummary();
    this.closeUnlockTutorial(false);
    this.prepOpen = true;
    this.byId("menu-screen").classList.add("is-hidden");
    this.byId("game-screen").classList.remove("is-hidden");
    this.scene.scale.refresh();
    this.renderPrep();
    this.byId("prep-modal").classList.remove("is-hidden");
    if (this.scene.scene.isActive() && !this.scene.scene.isPaused()) this.scene.scene.pause();
  }

  private closePrep(resumeScene: boolean): void {
    this.prepOpen = false;
    this.byId("prep-modal").classList.add("is-hidden");
    if (resumeScene) this.resumeSceneIfIdle();
  }

  private renderPrep(): void {
    const round = roundsById.get(this.progression.currentRoundId)!;
    this.byId("prep-round-title").textContent = round.title;
    this.byId("prep-round-summary").textContent =
      `목표 손님 ${round.targetCustomers}명 · VRAM 예산 ${round.vramBudget}`;
    this.byId("prep-credits").textContent = `${this.progression.credits} C`;
    this.byId("prep-shop-list").innerHTML = this.progression.shopCatalog().map((row) => {
      const levelText = row.maxLevel > 1 ? `Lv.${row.level}/${row.maxLevel}` : (row.level >= 1 ? "보유" : "미보유");
      let action = "";
      if (row.level >= row.maxLevel) {
        action = `<button class="secondary" type="button" disabled>최대 레벨</button>`;
      } else {
        const canAfford = (row.nextPrice ?? 0) <= this.progression.credits;
        action = `<button class="primary" type="button" data-upgrade-id="${row.id}" ${canAfford ? "" : "disabled"}>${row.nextPrice} C</button>`;
      }
      return `<article class="upgrade-row">
        <div>
          <b>${escapeHtml(row.displayName)} <small>${levelText}</small></b>
          <p>${escapeHtml(row.description)}</p>
        </div>
        ${action}
      </article>`;
    }).join("");
  }

  private purchaseUpgrade(id: UpgradeId): void {
    const result = this.progression.purchaseUpgrade(id);
    if (!result.ok) {
      this.showNotice(result.reason, "error");
      return;
    }
    this.saveService.save(this.progression);
    this.renderPrep();
    const name = this.progression.shopCatalog().find((row) => row.id === id)?.displayName ?? id;
    this.showNotice(`${name} 업그레이드 완료 (−${result.spent}C)`, "success");
  }

  private confirmPrepStart(): void {
    this.closePrep(false);
    if (this.scene?.scene.isPaused()) this.scene.scene.resume();
    this.startRound(false);
  }

  private openProductAnalysis(): void {
    if (this.analysisOpen) {
      this.closeAnalysis();
      return;
    }
    if (!this.session) return;
    const carry = this.session.getCarry();
    if (carry.kind !== "product") return;
    const rows = productAnalysisRows(carry.orderId, carry.result);
    this.openAnalysis("결과 분석", "칩 이름은 표시되지 않습니다. Z로 닫기", rows, carry.prompt);
  }

  private openOrderAnalysis(): void {
    if (this.analysisOpen) {
      this.closeAnalysis();
      return;
    }
    if (!this.session) return;
    const carry = this.session.getCarry();
    if (carry.kind !== "order") return;
    const order = ordersById.get(carry.orderId);
    if (!order) return;
    const rows = orderAnalysisRows(order);
    this.openAnalysis("주문 분석", "칩 이름은 비공개입니다. Z로 닫기", rows, carry.prompt);
  }

  private openAnalysis(title: string, hint: string, rows: Array<{ label: string; matched?: boolean; detail: string }>, prompt: string): void {
    this.closeInspect();
    this.closePrep(false);
    this.analysisOpen = true;
    this.byId("analysis-body").innerHTML = `
      <p class="inspect-eyebrow">분석기</p>
      <h2>${escapeHtml(title)}</h2>
      <blockquote class="inspect-prompt">“${escapeHtml(prompt)}”</blockquote>
      <ul class="analysis-list">
        ${rows.map((row) => {
          const badge = row.matched === undefined
            ? ""
            : `<em class="${row.matched ? "ok" : "bad"}">${row.matched ? "일치" : "불일치"}</em>`;
          return `<li><span>${escapeHtml(row.label)}</span><b>${escapeHtml(row.detail)}</b>${badge}</li>`;
        }).join("")}
      </ul>
      <p class="inspect-hint">${escapeHtml(hint)}</p>`;
    this.byId("analysis-modal").classList.remove("is-hidden");
    this.scene?.scene.pause();
  }

  private closeAnalysis(): void {
    this.analysisOpen = false;
    this.byId("analysis-modal").classList.add("is-hidden");
    this.byId("analysis-body").innerHTML = "";
    this.resumeSceneIfIdle();
  }

  private onRoundFinished(stats: RoundStats): void {
    this.closeInspect();
    const round = roundsById.get(stats.roundId)!;
    const score = this.scorer.score(stats, round.baseReward);
    if (!this.progression.isComplete(stats.roundId)) {
      this.progression.completeActiveRound(score.total, score.creditReward);
    } else {
      this.progression.recordBestScore(stats.roundId, score.total);
      this.progression.addCredits(Math.floor(score.creditReward * 0.5));
    }
    this.saveService.save(this.progression);
    this.renderMenu();
    this.showRoundSummary(stats, score);
  }

  private showRoundSummary(stats: RoundStats, score: RoundScoreBreakdown): void {
    this.roundSummaryOpen = true;
    const next = this.progression.nextRoundId();
    const isTutorial = !!roundsById.get(stats.roundId)?.isTutorial;
    if (isTutorial) {
      this.byId("round-summary-body").innerHTML = `
        <p class="inspect-eyebrow">튜토리얼</p>
        <h2>튜토리얼 완료!</h2>
        <p class="inspect-hint">조작을 익혔습니다. 본 라운드에서 손님을 응대해 보세요.</p>
        <div class="result-summary success"><b>보상 +${score.creditReward} 크레딧</b><span>다음으로 라운드 1이 열립니다.</span></div>`;
      this.byId<HTMLButtonElement>("next-round").hidden = !next;
      this.byId<HTMLButtonElement>("next-round").textContent = next ? "준비 타임 →" : "완료";
      this.byId("round-summary-modal").classList.remove("is-hidden");
      this.scene?.scene.pause();
      return;
    }
    this.byId("round-summary-body").innerHTML = `
      <p class="inspect-eyebrow">라운드 정산</p>
      <h2>등급 ${score.grade} · ${score.total}점</h2>
      <ul class="score-list">
        <li><span>납품 성공</span><b>${stats.passedDeliveries}/${stats.targetCustomers}</b><em>+${score.deliveryScore}</em></li>
        <li><span>VRAM 효율</span><b>${stats.vramUsed} / 이상적 ${score.idealVram}</b><em>+${score.efficiencyScore}</em></li>
        <li><span>이탈 방어</span><b>이탈 ${stats.leftCustomers}</b><em>+${score.retentionScore}</em></li>
        <li><span>예산 준수</span><b>${stats.vramUsed}/${stats.vramBudget}${score.overBudget ? ` (초과 ${score.overBudget})` : ""}</b><em>+${score.budgetScore}</em></li>
      </ul>
      <div class="result-summary success"><b>보상 +${score.creditReward} 크레딧</b><span>최적 파이프라인일수록 VRAM 효율 점수가 올라갑니다.</span></div>`;
    this.byId<HTMLButtonElement>("next-round").hidden = !next;
    this.byId<HTMLButtonElement>("next-round").textContent = next ? "준비 타임 →" : "모든 라운드 완료";
    this.byId("round-summary-modal").classList.remove("is-hidden");
    this.scene?.scene.pause();
  }

  private closeRoundSummary(): void {
    this.roundSummaryOpen = false;
    this.byId("round-summary-modal").classList.add("is-hidden");
    this.resumeSceneIfIdle();
  }

  /** Resume kitchen only when no pause-owning overlay remains open. */
  private resumeSceneIfIdle(): void {
    if (!this.scene?.scene.isPaused()) return;
    if (this.unlockTutorialOpen || this.prepOpen || this.analysisOpen || this.roundSummaryOpen || this.inspectOpen) {
      return;
    }
    this.scene.scene.resume();
  }

  private advanceToPrep(): void {
    const next = activateNextRoundForPrep(this.progression);
    if (!next) {
      this.showNotice("모든 라운드를 완료했습니다!", "success");
      this.closeRoundSummary();
      return;
    }
    this.saveService.save(this.progression);
    this.closeRoundSummary();
    this.openPrep();
  }

  private clearSave(): void {
    this.saveService.clear();
    this.progression = ProgressionService.createDefault();
    this.session = undefined;
    this.closeInspect();
    this.closeRoundSummary();
    this.closeUnlockTutorial(false);
    this.closePrep(false);
    this.closeAnalysis();
    this.showMenu();
    this.renderMenu();
  }

  private showMenu(): void {
    this.closeInspect();
    this.closeRoundSummary();
    this.closeUnlockTutorial(false);
    this.closePrep(false);
    this.closeAnalysis();
    this.byId("game-screen").classList.add("is-hidden");
    this.byId("menu-screen").classList.remove("is-hidden");
  }

  private showNotice(message: string, tone: "error" | "info" | "success" = "info"): void {
    const notice = this.byId("toast");
    notice.textContent = message;
    notice.className = `toast is-visible ${tone}`;
    window.setTimeout(() => notice.classList.remove("is-visible"), 2800);
  }

  private byId<T extends HTMLElement = HTMLElement>(id: string): T {
    return this.root.querySelector<T>(`#${id}`)!;
  }
}

function carryLabel(carry: CarryItem): string {
  if (carry.kind === "none") return "손: 비움";
  if (carry.kind === "order") return "주문서 (X)";
  if (carry.kind === "moduleChip") return modulesById.get(carry.moduleId)?.displayName ?? "칩";
  return "폴라로이드 (X)";
}

function bindPreviewPhotoFallbacks(root: HTMLElement): void {
  root.querySelectorAll<HTMLImageElement>("img.preview-photo[data-fallback]").forEach((img) => {
    const frame = img.closest(".preview");
    const showProcedural = () => {
      img.classList.add("is-missing");
      frame?.classList.add("preview--procedural-fallback");
    };
    img.addEventListener("error", showProcedural, { once: true });
    if (img.complete && img.naturalWidth === 0) showProcedural();
  });
}

function carryIconSrc(carry: CarryItem): string | null {
  if (carry.kind === "order") return "/assets/art/items/item_order.png";
  if (carry.kind === "product") return "/assets/art/items/item_product.png";
  if (carry.kind === "moduleChip") return modulesById.get(carry.moduleId)?.iconKey ?? null;
  return null;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function shell(): string {
  return `<main class="app-shell">
  <section id="menu-screen" class="menu-screen">
    <div class="brand-chip">MEOWDEL</div>
    <h1>Meowdel</h1>
    <p class="hero-copy">라운드마다 손님을 응대하고<br>VRAM을 아끼며 최적 파이프라인을 만드세요</p>
    <p id="menu-progress" class="menu-progress"></p>
    <div class="menu-actions">
      <button id="start-game" class="primary">새 게임 시작</button>
      <button id="continue-game" class="secondary">이어서 하기</button>
    </div>
    <p class="menu-note">WASD 이동 · Z 상호작용 · C 대시 · X 확인 · 업그레이드는 라운드 시작 전 준비 타임</p>
  </section>
  <section id="game-screen" class="game-screen is-hidden">
    <header class="topbar">
      <div>
        <span class="brand-chip small">MEOWDEL</span>
        <span id="order-step" class="order-step">1 / 7</span>
      </div>
      <div class="top-actions">
        <span id="credits" class="credits">0 C</span>
        <span id="waiting-count" class="factory-status">손님 0/3</span>
        <span id="vram-status" class="factory-status vram-status">VRAM 0/24</span>
        <span id="vram-preview" class="factory-status">이번 생산 0</span>
        <span id="carry-status" class="factory-status carry-status">
          <img id="carry-icon" class="carry-icon is-hidden" alt="" width="22" height="22" />
          <span id="carry-label">손: 비움</span>
        </span>
        <button id="reset-line" class="ghost">라인 비우기</button>
        <button id="clear-save" class="ghost danger">저장 초기화</button>
        <button id="back-to-menu" class="ghost">메뉴</button>
      </div>
    </header>
    <div class="game-layout kitchen-layout kitchen-layout--wide">
      <aside class="left-panel panel">
        <div class="panel-heading"><span>현재 라운드</span><small>해금 모듈 칩</small></div>
        <h2 id="order-title" class="side-title"></h2>
        <p id="order-request" class="side-copy"></p>
        <p id="tutorial-message" class="tutorial-message side-tutorial"></p>
        <ul id="shelf-guide" class="shelf-guide"></ul>
      </aside>
      <section class="factory-column">
        <div id="game-canvas" class="game-canvas" aria-label="주방 공장 공간"></div>
        <p class="canvas-help">WASD 이동 · Z 상호작용 · C 대시 · X 들여다보기 · 업그레이드는 준비 타임</p>
      </section>
    </div>
  </section>
  <div id="inspect-modal" class="inspect-modal is-hidden" role="dialog" aria-modal="true" aria-label="들여다보기">
    <div class="inspect-card">
      <button id="inspect-close" class="ghost inspect-close" type="button">닫기 (X)</button>
      <div id="inspect-body"></div>
    </div>
  </div>
  <div id="prep-modal" class="inspect-modal is-hidden" role="dialog" aria-modal="true" aria-label="준비 타임">
    <div class="inspect-card upgrade-shop-card prep-card">
      <p class="inspect-eyebrow">준비 타임</p>
      <h2>공장 업그레이드</h2>
      <p id="prep-round-title" class="prep-round-title"></p>
      <p id="prep-round-summary" class="prep-round-summary"></p>
      <p class="upgrade-shop-balance">보유 크레딧 <b id="prep-credits">0 C</b></p>
      <div id="prep-shop-list" class="upgrade-shop-list"></div>
      <button id="prep-start" class="primary next-round-btn" type="button">라운드 시작 →</button>
    </div>
  </div>
  <div id="analysis-modal" class="inspect-modal is-hidden" role="dialog" aria-modal="true" aria-label="분석기">
    <div class="inspect-card">
      <button id="analysis-close" class="ghost inspect-close" type="button">닫기 (Z)</button>
      <div id="analysis-body"></div>
    </div>
  </div>
  <div id="round-summary-modal" class="inspect-modal is-hidden" role="dialog" aria-modal="true" aria-label="라운드 정산">
    <div class="inspect-card">
      <button id="round-summary-close" class="ghost inspect-close" type="button">닫기</button>
      <div id="round-summary-body"></div>
      <button id="next-round" class="primary next-round-btn">준비 타임 →</button>
    </div>
  </div>
  <div id="unlock-tutorial" class="unlock-tutorial is-hidden" role="dialog" aria-modal="true" aria-label="새 모듈 해금">
    <div class="unlock-tutorial-card">
      <p class="inspect-eyebrow">새 모듈 해금</p>
      <h2>이번 라운드 새 칩</h2>
      <div id="unlock-tutorial-body" class="unlock-tutorial-body"></div>
      <button id="unlock-tutorial-ok" class="primary" type="button">알겠어요</button>
    </div>
  </div>
  <div id="toast" class="toast" role="status"></div>
</main>`;
}
