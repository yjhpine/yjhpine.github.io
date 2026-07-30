/** Always present on the factory floor; players only build middle modules. */
export const DEFAULT_MODULE_IDS = ["order-input", "delivery-bay"] as const;

export type DefaultModuleId = (typeof DEFAULT_MODULE_IDS)[number];

export const DEFAULT_MODULE_POSITIONS: Record<DefaultModuleId, { x: number; y: number }> = {
  "order-input": { x: 120, y: 265 },
  "delivery-bay": { x: 780, y: 265 },
};

export function isDefaultModuleId(moduleId: string): moduleId is DefaultModuleId {
  return (DEFAULT_MODULE_IDS as readonly string[]).includes(moduleId);
}
