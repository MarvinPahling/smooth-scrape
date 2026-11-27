// Derived, display-ready facts about an event. CONTRACT shared by the UI
// and the data layer: keep these signatures stable. Agent A owns the
// implementations; the UI agents only consume them.
import type { BjjEvent } from "@/lib/collections"

export type Discipline = "gi" | "nogi" | "kids"

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  gi: "Gi",
  nogi: "No-Gi",
  kids: "Kids",
}

export interface Organizer {
  /** Stable key for filtering, e.g. "ibjjf", "grapplingindustries". */
  id: string
  /** Human label, e.g. "IBJJF", "Grappling Industries". */
  label: string
}

type EventLike = Pick<BjjEvent, "source" | "url" | "title">

/** Who runs the event. PLACEHOLDER: derived from source/url subdomain. */
export function organizerOf(event: EventLike): Organizer | null {
  if (event.source === "ibjjf") return { id: "ibjjf", label: "IBJJF" }
  const host = new URL(event.url).hostname.split(".")[0]
  if (!host || host === "smoothcomp") return null
  return { id: host, label: host }
}

/** Where the outbound link goes, for button labels: "View on {sourceLabel}". */
export function sourceLabel(event: Pick<BjjEvent, "url">): string {
  const host = new URL(event.url).hostname
  if (host.endsWith("ibjjf.com")) return "IBJJF"
  if (host.endsWith("smoothcomp.com")) return "Smoothcomp"
  return host.replace(/^www\./, "")
}

/** Disciplines the event offers. PLACEHOLDER: title keyword heuristic. */
export function disciplinesOf(event: EventLike): Discipline[] {
  const t = event.title.toLowerCase()
  const out: Discipline[] = []
  const nogi = /no[\s-]?gi/.test(t)
  if (nogi) out.push("nogi")
  if (!nogi || /\bgi\b.*&|&.*\bgi\b/.test(t)) out.push("gi")
  if (/\bkids?\b/.test(t)) out.push("kids")
  return out
}

/** ISO 3166-1 alpha-2 code → English name. Unknown codes pass through. */
export function countryName(code: string): string {
  const names: Record<string, string> = { DE: "Germany" }
  return names[code] ?? code
}

/** Default country filter for the UI. */
export const DEFAULT_COUNTRY = "DE"
