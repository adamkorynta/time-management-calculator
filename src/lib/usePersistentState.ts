import { useEffect, useState } from 'react'

interface Options<T> {
  /** Fallback used only when nothing is saved under `key` (e.g. data from an older storage key). */
  legacy?: T | null
  /** Validate/convert whatever was saved; defaults to merging it over the initial value. */
  normalize?: (raw: unknown) => T
}

/**
 * useState mirrored to localStorage (merged over defaults so new fields survive older saves).
 * A `seed` (e.g. from a shared link) takes priority over what was saved.
 */
export function usePersistentState<T extends object>(key: string, initial: T, seed?: T | null, options: Options<T> = {}) {
  const [value, setValue] = useState<T>(() => {
    if (seed) return seed
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        return options.normalize ? options.normalize(parsed) : { ...initial, ...(parsed as object) }
      }
    } catch {
      /* storage unavailable or corrupt — fall back to defaults */
    }
    return options.legacy ?? initial
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [key, value])

  return [value, setValue] as const
}
