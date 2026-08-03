import type { GenerationResult } from "../core/types";
import { buildPreviewModel } from "../core/generation/previewModel";

export function renderPreview(result: GenerationResult): string {
  const model = buildPreviewModel(result);
  const effects = model.effects.length
    ? `<ul class="preview-effects">${model.effects.map((effect) => `<li>${effect}</li>`).join("")}</ul>`
    : "";
  const scores = `
    <div class="preview-scores" aria-label="품질 점수">
      <span>주제 <b>${Math.round(result.subjectAccuracy)}</b></span>
      <span>스타일 <b>${Math.round(result.styleMatch)}</b></span>
      <span>구도 <b>${Math.round(result.composition)}</b></span>
      <span>선명 <b>${Math.round(result.sharpness)}</b></span>
    </div>`;

  return `
    <div class="preview-stage">
      <div class="${model.classes.join(" ")}" aria-label="${model.previewKey}">
        <span class="preview-grain" aria-hidden="true"></span>
        <span class="preview-sky" aria-hidden="true"></span>
        <span class="preview-hill preview-hill-a" aria-hidden="true"></span>
        <span class="preview-hill preview-hill-b" aria-hidden="true"></span>
        <span class="sun" aria-hidden="true"></span>
        <span class="moon" aria-hidden="true"></span>
        <span class="star star-a" aria-hidden="true"></span>
        <span class="star star-b" aria-hidden="true"></span>
        <span class="star star-c" aria-hidden="true"></span>
        <span class="sparkle sparkle-a" aria-hidden="true"></span>
        <span class="sparkle sparkle-b" aria-hidden="true"></span>
        <span class="cloud cloud-a" aria-hidden="true"></span>
        <span class="cloud cloud-b" aria-hidden="true"></span>
        <span class="ground" aria-hidden="true"></span>
        <span class="cat" aria-hidden="true">
          <i class="ear left"></i>
          <i class="ear right"></i>
          <i class="body"></i>
          <i class="face"></i>
          <i class="eye left"></i>
          <i class="eye right"></i>
          <i class="nose"></i>
          <i class="whisker w1"></i>
          <i class="whisker w2"></i>
          <i class="whisker w3"></i>
          <i class="whisker w4"></i>
          <i class="hat"></i>
        </span>
        <span class="qc-stamp" aria-hidden="true">QC</span>
        <span class="result-label">${model.label}</span>
      </div>
      ${effects}
      ${scores}
    </div>`;
}
