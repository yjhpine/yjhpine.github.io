import type { ProgressionService } from "../core/progression/ProgressionService";

/** Move progression to the next round for prep shopping. Returns the activated id. */
export function activateNextRoundForPrep(progression: ProgressionService): string | undefined {
  const next = progression.nextRoundId();
  if (!next) return undefined;
  progression.activateRound(next);
  return next;
}
