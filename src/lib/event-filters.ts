// Pure filter state + logic for the calendar. No React, no data fetching,
// so it can be unit-tested and shared by the URL (route search params).
import type { BjjEvent } from "@/lib/collections"
import { addDays } from "@/lib/dates"
import {
  DEFAULT_COUNTRY,
  DISCIPLINE_LABELS,
  countryName,
  disciplinesOf,
  organizerOf,
  type Discipline,
} from "@/lib/event-meta"

export const RANGES = [
  { value: "all", label: "All" },
  { value: "30", label: "30 days" },
  { value: "90", label: "3 months" },
] as const
export type Range = (typeof RANGES)[number]["value"]

export const isRange = (value: unknown): value is Range =>
  RANGES.some((r) => r.value === value)

export const DISCIPLINES = Object.keys(DISCIPLINE_LABELS) as Discipline[]

const isDiscipline = (value: string): value is Discipline =>
  (DISCIPLINES as string[]).includes(value)

/** Country filter value meaning "don't filter by country". */
export const ALL_COUNTRIES = "all"

export interface EventFilters {
  q: string
  range: Range
  /** ISO-2 code (or whatever `event.country` holds), or ALL_COUNTRIES. */
  country: string
  /** Match events offering ANY of these; empty = no filter. */
  disciplines: Discipline[]
  /** Organizer id, or "" for all organizers. */
  org: string
}

export const DEFAULT_FILTERS: EventFilters = {
  q: "",
  range: "all",
  country: DEFAULT_COUNTRY,
  disciplines: [],
  org: "",
}

type EventLike = Pick<
  BjjEvent,
  "source" | "url" | "title" | "city" | "country" | "startDate"
>

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

type Facet = Exclude<keyof EventFilters, "q">

/** True when the event passes every filter except the `ignore`d facets. */
export function matchesFilters(
  event: EventLike,
  filters: EventFilters,
  today: string,
  ignore: Facet[] = []
): boolean {
  const on = (facet: Facet) => !ignore.includes(facet)

  if (on("range") && filters.range !== "all") {
    if (event.startDate > addDays(today, Number(filters.range))) return false
  }
  if (on("country") && filters.country !== ALL_COUNTRIES) {
    if (event.country !== filters.country) return false
  }
  if (on("org") && filters.org) {
    if (organizerOf(event)?.id !== filters.org) return false
  }
  if (on("disciplines") && filters.disciplines.length > 0) {
    const offered = disciplinesOf(event)
    if (!filters.disciplines.some((d) => offered.includes(d))) return false
  }
  const q = fold(filters.q.trim())
  if (q) {
    const haystack = fold(
      [
        event.title,
        event.city ?? "",
        organizerOf(event)?.label ?? "",
        countryName(event.country),
      ].join(" ")
    )
    if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false
  }
  return true
}

export function filterEvents<T extends EventLike>(
  events: T[],
  filters: EventFilters,
  today: string
): T[] {
  return events.filter((e) => matchesFilters(e, filters, today))
}

/** Which filters differ from the defaults (drives "Clear filters"). */
export function activeFilters(filters: EventFilters): (keyof EventFilters)[] {
  const out: (keyof EventFilters)[] = []
  if (filters.q.trim()) out.push("q")
  if (filters.range !== DEFAULT_FILTERS.range) out.push("range")
  if (filters.country !== DEFAULT_FILTERS.country) out.push("country")
  if (filters.disciplines.length > 0) out.push("disciplines")
  if (filters.org) out.push("org")
  return out
}

export interface Option {
  value: string
  label: string
  count: number
}

const byLabel = (a: Option, b: Option) => a.label.localeCompare(b.label)

/**
 * Countries present in the data, sorted by name. The default country and
 * the current selection are always included so the select never loses them.
 */
export function countryOptions(
  events: Pick<BjjEvent, "country">[],
  selected: string
): Option[] {
  const counts = new Map<string, number>()
  for (const e of events)
    counts.set(e.country, (counts.get(e.country) ?? 0) + 1)
  for (const code of [DEFAULT_COUNTRY, selected]) {
    if (code !== ALL_COUNTRIES && !counts.has(code)) counts.set(code, 0)
  }
  return [...counts]
    .map(([value, count]) => ({ value, label: countryName(value), count }))
    .sort(byLabel)
}

/** Organizers present in `events`, plus the current selection. */
export function organizerOptions(
  events: Pick<BjjEvent, "source" | "url" | "title">[],
  selected: string
): Option[] {
  const options = new Map<string, Option>()
  for (const e of events) {
    const org = organizerOf(e)
    if (!org) continue
    const opt = options.get(org.id)
    if (opt) opt.count++
    else options.set(org.id, { value: org.id, label: org.label, count: 1 })
  }
  if (selected && !options.has(selected)) {
    options.set(selected, { value: selected, label: selected, count: 0 })
  }
  return [...options.values()].sort(byLabel)
}

// --- URL search params ----------------------------------------------------
// Only non-default values go into the URL, so the plain "/" stays clean.

export interface CalendarSearch {
  q?: string
  /** 30 | 90: days ahead. Numeric so the router doesn't quote it. */
  days?: number
  country?: string
  /** Comma-separated disciplines, e.g. "gi,kids". */
  disc?: string
  org?: string
}

const str = (v: unknown) =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined

export function validateCalendarSearch(
  raw: Record<string, unknown>
): CalendarSearch {
  const out: CalendarSearch = {}
  const q = str(raw.q)
  if (q) out.q = q
  const days = Number(raw.days)
  if (isRange(String(days))) out.days = days
  const country = str(raw.country)
  if (country) out.country = country
  const disc = str(raw.disc)
  if (disc) {
    const valid = disc.split(",").filter(isDiscipline)
    if (valid.length) out.disc = valid.join(",")
  }
  const org = str(raw.org)
  if (org) out.org = org
  return out
}

export function filtersFromSearch(search: CalendarSearch): EventFilters {
  const range = String(search.days)
  return {
    q: search.q ?? "",
    range: isRange(range) ? range : DEFAULT_FILTERS.range,
    country: search.country ?? DEFAULT_FILTERS.country,
    disciplines: (search.disc ?? "").split(",").filter(isDiscipline),
    org: search.org ?? "",
  }
}

export function searchFromFilters(filters: EventFilters): CalendarSearch {
  const out: CalendarSearch = {}
  if (filters.q) out.q = filters.q
  if (filters.range !== "all") out.days = Number(filters.range)
  if (filters.country !== DEFAULT_FILTERS.country) out.country = filters.country
  if (filters.disciplines.length) {
    // Stable order keeps URLs canonical regardless of click order.
    out.disc = DISCIPLINES.filter((d) => filters.disciplines.includes(d)).join(
      ","
    )
  }
  if (filters.org) out.org = filters.org
  return out
}
