import { useEffect, useState } from 'react'

/** useState mirrored to localStorage (merged over defaults so new fields survive older saves). */
export function usePersistentState<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
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
