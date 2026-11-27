import { CheerioCrawler } from "crawlee"
import { openDb, type Db, saveEvents, type EventRow } from "./db"
import { fetchAjpEvents } from "./ajp"
import { fetchIbjjfEvents } from "./ibjjf"
import { normalizeCity } from "./normalize"

const START_URL = "https://smoothcomp.com/en/events/upcoming?country=DE"
const COUNTRY = "DE"
// Smoothcomp category-group ids: 1 = Jiu-Jitsu (Gi), 3/4/7 = Jiu-Jitsu (NoGi)
const BJJ_GROUPS = new Set(["1", "3", "4", "7"])

interface RawEvent {
  id: number
  title: string
  url: string
  cover_image?: string
  location_country: string
  location_city?: string
  location_lat?: string
  location_long?: string
  categoryGroups: string[]
  startdate: string
  enddate: string
}

/** The page inlines ALL upcoming events worldwide as `var events = [...]`. */
function extractEvents(html: string): RawEvent[] {
  const marker = "var events = "
  const i = html.indexOf(marker)
  if (i < 0) throw new Error("`var events` not found - page layout changed?")
  const json = html.slice(i + marker.length)
  // Parse just the leading JSON array, ignore trailing JS.
  const end = findArrayEnd(json)
  return JSON.parse(json.slice(0, end))
}

function findArrayEnd(s: string): number {
  let depth = 0,
    inStr = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (c === "\\") i++
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === "[") depth++
    else if (c === "]" && --depth === 0) return i + 1
  }
  throw new Error("unterminated events array")
}

/**
 * Scrapes every source and upserts the events into SQLite (Smoothcomp: German BJJ; IBJJF and AJP: worldwide). A
 * failing source doesn't stop the others; it throws after all have run.
 * Returns the number of saved events.
 */
export async function scrapeEvents(dbPath = "events.db"): Promise<number> {
  const db = openDb(dbPath)
  const sources = [
    ["smoothcomp", () => scrapeSmoothcomp(db)],
    ["ibjjf", () => scrapeFederation(db, "ibjjf", fetchIbjjfEvents)],
    ["ajp", () => scrapeFederation(db, "ajp", fetchAjpEvents)],
  ] as const
  const results = await Promise.allSettled(sources.map(([, run]) => run()))
  let saved = 0
  const failures: string[] = []
  results.forEach((r, i) => {
    if (r.status === "fulfilled") saved += r.value
    else failures.push(`${sources[i][0]}: ${r.reason}`)
  })
  if (failures.length) throw new Error(`Scrape failed - ${failures.join("; ")}`)
  return saved
}

async function scrapeFederation(
  db: Db,
  source: string,
  fetchRows: () => Promise<EventRow[]>
): Promise<number> {
  const rows = await fetchRows()
  saveEvents(db, source, rows)
  console.info(`${source}: ${rows.length} upcoming events worldwide`)
  return rows.length
}

async function scrapeSmoothcomp(db: Db): Promise<number> {
  let saved = 0

  const crawler = new CheerioCrawler({
    maxRequestRetries: 2,
    // got-scraping's HTTP/2 agent breaks under Bun, so force HTTP/1.1.
    preNavigationHooks: [
      (_ctx, gotOptions) => {
        gotOptions.http2 = false
      },
    ],
    requestHandler({ body, log }) {
      const all = extractEvents(body.toString())
      const now = new Date().toISOString()
      const rows: EventRow[] = all
        .filter((e) => e.location_country === COUNTRY)
        .filter((e) => e.categoryGroups.some((g) => BJJ_GROUPS.has(g)))
        .map((e) => ({
          id: `smoothcomp:${e.id}`,
          source: "smoothcomp",
          title: e.title.trim(),
          url: e.url,
          startDate: e.startdate,
          endDate: e.enddate,
          // Drops postal codes ("63743 Aschaffenburg"), unifies spellings.
          city: normalizeCity(e.location_city),
          country: e.location_country.toUpperCase(),
          lat: e.location_lat ? Number(e.location_lat) : null,
          lng: e.location_long ? Number(e.location_long) : null,
          coverImage: e.cover_image ?? null,
          scrapedAt: now,
        }))

      log.info(`${all.length} events on page, ${rows.length} BJJ in ${COUNTRY}`)
      saveEvents(db, "smoothcomp", rows)
      saved = rows.length
    },
  })

  const stats = await crawler.run([START_URL])
  if (stats.requestsFailed > 0) throw new Error("Fetching smoothcomp failed")
  return saved
}
