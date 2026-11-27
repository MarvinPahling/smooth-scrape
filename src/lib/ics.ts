// iCalendar (RFC 5545) export: events become all-day VEVENTs.
import type { BjjEvent } from "@/lib/collections"
import { addDays } from "@/lib/dates"
import { countryName, organizerOf } from "@/lib/event-meta"

type IcsEvent = Pick<
  BjjEvent,
  | "id"
  | "source"
  | "title"
  | "url"
  | "startDate"
  | "endDate"
  | "city"
  | "country"
>

const PRODID = "-//Mat Calendar//BJJ competitions//EN"

/** Escapes TEXT values: backslash, semicolon, comma, newline. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
}

const encoder = new TextEncoder()

/**
 * Folds a content line to at most 75 octets per physical line; continuation
 * lines start with a space. Never splits a multi-byte UTF-8 character.
 */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line
  const out: string[] = []
  let current = ""
  let bytes = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    // First line: 75 octets. Continuations: 74 + the leading space.
    const limit = out.length === 0 ? 75 : 74
    if (bytes + size > limit) {
      out.push(current)
      current = ""
      bytes = 0
    }
    current += char
    bytes += size
  }
  out.push(current)
  return out.join("\r\n ")
}

/** "2026-12-05" → "20261205" */
const icsDate = (iso: string) => iso.replaceAll("-", "")

/** Date → "20261127T093000Z" */
const icsStamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")

function location(event: IcsEvent): string {
  const country = countryName(event.country)
  return [event.city?.replace(/[\s,]+$/, ""), country]
    .filter(Boolean)
    .join(", ")
}

function vevent(event: IcsEvent, now: Date): string[] {
  const organizer = organizerOf(event)?.label
  const description = [organizer && `Organizer: ${organizer}`, event.url]
    .filter(Boolean)
    .join("\n")
  return [
    "BEGIN:VEVENT",
    `UID:${event.id.replace(/[^\w.-]/g, "-")}@mat-calendar`,
    `DTSTAMP:${icsStamp(now)}`,
    `DTSTART;VALUE=DATE:${icsDate(event.startDate)}`,
    // All-day DTEND is exclusive: the day after the last competition day.
    `DTEND;VALUE=DATE:${icsDate(addDays(event.endDate, 1))}`,
    `SUMMARY:${escapeText(event.title)}`,
    `LOCATION:${escapeText(location(event))}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${event.url}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
  ]
}

/** A complete VCALENDAR document with CRLF line endings. */
export function buildCalendar(
  events: IcsEvent[],
  { name = "BJJ competitions", now = new Date() } = {}
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    ...events.flatMap((e) => vevent(e, now)),
    "END:VCALENDAR",
  ]
  return lines.map(foldLine).join("\r\n") + "\r\n"
}

/** "Berlin Open 2027 | Cup" → "berlin-open-2027-cup.ics" */
export function icsFilename(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/, "")
  return `${slug || "event"}.ics`
}

/** Browser only: saves the calendar as a file download. */
export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
