import { load } from "cheerio"
import { UNKNOWN_COUNTRY } from "../lib/event-meta"
import type { EventRow } from "./db"
import { normalizeCity } from "./normalize"

const ORIGIN = "https://ajptour.com"
const CALENDAR = `${ORIGIN}/en/federation/1/events`
const MONTHS =
  "January February March April May June July August September October November December".split(
    " "
  )

/** AJP omits the current year and, for same-month ranges, the end month. */
function dates(label: string, currentYear: number) {
  const m =
    /^(?:(\d{4}) )?([A-Za-z]+) (\d{1,2})(?:\s*-\s*(?:(\d{4}) )?(?:([A-Za-z]+) )?(\d{1,2}))?$/.exec(
      label
    )
  const invalid = () => new Error(`Invalid AJP date: ${label}`)
  if (!m) throw invalid()
  function iso(year: number, month: number, day: number) {
    const date = new Date(Date.UTC(year, month, day))
    if (month < 0 || date.getUTCMonth() !== month) throw invalid()
    return date.toISOString().slice(0, 10)
  }
  const year = Number(m.at(1) ?? currentYear)
  const month = MONTHS.indexOf(m[2])
  const endMonth = m[5] ? MONTHS.indexOf(m[5]) : month
  const startDate = iso(year, month, Number(m[3]))
  const endYear = Number(m.at(4) ?? (endMonth < month ? year + 1 : year))
  const endDate = iso(endYear, endMonth, Number(m.at(6) ?? m[3]))
  if (endDate < startDate) throw invalid()
  return { startDate, endDate }
}

function coordinate(raw: string | undefined, limit: number) {
  const value = Number(raw)
  return raw?.trim() && Number.isFinite(value) && Math.abs(value) <= limit
    ? value
    : null
}

export function parseAjpEvents(html: string, now = new Date()): EventRow[] {
  const $ = load(html)
  const listing = $("#upcoming-events")
  if (!listing.length) throw new Error("AJP upcoming events section not found")
  const scrapedAt = now.toISOString()
  const rows = new Map<string, EventRow>()
  for (const el of listing.find(".eventItem")) {
    const card = $(el)
    const id = card.attr("data-id") ?? ""
    const title = card.attr("data-name")?.replace(/\s+/g, " ").trim()
    if (!/^\d+$/.test(id) || !title)
      throw new Error("AJP event missing id or title")
    const range = dates(
      card.attr("data-date")?.trim() ?? "",
      now.getUTCFullYear()
    )
    if (range.endDate < scrapedAt.slice(0, 10)) continue
    // The location ends with city, country; the venue itself can contain commas.
    const location = card.find(".content p.muted").text().split(",")
    const image = card.find(".image-container img").attr("src")
    rows.set(id, {
      id: `ajp:${id}`,
      source: "ajp",
      title,
      url: `${ORIGIN}/en/event/${id}`,
      ...range,
      city: normalizeCity(location.at(-2)),
      country:
        card.attr("data-country")?.trim().toUpperCase() || UNKNOWN_COUNTRY,
      lat: coordinate(card.attr("data-lat"), 90),
      lng: coordinate(card.attr("data-lng"), 180),
      coverImage: image ? new URL(image, CALENDAR).href : null,
      scrapedAt,
    })
  }
  return [...rows.values()]
}

export async function fetchAjpEvents(): Promise<EventRow[]> {
  const res = await fetch(CALENDAR)
  if (!res.ok) throw new Error(`AJP calendar responded ${res.status}`)
  return parseAjpEvents(await res.text())
}
