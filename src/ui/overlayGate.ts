export interface OverlayGateState {
  inspectOpen: boolean;
  roundSummaryOpen: boolean;
  unlockTutorialOpen: boolean;
  prepOpen: boolean;
  analysisOpen: boolean;
}

/** True when any DOM overlay should block Phaser kitchen input. */
export function isUiBlockingOverlay(state: OverlayGateState): boolean {
  return state.inspectOpen
    || state.roundSummaryOpen
    || state.unlockTutorialOpen
    || state.prepOpen
    || state.analysisOpen;
}
