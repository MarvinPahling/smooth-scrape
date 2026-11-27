import { UNKNOWN_COUNTRY } from "../lib/event-meta"
import type { EventRow } from "./db"
import { countryFromCity, countryFromEventPage } from "./ibjjf-countries"
import { normalizeCity } from "./normalize"

const BASE_URL = "https://ibjjf.com"
const API_URL = `${BASE_URL}/api/v1/events/calendar.json`

export interface RawIbjjfEvent {
  id: number
  name: string
  startDay: number
  endDay: number
  month: string // "Jan" … "Dec"
  year: number
  city: string | null
  region: string
  status: "finished" | "published" | "upcoming"
  pageUrl: string | null
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

const iso = (year: number, monthIndex: number, day: number) =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

/** An end day before the start day means the event runs into the next month. */
export function ibjjfDates(e: RawIbjjfEvent) {
  const m = MONTHS.indexOf(e.month as (typeof MONTHS)[number])
  if (m < 0) throw new Error(`unknown month "${e.month}" on event ${e.id}`)
  const rollover = e.endDay < e.startDay
  const endMonth = (m + (rollover ? 1 : 0)) % 12
  const endYear = e.year + (m + (rollover ? 1 : 0) > 11 ? 1 : 0)
  return {
    startDate: iso(e.year, m, e.startDay),
    endDate: iso(endYear, endMonth, e.endDay),
  }
}

/** Downloads an event page's HTML, or null if that fails. */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    return res.ok ? await res.text() : null
  } catch {
    return null
  }
}

/**
 * Finds an ISO-2 country per city: the lookup table first, then (once per
 * city) the event page. Unresolved cities get UNKNOWN_COUNTRY and are
 * returned in `unmapped` so the caller can log them.
 */
export async function resolveIbjjfCountries(
  events: { city: string | null; region: string; url: string | null }[],
  loadPage: (url: string) => Promise<string | null> = fetchPage
): Promise<{ countries: string[]; unmapped: Map<string, string> }> {
  const byCity = new Map<string, string | null>()
  const unmapped = new Map<string, string>() // "city (region)" → example url
  const countries: string[] = []
  for (const e of events) {
    const key = e.city ?? ""
    if (!byCity.has(key)) byCity.set(key, countryFromCity(e.city))
    let code = byCity.get(key) ?? null
    if (!code && e.url) {
      const html = await loadPage(e.url)
      code = html ? countryFromEventPage(html) : null
      if (code) byCity.set(key, code)
    }
    if (!code)
      unmapped.set(`${e.city ?? "(no city)"} (${e.region})`, e.url ?? "")
    countries.push(code ?? UNKNOWN_COUNTRY)
  }
  return { countries, unmapped }
}

/** Fetches the IBJJF calendar and maps the upcoming events to rows. */
export async function fetchIbjjfEvents(): Promise<EventRow[]> {
  const res = await fetch(API_URL, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json",
    },
  })
  if (!res.ok) throw new Error(`IBJJF calendar responded ${res.status}`)
  const body = (await res.json()) as { infosite_events?: RawIbjjfEvent[] }
  if (!Array.isArray(body.infosite_events)) {
    throw new Error("`infosite_events` not found - API changed?")
  }

  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  const upcoming = body.infosite_events
    // Some long-past events are never marked "finished"; check the date too.
    .filter((e) => e.status !== "finished" && ibjjfDates(e).endDate >= today)
    .map((e) => ({ ...e, city: normalizeCity(e.city) }))
  const { countries, unmapped } = await resolveIbjjfCountries(
    upcoming.map((e) => ({
      city: e.city,
      region: e.region,
      url: e.pageUrl && BASE_URL + e.pageUrl,
    }))
  )
  for (const [city, url] of unmapped) {
    console.info(
      `ibjjf: no country for ${city}${url ? ` ${url}` : ""}; add it to IBJJF_CITY_COUNTRY`
    )
  }

  return upcoming.map((e, i) => ({
    id: `ibjjf:${e.id}`,
    source: "ibjjf",
    title: e.name.replace(/\s+/g, " ").trim(),
    // Announced-only events have no page yet.
    url: BASE_URL + (e.pageUrl ?? "/events/championships"),
    ...ibjjfDates(e),
    city: e.city,
    country: countries[i],
    lat: null,
    lng: null,
    coverImage: null,
    scrapedAt: now,
  }))
}
