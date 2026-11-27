import type { EventRow } from "./db"

const BASE_URL = "https://ibjjf.com"
const API_URL = `${BASE_URL}/api/v1/events/calendar.json`

interface RawIbjjfEvent {
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
  return body.infosite_events
    .filter((e) => e.status !== "finished")
    .map((e) => ({
      id: `ibjjf:${e.id}`,
      source: "ibjjf",
      title: e.name.trim(),
      // Announced-only events have no page yet.
      url: BASE_URL + (e.pageUrl ?? "/events/championships"),
      ...ibjjfDates(e),
      city: e.city?.trim() || null,
      // The calendar has no country field, so keep the region instead.
      country: e.region,
      lat: null,
      lng: null,
      coverImage: null,
      scrapedAt: now,
    }))
}
