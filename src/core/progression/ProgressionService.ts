import { rounds, roundsById } from "../../data/rounds";
import {
  computeUpgradeEffects,
  upgrades,
  upgradesById,
  type UpgradeEffects,
  type UpgradeId,
} from "../../data/upgrades";
import { CHIP_MODULE_IDS } from "../kitchen/types";
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
      activeRoundId: "r00",
      bestRoundScores: {},
      upgradeLevels: {},
    });
  }

  /** Sanitize loaded save payloads (clamp ids, levels, credits). */
  static normalizeSaveData(raw: SaveData): SaveData {
    const knownRounds = new Set(rounds.map((round) => round.id));
    const chipSet = new Set(CHIP_MODULE_IDS as readonly string[]);
    const activeRoundId = knownRounds.has(raw.activeRoundId) ? raw.activeRoundId : "r00";
    const completedRoundIds = [...new Set(raw.completedRoundIds.filter((id) => knownRounds.has(id)))];
    const unlockedModuleIds = [...new Set(
      raw.unlockedModuleIds.filter((id) => chipSet.has(id)),
    )];
    if (!unlockedModuleIds.includes("image-maker")) unlockedModuleIds.unshift("image-maker");
    const introducedModuleIds = [...new Set(
      (raw.introducedModuleIds ?? []).filter((id) => chipSet.has(id)),
    )];
    const bestRoundScores: Record<string, number> = {};
    for (const [roundId, score] of Object.entries(raw.bestRoundScores ?? {})) {
      if (!knownRounds.has(roundId) || typeof score !== "number" || !Number.isFinite(score)) continue;
      bestRoundScores[roundId] = Math.max(0, Math.floor(score));
    }
    const upgradeLevels: Record<string, number> = {};
    for (const [id, level] of Object.entries(raw.upgradeLevels ?? {})) {
      const definition = upgradesById.get(id as UpgradeId);
      if (!definition || typeof level !== "number" || !Number.isFinite(level)) continue;
      upgradeLevels[id] = Math.max(0, Math.min(definition.maxLevel, Math.floor(level)));
    }
    return {
      version: 2,
      credits: Math.max(0, Math.floor(typeof raw.credits === "number" && Number.isFinite(raw.credits) ? raw.credits : 0)),
      completedRoundIds,
      unlockedModuleIds,
      introducedModuleIds,
      activeRoundId,
      bestRoundScores,
      upgradeLevels,
    };
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

  /** Merge a round's available module chips into the progression unlock set. */
  unlockModulesForRound(roundId: string): void {
    const round = roundsById.get(roundId);
    if (!round) return;
    this.data.unlockedModuleIds = [...new Set([...this.data.unlockedModuleIds, ...round.availableModuleIds])];
  }

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

  /** Shop rows for every known upgrade (buyable from the start; balance/max level gate purchase). */
  shopCatalog(): Array<{
    id: UpgradeId;
    displayName: string;
    description: string;
    level: number;
    maxLevel: number;
    nextPrice: number | undefined;
  }> {
    return upgrades.map((definition) => {
      const level = this.getUpgradeLevel(definition.id);
      const next = level < definition.maxLevel ? definition.levels[level] : undefined;
      return {
        id: definition.id,
        displayName: definition.displayName,
        description: definition.description,
        level,
        maxLevel: definition.maxLevel,
        nextPrice: next?.price,
      };
    });
  }

  purchaseUpgrade(id: UpgradeId | string): PurchaseUpgradeResult {
    const definition = upgradesById.get(id as UpgradeId);
    if (!definition) return { ok: false, reason: "알 수 없는 업그레이드입니다." };
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
    // Next-round chip unlocks happen in unlockModulesForRound via prep advance.
  }

  recordBestScore(roundId: string, score: number): void {
    const previousBest = this.data.bestRoundScores[roundId] ?? 0;
    this.data.bestRoundScores[roundId] = Math.max(previousBest, score);
  }
}
