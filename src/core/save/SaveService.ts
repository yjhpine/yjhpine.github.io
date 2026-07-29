import type { SaveData } from "../types";
import { ProgressionService } from "../progression/ProgressionService";

const STORAGE_KEY = "ai-factory-save-v1";

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class SaveService {
  constructor(private readonly storage: StorageAdapter = localStorage) {}

  load(): ProgressionService {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return ProgressionService.createDefault();
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      if (parsed.version !== 1 || !Array.isArray(parsed.completedOrderIds) || !Array.isArray(parsed.unlockedModuleIds) || typeof parsed.credits !== "number" || typeof parsed.activeOrderId !== "string") return ProgressionService.createDefault();
      return new ProgressionService(parsed as SaveData);
    } catch { return ProgressionService.createDefault(); }
  }

  save(progression: ProgressionService): void { this.storage.setItem(STORAGE_KEY, JSON.stringify(progression.snapshot)); }
  clear(): void { this.storage.removeItem(STORAGE_KEY); }
}
