import { DEFAULT_STATUS } from './calc'
import { normalizePlan } from './plan'
import type { PlanInputs, StatusInputs } from './calc'

export interface SharedState {
  plan: PlanInputs
  status: StatusInputs
  tierIdx: number
}

const toB64Url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const fromB64Url = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)))
}

export function encodeShare(state: SharedState): string {
  return toB64Url(JSON.stringify(state))
}

/** Keep only known keys whose type matches the defaults, so a hand-edited link can't inject anything odd. */
function pick<T extends object>(defaults: T, raw: unknown): T {
  const out = { ...defaults }
  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(defaults) as (keyof T)[]) {
      const v = (raw as Record<string, unknown>)[k as string]
      if (typeof v === typeof defaults[k] && (typeof v !== 'number' || Number.isFinite(v))) out[k] = v as T[keyof T]
    }
  }
  return out
}

/** Parse a `#d=<payload>` hash; returns null when absent or malformed. */
export function decodeShare(hash: string): SharedState | null {
  const m = /^#?d=([A-Za-z0-9_-]+)$/.exec(hash)
  if (!m) return null
  try {
    const raw = JSON.parse(fromB64Url(m[1]))
    const tier = Number(raw?.tierIdx)
    return {
      plan: normalizePlan(raw?.plan),
      status: pick(DEFAULT_STATUS, raw?.status),
      tierIdx: Number.isInteger(tier) && tier >= 0 && tier < 5 ? tier : 3,
    }
  } catch {
    return null
  }
}

export function shareUrl(state: SharedState): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#d=${encodeShare(state)}`
}
