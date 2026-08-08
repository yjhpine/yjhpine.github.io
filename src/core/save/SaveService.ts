import type { SaveData } from "../types";
import { ProgressionService } from "../progression/ProgressionService";

const STORAGE_KEY = "ai-factory-save-v2";

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class SaveService {
  constructor(private readonly storage: StorageAdapter = localStorage) {}

  load(): ProgressionService {
    try {
      const raw = this.storage.getItem(STORAGE_KEY) ?? this.storage.getItem("ai-factory-save-v1");
      if (!raw) return ProgressionService.createDefault();
      const parsed = JSON.parse(raw) as Partial<SaveData> & { version?: number; activeOrderId?: string; completedOrderIds?: string[] };
      if (parsed.version === 2
        && Array.isArray(parsed.completedRoundIds)
        && Array.isArray(parsed.unlockedModuleIds)
        && typeof parsed.credits === "number"
        && typeof parsed.activeRoundId === "string") {
        return new ProgressionService({
          version: 2,
          credits: parsed.credits,
          completedRoundIds: parsed.completedRoundIds,
          unlockedModuleIds: parsed.unlockedModuleIds,
          introducedModuleIds: Array.isArray(parsed.introducedModuleIds) ? parsed.introducedModuleIds : [],
          tutorialStage: typeof parsed.tutorialStage === "number" ? parsed.tutorialStage : 1,
          activeRoundId: parsed.activeRoundId,
          bestRoundScores: parsed.bestRoundScores ?? {},
          upgradeLevels: parsed.upgradeLevels && typeof parsed.upgradeLevels === "object"
            ? parsed.upgradeLevels
            : {},
        });
      }
      return ProgressionService.createDefault();
    } catch {
      return ProgressionService.createDefault();
    }
  }

  save(progression: ProgressionService): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(progression.snapshot));
  }

  clear(): void {
    this.storage.removeItem(STORAGE_KEY);
    this.storage.removeItem("ai-factory-save-v1");
  }
}
