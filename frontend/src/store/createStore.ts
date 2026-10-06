import { useMemo, useSyncExternalStore } from 'react'

/**
 * Minimal external store (~zustand-style) built on useSyncExternalStore.
 * Components subscribe to *slices* via selectors and re-render only when
 * their slice changes.
 */
export interface Store<S> {
  getState(): S
  setState(update: Partial<S> | ((state: S) => Partial<S>)): void
  subscribe(listener: () => void): () => void
}

export function createStore<S extends object>(initial: S): Store<S> {
  let state = initial
  const listeners = new Set<() => void>()

  return {
    getState: () => state,
    setState(update) {
      const partial = typeof update === 'function' ? update(state) : update
      state = { ...state, ...partial }
      listeners.forEach((l) => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a) as (keyof T)[]
  const kb = Object.keys(b) as (keyof T)[]
  if (ka.length !== kb.length) return false
  return ka.every((k) => Object.is(a[k], b[k]))
}

/**
 * Subscribe to a slice of a store. Selectors should return existing references
 * (e.g. `s => s.events`) or primitives; for derived objects pass `shallowEqual`.
 */
export function useStoreSelector<S, T>(
  store: Store<S>,
  selector: (state: S) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const getSnapshot = useMemo(() => {
    let hasMemo = false
    let memoState: S
    let memoValue: T
    return () => {
      const state = store.getState()
      if (hasMemo && Object.is(state, memoState)) return memoValue
      const value = selector(state)
      if (hasMemo && isEqual(memoValue, value)) {
        memoState = state
        return memoValue
      }
      hasMemo = true
      memoState = state
      memoValue = value
      return value
    }
  }, [store, selector, isEqual])

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}
