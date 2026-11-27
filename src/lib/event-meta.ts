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

/**
 * Known organizers. `subdomains` are Smoothcomp subdomains
 * (`<sub>.smoothcomp.com`). `title` catches events that an organizer lists on
 * the plain smoothcomp.com domain.
 */
const ORGANIZERS: {
  id: string
  label: string
  subdomains?: string[]
  title?: RegExp
}[] = [
  { id: "ibjjf", label: "IBJJF", title: /\bIBJJF\b/i },
  {
    id: "grapplingindustries",
    label: "Grappling Industries",
    subdomains: ["grapplingindustries"],
    title: /\bgrappling industries\b/i,
  },
  { id: "naga", label: "NAGA", subdomains: ["naga"], title: /\bNAGA\b/ },
  { id: "adcc", label: "ADCC", subdomains: ["adcc"], title: /\bADCC\b/ },
  { id: "ajp", label: "AJP", subdomains: ["ajp", "ajptour"], title: /\bAJP\b/ },
  { id: "uaejjf", label: "UAEJJF", subdomains: ["uaejjf"] },
  { id: "sjjif", label: "SJJIF", subdomains: ["sjjif"] },
  { id: "illcs", label: "ILLCS", subdomains: ["illcs"], title: /\bILLCS\b/ },
  { id: "ijjcs", label: "IJJCS", title: /\bIJJCS\b/ },
  { id: "jjlg", label: "JJLG", subdomains: ["jjlg"] },
  { id: "kakutogi", label: "Kakutogi", subdomains: ["kakutogi"] },
  { id: "agf", label: "AGF", subdomains: ["agf"] },
  { id: "allstarsbjj", label: "All Stars BJJ", subdomains: ["allstarsbjj"] },
  { id: "fujibjj", label: "Fuji BJJ", subdomains: ["fujibjj"] },
  { id: "newbreedbjj", label: "Newbreed BJJ", subdomains: ["newbreedbjj"] },
  {
    id: "submissionchallenge",
    label: "Submission Challenge",
    subdomains: ["submissionchallenge"],
  },
  { id: "subonly", label: "SubOnly", subdomains: ["subonly"] },
  { id: "spainbjjtour", label: "Spain BJJ Tour", subdomains: ["spainbjjtour"] },
]

/** "ontario-jiu-jitsu" → "Ontario Jiu Jitsu"; short codes ("cfs") → "CFS". */
function labelFromSubdomain(sub: string): string {
  if (sub.length <= 4) return sub.toUpperCase()
  return sub
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")
}

/**
 * Who runs the event: the IBJJF source, a known Smoothcomp subdomain, a known
 * organizer name in the title, or else the title-cased subdomain. Events on
 * the plain smoothcomp.com domain with no known name give null.
 */
export function organizerOf(event: EventLike): Organizer | null {
  if (event.source === "ibjjf") return { id: "ibjjf", label: "IBJJF" }
  let sub = ""
  try {
    const host = new URL(event.url).hostname.replace(/^www\./, "")
    const parts = host.split(".")
    if (parts.length > 2) sub = parts[0].toLowerCase()
  } catch {
    // Malformed URL: fall through to the title match.
  }
  const known =
    ORGANIZERS.find((o) => sub && o.subdomains?.includes(sub)) ??
    ORGANIZERS.find((o) => o.title?.test(event.title))
  if (known) return { id: known.id, label: known.label }
  if (!sub || sub === "smoothcomp") return null
  return { id: sub, label: labelFromSubdomain(sub) }
}

/** Where the outbound link goes, for button labels: "View on {sourceLabel}". */
export function sourceLabel(event: Pick<BjjEvent, "url">): string {
  const host = new URL(event.url).hostname
  if (host.endsWith("ibjjf.com")) return "IBJJF"
  if (host.endsWith("smoothcomp.com")) return "Smoothcomp"
  return host.replace(/^www\./, "")
}

// "No-Gi", "NoGi", "no gi", "Nogi"; Portuguese "sem kimono".
const NOGI = /\bno[\s-]?gi\b|\bsem kimono\b/gi
// Formats that are no-gi by nature.
const NOGI_FORMATS =
  /\b(grappling|submission[\s-]only|only[\s-]submission|sub[\s-]?only|luta livre|adcc)\b/i
// A standalone "Gi" ("Gi & NoGi", "GI E NO GI", "Gi/No-Gi") or "kimono".
const GI = /\bgi\b|\bkimono\b/i
const KIDS =
  /\b(kids?|kinder|youth|juvenile|teens?|jugend|junior(s|en)?|infantil|mirim)\b|\d+\s*a\s*\d+\s*anos\b/i
// Organizers that run gi and no-gi divisions at every event.
const GI_AND_NOGI_ORGANIZERS = new Set(["grapplingindustries", "naga"])

/**
 * Disciplines the event offers, from title keywords:
 * - nogi: "No-Gi"/"NoGi"/"no gi", or a no-gi format ("grappling",
 *   "submission only", "luta livre", "ADCC").
 * - gi: a standalone "Gi" or "kimono", or no no-gi signal at all (plain BJJ
 *   events are gi).
 * - kids: "Kids", "Kinder", "Youth", "Juvenile", "Teens", "Jugend", …
 * Grappling Industries and NAGA always give gi and nogi.
 */
export function disciplinesOf(event: EventLike): Discipline[] {
  const title = event.title
  const withoutNogi = title.replace(NOGI, " ")
  const both = GI_AND_NOGI_ORGANIZERS.has(organizerOf(event)?.id ?? "")
  const nogi = both || withoutNogi !== title || NOGI_FORMATS.test(title)
  const gi = both || !nogi || GI.test(withoutNogi)
  const out: Discipline[] = []
  if (gi) out.push("gi")
  if (nogi) out.push("nogi")
  if (KIDS.test(title)) out.push("kids")
  return out
}

/** Country code for events whose country the scraper could not find. */
export const UNKNOWN_COUNTRY = "ZZ"

/**
 * English names for every code the scrapers produce, plus common neighbours.
 * An explicit table (not Intl.DisplayNames) keeps server and browser output
 * identical, so hydration never mismatches.
 */
export const COUNTRY_NAMES: Record<string, string> = {
  AE: "United Arab Emirates",
  AR: "Argentina",
  AT: "Austria",
  AU: "Australia",
  BE: "Belgium",
  BR: "Brazil",
  CA: "Canada",
  CH: "Switzerland",
  CZ: "Czechia",
  DE: "Germany",
  DK: "Denmark",
  ES: "Spain",
  FI: "Finland",
  FR: "France",
  GB: "United Kingdom",
  HR: "Croatia",
  HU: "Hungary",
  IE: "Ireland",
  IT: "Italy",
  JP: "Japan",
  KR: "South Korea",
  LU: "Luxembourg",
  MX: "Mexico",
  MY: "Malaysia",
  NL: "Netherlands",
  NO: "Norway",
  NZ: "New Zealand",
  PL: "Poland",
  PT: "Portugal",
  SE: "Sweden",
  SG: "Singapore",
  TH: "Thailand",
  US: "United States",
  [UNKNOWN_COUNTRY]: "Unknown country",
}

/**
 * ISO 3166-1 alpha-2 code → English name. Unknown codes pass through, so a
 * legacy region value ("Europe") still renders as itself.
 */
export function countryName(code: string): string {
  if (code === "??") return COUNTRY_NAMES[UNKNOWN_COUNTRY]
  return COUNTRY_NAMES[code.toUpperCase()] ?? code
}

/** Default country filter for the UI. */
export const DEFAULT_COUNTRY = "DE"
