import { createStore, useStoreSelector } from './createStore'

/** Per-browser UI preferences (kept in localStorage; safe to lose). */
export interface Prefs {
  /** Desktop notifications for new critical/high threats. */
  notify: boolean
  /** Guided demo walkthrough is showing. */
  demo: boolean
  /** Current demo step (0-based). */
  demoStep: number
  /** Ctrl+K search palette is open (not persisted). */
  paletteOpen: boolean
}

const KEY = 'nexus.prefs'

function load(): Partial<Prefs> {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Partial<Prefs>) : {}
  } catch {
    return {}
  }
}

export const prefsStore = createStore<Prefs>({ notify: false, demo: false, demoStep: 0, ...load(), paletteOpen: false })

prefsStore.subscribe(() => {
  const { notify, demo, demoStep } = prefsStore.getState()
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ notify, demo, demoStep }))
  } catch {
    /* storage unavailable */
  }
})

export function usePrefs<T>(selector: (p: Prefs) => T): T {
  return useStoreSelector(prefsStore, selector)
}

export const prefsActions = {
  async setNotify(on: boolean): Promise<boolean> {
    if (on) {
      if (!('Notification' in window)) return false
      const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
      if (permission !== 'granted') {
        prefsStore.setState({ notify: false })
        return false
      }
    }
    prefsStore.setState({ notify: on })
    return true
  },
  setDemo(on: boolean) {
    prefsStore.setState(on ? { demo: true, demoStep: 0 } : { demo: false })
  },
  setDemoStep(step: number) {
    prefsStore.setState({ demoStep: step })
  },
  setPaletteOpen(open: boolean) {
    prefsStore.setState({ paletteOpen: open })
  },
}
