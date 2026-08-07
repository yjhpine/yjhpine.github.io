import type { KitchenSession } from "../core/kitchen/KitchenSession";
import type { KitchenActionResult } from "../core/kitchen/types";

export type TutorialStep =
  | "pick-order"
  | "insert-input"
  | "pick-chip"
  | "insert-slot"
  | "produce"
  | "wait-output"
  | "pick-output"
  | "deliver"
  | "done";

export type TutorialTarget =
  | { kind: "customer"; id?: string }
  | { kind: "input" }
  | { kind: "produce" }
  | { kind: "output" }
  | { kind: "slot"; index?: number }
  | { kind: "shelf"; moduleId: string };

const STEP_HINTS: Record<TutorialStep, string> = {
  "pick-order": "손님에게 다가가 Z로 주문서를 집으세요.",
  "insert-input": "입력기(왼쪽)에 다가가 Z로 주문서를 넣으세요.",
  "pick-chip": "하단 선반의 그림 제작기 칩을 Z로 집으세요.",
  "insert-slot": "빈 슬롯에 다가가 Z로 칩을 꽂으세요.",
  "produce": "생산기에서 Z를 눌러 생산을 시작하세요.",
  "wait-output": "생산이 끝날 때까지 기다리세요. 출구를 보세요.",
  "pick-output": "출구에서 Z로 완성 이미지를 집으세요.",
  "deliver": "손님에게 다가가 Z로 이미지를 전달하세요.",
  done: "튜토리얼 완료! 본 라운드로 넘어갑니다.",
};

export class TutorialGuide {
  private step: TutorialStep = "pick-order";
  private active = false;

  reset(enabled: boolean): void {
    this.active = enabled;
    this.step = "pick-order";
  }

  isActive(): boolean {
    return this.active && this.step !== "done";
  }

  isEnabled(): boolean {
    return this.active;
  }

  getStep(): TutorialStep {
    return this.step;
  }

  getHint(): string {
    return STEP_HINTS[this.step];
  }

  /** Keep wait-output → pick-output in sync with production finish. */
  sync(session: KitchenSession): boolean {
    if (!this.active) return false;
    if (this.step === "wait-output" && session.getOutput().product) {
      this.step = "pick-output";
      return true;
    }
    if (this.step === "produce" && session.isProducing()) {
      this.step = "wait-output";
      return true;
    }
    if (this.step === "produce" && session.getOutput().product) {
      this.step = "pick-output";
      return true;
    }
    return false;
  }

  allowedTarget(session: KitchenSession): TutorialTarget | undefined {
    if (!this.isActive()) return undefined;
    const waiting = session.getWaitingCustomers();
    const customer = waiting[0];
    switch (this.step) {
      case "pick-order":
        return customer ? { kind: "customer", id: customer.id } : undefined;
      case "insert-input":
        return { kind: "input" };
      case "pick-chip":
        return { kind: "shelf", moduleId: "image-maker" };
      case "insert-slot": {
        const empty = session.getSlots().findIndex((slot) => !slot);
        return { kind: "slot", index: empty >= 0 ? empty : 0 };
      }
      case "produce":
        return { kind: "produce" };
      case "wait-output":
        return undefined;
      case "pick-output":
        return { kind: "output" };
      case "deliver":
        return customer ? { kind: "customer", id: customer.id } : undefined;
      default:
        return undefined;
    }
  }

  matchesTarget(
    session: KitchenSession,
    target: {
      kind: string;
      id?: string;
      index?: number;
      moduleId?: string;
    },
  ): boolean {
    const allowed = this.allowedTarget(session);
    if (!allowed) return false;
    if (allowed.kind !== target.kind) return false;
    if (allowed.kind === "customer" && allowed.id && target.id && allowed.id !== target.id) return false;
    if (allowed.kind === "shelf" && allowed.moduleId !== target.moduleId) return false;
    if (allowed.kind === "slot" && allowed.index !== undefined && target.index !== undefined && allowed.index !== target.index) {
      // Any empty slot is fine for insert.
      return !session.getSlots()[target.index];
    }
    return true;
  }

  onAfterAction(result: KitchenActionResult, session: KitchenSession): boolean {
    if (!this.active || !result.ok) return false;
    const before = this.step;
    switch (this.step) {
      case "pick-order":
        if (session.getCarry().kind === "order") this.step = "insert-input";
        break;
      case "insert-input":
        if (session.getInput().order) this.step = "pick-chip";
        break;
      case "pick-chip":
        if (session.getCarry().kind === "moduleChip") this.step = "insert-slot";
        break;
      case "insert-slot":
        if (session.getSlots().some(Boolean) && session.getCarry().kind === "none") this.step = "produce";
        break;
      case "produce":
        if (session.isProducing()) this.step = "wait-output";
        else if (session.getOutput().product) this.step = "pick-output";
        break;
      case "pick-output":
        if (session.getCarry().kind === "product") this.step = "deliver";
        break;
      case "deliver":
        if (result.delivered || session.isRoundFinished()) this.step = "done";
        break;
      default:
        break;
    }
    return this.step !== before;
  }

  blockDrop(): boolean {
    return this.isActive();
  }
}
