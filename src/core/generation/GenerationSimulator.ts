import { modulesById } from "../../data/modules";
import type { GenerationResult, GenerationTag, ModuleDefinition, OrderDefinition, QualityScores } from "../types";
import { createPreviewKey, qualityBandFromScores } from "./previewModel";

export class GenerationSimulator {
  simulate(order: OrderDefinition, moduleIds: string[]): GenerationResult {
    const scores: QualityScores = { ...order.baseScores };
    const tags: GenerationTag[] = [];
    let processingTime = 0;
    for (const moduleId of moduleIds) {
      const definition = modulesById.get(moduleId);
      if (!definition) continue;
      processingTime += definition.processingTime;
      applyDefinition(definition, scores, tags);
    }
    const hasInspection = tags.includes("quality-inspection");
    const band = qualityBandFromScores(scores);
    return {
      ...scores,
      processingTime,
      appliedTags: tags,
      issues: [],
      hasDelivery: moduleIds.includes("delivery-bay"),
      hasInspection,
      previewKey: createPreviewKey(tags, band),
    };
  }
}

function applyDefinition(definition: ModuleDefinition, scores: QualityScores, tags: GenerationTag[]): void {
  for (const effect of definition.effects) {
    if (effect.tag && !tags.includes(effect.tag)) tags.push(effect.tag);
    if (effect.scores) for (const [key, value] of Object.entries(effect.scores) as [keyof QualityScores, number][]) scores[key] += value;
  }
}
