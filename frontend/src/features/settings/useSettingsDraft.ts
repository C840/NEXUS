import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { nexusActions, nexusStore, useSettings } from '@/store'
import type { DefenseSettings } from '@/types'
import { describePatch, diffSettings, isEmptyPatch, pruneSaved } from './utils'

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export interface SettingsDraft {
  /** Store settings with unsaved local edits applied; null until settings load. */
  draft: DefenseSettings | null
  /** Stage a change; it is written after `delayMs` without further edits. */
  update: (patch: Partial<DefenseSettings>) => void
  saveState: SaveState
}

/** Diff a pending patch against the store, save it, and toast the outcome. Resolves false on failure. */
async function persist(pending: Partial<DefenseSettings>): Promise<boolean> {
  const current = nexusStore.getState().settings
  if (!current) return true
  const changes = diffSettings(current, pending)
  if (isEmptyPatch(changes)) return true
  try {
    await nexusActions.updateSettings(changes)
    nexusActions.notify({ tone: 'success', title: 'Response policy saved', message: describePatch(changes) })
    return true
  } catch (err) {
    nexusActions.notify({
      tone: 'critical',
      title: "Couldn't save response policy",
      message: err instanceof Error ? err.message : 'The NEXUS backend rejected the change.',
    })
    return false
  }
}

/**
 * Local, debounced editing of the defense settings. Sliders update the draft
 * on every input; the store/backend is written once edits pause. Pending
 * edits are flushed if the page unmounts mid-debounce.
 */
export function useSettingsDraft(delayMs = 400): SettingsDraft {
  const settings = useSettings()
  const [patch, setPatch] = useState<Partial<DefenseSettings>>({})
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const patchRef = useRef(patch)

  useEffect(() => {
    patchRef.current = patch
  }, [patch])

  const update = useCallback((next: Partial<DefenseSettings>) => {
    setPatch((prev) => ({ ...prev, ...next }))
    setSaveState('pending')
  }, [])

  const commit = useCallback(async (pending: Partial<DefenseSettings>) => {
    setSaveState('saving')
    const ok = await persist(pending)
    setPatch((prev) => pruneSaved(prev, pending))
    const editedSince = !isEmptyPatch(pruneSaved(patchRef.current, pending))
    setSaveState(editedSince ? 'pending' : ok ? 'saved' : 'error')
  }, [])

  useEffect(() => {
    if (isEmptyPatch(patch)) return
    const timer = window.setTimeout(() => void commit(patch), delayMs)
    return () => window.clearTimeout(timer)
  }, [patch, delayMs, commit])

  // Flush edits that are still waiting on the debounce when the page unmounts.
  useEffect(
    () => () => {
      if (!isEmptyPatch(patchRef.current)) void persist(patchRef.current)
    },
    [],
  )

  const draft = useMemo(() => (settings ? { ...settings, ...patch } : null), [settings, patch])
  return { draft, update, saveState }
}
