import { rounds, roundsById } from "../../data/rounds";
import type { SaveData } from "../types";

export class ProgressionService {
  constructor(private data: SaveData) {}

  static createDefault(): ProgressionService {
    return new ProgressionService({
      version: 2,
      credits: 0,
      completedRoundIds: [],
      unlockedModuleIds: ["image-maker"],
      introducedModuleIds: [],
      tutorialStage: 1,
      activeRoundId: "r01",
      bestRoundScores: {},
    });
  }

  get snapshot(): SaveData { return structuredClone(this.data); }
  get currentRoundId(): string { return this.data.activeRoundId; }
  get credits(): number { return this.data.credits; }
  get unlockedModuleIds(): string[] { return [...this.data.unlockedModuleIds]; }
  get introducedModuleIds(): string[] { return [...this.data.introducedModuleIds]; }
  get bestRoundScores(): Record<string, number> { return { ...this.data.bestRoundScores }; }

  activateRound(roundId: string): void { this.data.activeRoundId = roundId; }
  addCredits(amount: number): void { this.data.credits += amount; }
  isComplete(roundId: string): boolean { return this.data.completedRoundIds.includes(roundId); }
  nextRoundId(): string | undefined {
    const index = rounds.findIndex((round) => round.id === this.data.activeRoundId);
    return rounds[index + 1]?.id;
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
      this.data.tutorialStage = Math.min(6, this.data.tutorialStage + 1);
    }
  }

  recordBestScore(roundId: string, score: number): void {
    const previousBest = this.data.bestRoundScores[roundId] ?? 0;
    this.data.bestRoundScores[roundId] = Math.max(previousBest, score);
  }
}
