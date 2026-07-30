export type PortDataType =
  | "order"
  | "textCondition"
  | "style"
  | "composition"
  | "image"
  | "evaluatedImage"
  | "finalProduct";

export type PortDirection = "input" | "output";

export interface PortDefinition {
  id: string;
  label: string;
  direction: PortDirection;
  dataType: PortDataType;
  required?: boolean;
}

export type GenerationTag =
  | "generator"
  | "style-fairytale"
  | "no-hat"
  | "centered-composition"
  | "sharpness"
  | "quality-inspection";

export interface QualityScores {
  subjectAccuracy: number;
  styleMatch: number;
  composition: number;
  sharpness: number;
}

export interface ModuleEffect {
  tag?: GenerationTag;
  scores?: Partial<QualityScores>;
  processingTime?: number;
}

export interface ModuleDefinition {
  id: string;
  displayName: string;
  description: string;
  category: string;
  inputPorts: PortDefinition[];
  outputPorts: PortDefinition[];
  price: number;
  processingTime: number;
  effects: ModuleEffect[];
  iconKey: string;
  portHint: string;
}

export interface GenerationIssue {
  id: string;
  message: string;
  recommendationModuleId?: string;
  detail: string;
}

export interface GenerationResult extends QualityScores {
  processingTime: number;
  appliedTags: GenerationTag[];
  issues: GenerationIssue[];
  previewKey: string;
  hasDelivery: boolean;
  hasInspection: boolean;
}

export interface OrderDefinition {
  id: string;
  title: string;
  request: string;
  tutorial: string;
  availableModuleIds: string[];
  reward: number;
  minimumScores: Partial<QualityScores>;
  maximumProcessingTime: number;
  requiredTags: GenerationTag[];
  baseScores: QualityScores;
}

export interface OrderEvaluation {
  passed: boolean;
  issues: GenerationIssue[];
  summary: string;
}

export interface SaveData {
  version: 1;
  credits: number;
  completedOrderIds: string[];
  unlockedModuleIds: string[];
  tutorialStage: number;
  activeOrderId: string;
}
