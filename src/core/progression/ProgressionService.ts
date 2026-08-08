import { rounds, roundsById } from "../../data/rounds";
import {
  computeUpgradeEffects,
  upgrades,
  upgradesById,
  type UpgradeEffects,
  type UpgradeId,
} from "../../data/upgrades";
import type { SaveData } from "../types";

export type PurchaseUpgradeResult =
  | { ok: true; level: number; spent: number; effects: UpgradeEffects }
  | { ok: false; reason: string };

export class ProgressionService {
  constructor(private data: SaveData) {}

  static createDefault(): ProgressionService {
    return new ProgressionService({
      version: 2,
      credits: 0,
      completedRoundIds: [],
      unlockedModuleIds: ["image-maker"],
      introducedModuleIds: [],
      tutorialStage: 0,
      activeRoundId: "r00",
      bestRoundScores: {},
      upgradeLevels: {},
    });
  }

  get snapshot(): SaveData { return structuredClone(this.data); }
  get currentRoundId(): string { return this.data.activeRoundId; }
  get credits(): number { return this.data.credits; }
  get unlockedModuleIds(): string[] { return [...this.data.unlockedModuleIds]; }
  get introducedModuleIds(): string[] { return [...this.data.introducedModuleIds]; }
  get bestRoundScores(): Record<string, number> { return { ...this.data.bestRoundScores }; }
  get upgradeLevels(): Record<string, number> { return { ...this.data.upgradeLevels }; }
  get upgradeEffects(): UpgradeEffects { return computeUpgradeEffects(this.data.upgradeLevels); }

  activateRound(roundId: string): void { this.data.activeRoundId = roundId; }
  addCredits(amount: number): void { this.data.credits += amount; }
  spendCredits(amount: number): boolean {
    if (amount < 0 || this.data.credits < amount) return false;
    this.data.credits -= amount;
    return true;
  }
  isComplete(roundId: string): boolean { return this.data.completedRoundIds.includes(roundId); }
  nextRoundId(): string | undefined {
    const index = rounds.findIndex((round) => round.id === this.data.activeRoundId);
    return rounds[index + 1]?.id;
  }

  getUpgradeLevel(id: UpgradeId | string): number {
    return this.data.upgradeLevels[id] ?? 0;
  }

  isUpgradeUnlocked(id: UpgradeId | string): boolean {
    const definition = upgradesById.get(id as UpgradeId);
    if (!definition) return false;
    return this.isComplete(definition.unlockAfterRoundId);
  }

  /** Shop rows: unlocked upgrades first, then locked teasers. */
  shopCatalog(): Array<{
    id: UpgradeId;
    displayName: string;
    description: string;
    level: number;
    maxLevel: number;
    nextPrice: number | undefined;
    unlocked: boolean;
    unlockAfterRoundId: string;
  }> {
    return upgrades.map((definition) => {
      const level = this.getUpgradeLevel(definition.id);
      const unlocked = this.isUpgradeUnlocked(definition.id);
      const next = level < definition.maxLevel ? definition.levels[level] : undefined;
      return {
        id: definition.id,
        displayName: definition.displayName,
        description: definition.description,
        level,
        maxLevel: definition.maxLevel,
        nextPrice: next?.price,
        unlocked,
        unlockAfterRoundId: definition.unlockAfterRoundId,
      };
    });
  }

  purchaseUpgrade(id: UpgradeId | string): PurchaseUpgradeResult {
    const definition = upgradesById.get(id as UpgradeId);
    if (!definition) return { ok: false, reason: "알 수 없는 업그레이드입니다." };
    if (!this.isUpgradeUnlocked(definition.id)) {
      return { ok: false, reason: `${definition.unlockAfterRoundId} 클리어 후 해금됩니다.` };
    }
    const current = this.getUpgradeLevel(definition.id);
    if (current >= definition.maxLevel) return { ok: false, reason: "이미 최대 레벨입니다." };
    const next = definition.levels[current]!;
    if (!this.spendCredits(next.price)) return { ok: false, reason: "크레딧이 부족합니다." };
    this.data.upgradeLevels[definition.id] = current + 1;
    return {
      ok: true,
      level: current + 1,
      spent: next.price,
      effects: this.upgradeEffects,
    };
  }

  /** Chip modules available in this round that have not yet shown an unlock tutorial. */
  pendingModuleTutorials(roundId = this.data.activeRoundId): string[] {
    const round = roundsById.get(roundId);
    if (!round) return [];
    const introduced = new Set(this.data.introducedModuleIds);
    return round.availableModuleIds.filter((moduleId) => !introduced.has(moduleId));
  }

  markModulesIntroduced(moduleIds: string[]): void {
    this.data.introducedModuleIds = [...new Set([...this.data.introducedModuleIds, ...moduleIds])];
  }

  completeActiveRound(score: number, creditReward: number): void {
    const firstClear = !this.isComplete(this.data.activeRoundId);
    if (firstClear) this.data.completedRoundIds.push(this.data.activeRoundId);
    this.recordBestScore(this.data.activeRoundId, score);
    this.data.credits += creditReward;
    if (!firstClear) return;
    const next = this.nextRoundId();
    if (next) {
      const round = roundsById.get(next)!;
      this.data.unlockedModuleIds = [...new Set([...this.data.unlockedModuleIds, ...round.availableModuleIds])];
      this.data.tutorialStage = Math.min(7, this.data.tutorialStage + 1);
    }
  }

  recordBestScore(roundId: string, score: number): void {
    const previousBest = this.data.bestRoundScores[roundId] ?? 0;
    this.data.bestRoundScores[roundId] = Math.max(previousBest, score);
  }
}
