import { expect, test } from "bun:test"
import { events, openDb, saveEvents, type EventRow } from "./db"

const row = (id: string, source = "smoothcomp"): EventRow => ({
  id: `${source}:${id}`,
  source,
  title: `Event ${id}`,
  url: "https://smoothcomp.com/en/event/1",
  startDate: "2027-01-01",
  endDate: "2027-01-01",
  city: "Berlin",
  country: "DE",
  scrapedAt: "2026-11-27T00:00:00Z",
})

const ids = (db: ReturnType<typeof openDb>) =>
  db
    .select({ id: events.id })
    .from(events)
    .all()
    .map((r) => r.id)
    .sort()

test("saveEvents replaces one source's rows and keeps the others", () => {
  const db = openDb(":memory:")
  saveEvents(db, "smoothcomp", [row("1"), row("2")])
  saveEvents(db, "ibjjf", [row("9", "ibjjf")])
  saveEvents(db, "smoothcomp", [row("2"), row("3")])
  expect(ids(db)).toEqual(["ibjjf:9", "smoothcomp:2", "smoothcomp:3"])
})

test("saveEvents with no rows deletes nothing", () => {
  const db = openDb(":memory:")
  saveEvents(db, "smoothcomp", [row("1")])
  saveEvents(db, "smoothcomp", [])
  expect(ids(db)).toEqual(["smoothcomp:1"])
})
