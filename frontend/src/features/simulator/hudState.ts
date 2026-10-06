import { createStore, useStoreSelector } from '@/store/createStore'

/**
 * View state of the simulation HUD, shared so the TopBar indicator can bring a
 * minimized HUD back. Purely presentational — never security state.
 */
interface HudViewState {
  minimized: boolean
}

const hudStore = createStore<HudViewState>({ minimized: false })
const selectMinimized = (s: HudViewState) => s.minimized

export function useHudMinimized(): boolean {
  return useStoreSelector(hudStore, selectMinimized)
}

export function setHudMinimized(minimized: boolean): void {
  if (hudStore.getState().minimized !== minimized) hudStore.setState({ minimized })
}
