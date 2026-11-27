// All helpers work on "YYYY-MM-DD" strings in UTC so server and browser
// render the same output (no hydration mismatch from local time zones).

const DAY = 86_400_000

/** Today's date in Germany, as YYYY-MM-DD. */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(
    new Date()
  )
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY).toISOString().slice(0, 10)
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / DAY)
}

// Fixed name tables instead of Intl: Bun's and the browser's ICU data
// disagree on some abbreviations ("Sep" vs "Sept"), which breaks hydration.
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

function parts(iso: string) {
  const d = new Date(Date.parse(iso))
  return {
    day: d.getUTCDate(),
    month: MONTHS[d.getUTCMonth()],
    weekday: WEEKDAYS[d.getUTCDay()],
    year: d.getUTCFullYear(),
  }
}

export function dateParts(iso: string) {
  const p = parts(iso)
  return {
    day: iso.slice(8, 10),
    month: p.month.slice(0, 3),
    weekday: p.weekday.slice(0, 3),
  }
}

/** "December 2026": month group headings. */
export function monthYear(iso: string) {
  const p = parts(iso)
  return `${p.month} ${p.year}`
}

/**
 * Short "how soon" label for the next two weeks, null after that (the date
 * already says it). `end` lets multi-day events that already started read
 * as "Ongoing".
 */
export function soonLabel(
  today: string,
  start: string,
  end: string = start
): string | null {
  const days = daysBetween(today, start)
  if (days < 0) return end >= today ? "Ongoing" : null
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  const startDow = new Date(Date.parse(start)).getUTCDay()
  const untilSunday = (7 - new Date(Date.parse(today)).getUTCDay()) % 7
  if ((startDow === 6 || startDow === 0) && days <= untilSunday) {
    return "This weekend"
  }
  return days <= 14 ? `In ${days} days` : null
}

/** "Saturday, 5 December" */
export function formatLong(iso: string) {
  const p = parts(iso)
  return `${p.weekday}, ${p.day} ${p.month}`
}

/** "26 Nov 2026" */
export function formatStamp(iso: string) {
  const p = parts(iso)
  return `${p.day} ${p.month.slice(0, 3)} ${p.year}`
}

export function relativeDays(days: number): string {
  if (days <= 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days < 14) return `In ${days} days`
  const weeks = Math.round(days / 7)
  return weeks < 9 ? `In ${weeks} weeks` : `In ${Math.round(days / 30)} months`
}
