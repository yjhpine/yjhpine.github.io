import type { GenerationResult, GenerationTag } from "../types";

export type PreviewQualityBand = "lo" | "mid" | "hi";
export type PreviewStyle = "plain" | "fairytale";
export type PreviewHat = "hat" | "no-hat";
export type PreviewComposition = "offset" | "center";
export type PreviewSharpness = "soft" | "sharp";

/** 16-image pack: style × hat × composition × sharpness. QC stamp + quality band are overlays. */
export type PreviewAssetKey =
  `cat-${PreviewStyle}-${PreviewHat}-${PreviewComposition}-${PreviewSharpness}`;

export interface PreviewModel {
  classes: string[];
  previewKey: string;
  /** Filename stem for the 16-image pack (no QC/band). */
  assetKey: PreviewAssetKey;
  /** Public URL for the prepared photo. */
  imageSrc: string;
  label: string;
  effects: string[];
  qualityBand: PreviewQualityBand;
  checked: boolean;
}

const EFFECT_LABELS: Partial<Record<GenerationTag, string>> = {
  generator: "기본 초안",
  "style-fairytale": "동화풍",
  "no-hat": "모자 제거",
  "centered-composition": "중앙 구도",
  sharpness: "선명화",
  "quality-inspection": "품질 검사",
};

const STYLES: PreviewStyle[] = ["plain", "fairytale"];
const HATS: PreviewHat[] = ["hat", "no-hat"];
const COMPOSITIONS: PreviewComposition[] = ["offset", "center"];
const SHARPNESSES: PreviewSharpness[] = ["soft", "sharp"];

/** Canonical 16 filenames the art pack must provide. */
export const PREVIEW_ASSET_KEYS: PreviewAssetKey[] = STYLES.flatMap((style) =>
  HATS.flatMap((hat) =>
    COMPOSITIONS.flatMap((composition) =>
      SHARPNESSES.map((sharpness) => `cat-${style}-${hat}-${composition}-${sharpness}` as PreviewAssetKey),
    ),
  ),
);

export const PREVIEW_ASSET_DIR = "/assets/art/previews";

export function qualityBandFromScores(result: Pick<GenerationResult, "subjectAccuracy" | "styleMatch" | "composition" | "sharpness">): PreviewQualityBand {
  const average = (result.subjectAccuracy + result.styleMatch + result.composition + result.sharpness) / 4;
  if (average >= 80) return "hi";
  if (average >= 50) return "mid";
  return "lo";
}

export function createPreviewAssetKey(tags: readonly GenerationTag[]): PreviewAssetKey {
  const style: PreviewStyle = tags.includes("style-fairytale") ? "fairytale" : "plain";
  const hat: PreviewHat = tags.includes("no-hat") ? "no-hat" : "hat";
  const composition: PreviewComposition = tags.includes("centered-composition") ? "center" : "offset";
  const sharpness: PreviewSharpness = tags.includes("sharpness") ? "sharp" : "soft";
  return `cat-${style}-${hat}-${composition}-${sharpness}`;
}

export function previewImageSrc(assetKey: PreviewAssetKey): string {
  return `${PREVIEW_ASSET_DIR}/${assetKey}.png`;
}

export function createPreviewKey(tags: GenerationTag[], band: PreviewQualityBand): string {
  return [
    createPreviewAssetKey(tags),
    tags.includes("quality-inspection") ? "checked" : "unchecked",
    band,
  ].join("-");
}

export function buildPreviewModel(result: GenerationResult): PreviewModel {
  const tags = new Set(result.appliedTags);
  const qualityBand = qualityBandFromScores(result);
  const assetKey = createPreviewAssetKey(result.appliedTags);
  const checked = tags.has("quality-inspection");
  const classes = [
    "preview",
    "preview--photo",
    tags.has("style-fairytale") ? "preview--fairytale" : "preview--plain",
    tags.has("no-hat") ? "preview--no-hat" : "preview--hat",
    tags.has("centered-composition") ? "preview--center" : "preview--offset",
    tags.has("sharpness") ? "preview--sharp" : "preview--soft",
    checked ? "preview--checked" : "preview--unchecked",
    `preview--q-${qualityBand}`,
  ];
  const effects = result.appliedTags
    .map((tag) => EFFECT_LABELS[tag])
    .filter((label): label is string => !!label);
  return {
    classes,
    previewKey: result.previewKey || createPreviewKey(result.appliedTags, qualityBand),
    assetKey,
    imageSrc: previewImageSrc(assetKey),
    label: checked ? "검사 완료" : "제작 완료",
    effects,
    qualityBand,
    checked,
  };
}
