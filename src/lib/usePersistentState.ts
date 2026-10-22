import { useEffect, useState } from 'react'

/**
 * useState mirrored to localStorage (merged over defaults so new fields survive older saves).
 * A `seed` (e.g. from a shared link) takes priority over what was saved.
 */
export function usePersistentState<T extends object>(key: string, initial: T, seed?: T | null) {
  const [value, setValue] = useState<T>(() => {
    if (seed) return seed
    try {
      const raw = localStorage.getItem(key)
      if (raw) return { ...initial, ...JSON.parse(raw) }
    } catch {
      /* storage unavailable or corrupt — fall back to defaults */
    }
    return initial
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
