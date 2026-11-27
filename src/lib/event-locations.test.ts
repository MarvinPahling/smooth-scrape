import { expect, test } from "bun:test"
import type { BjjEvent } from "./collections"
import { eventLocations } from "./event-locations"
import { DEFAULT_FILTERS, filterEvents } from "./event-filters"

const event: BjjEvent = {
  id: "smoothcomp:1",
  source: "smoothcomp",
  title: "Hannover Open",
  city: "Hannover",
  country: "DE",
  lat: 52.3759,
  lng: 9.732,
  startDate: "2027-01-01",
  endDate: "2027-01-01",
  url: "https://smoothcomp.com/en/event/1",
  coverImage: null,
  scrapedAt: "2026-11-27",
}
test("same-city events stay in one point, even with different venue coordinates", () => {
  const second = { ...event, id: "smoothcomp:2", lat: 52.4 }
  const locations = eventLocations([event, second])
  expect(locations).toHaveLength(1)
  expect(locations[0].events).toEqual([event, second])
})
test("namesakes across countries remain separate, unknown coordinates are omitted", () => {
  expect(
    eventLocations([
      event,
      { ...event, country: "US" },
      { ...event, city: "Missing", lat: null },
    ])
  ).toHaveLength(2)
})
test("map city cards contain exactly the filtered events, with no stale city members", () => {
  const rows = [
    event,
    { ...event, id: "2", title: "No-Gi Open" },
    { ...event, id: "3", city: "Paris", lat: 48.8566, lng: 2.3522 },
  ]
  const filtered = filterEvents(
    rows,
    { ...DEFAULT_FILTERS, disciplines: ["nogi"], km: 100 },
    "2026-11-27"
  )
  expect(
    eventLocations(filtered).flatMap((location) => location.events)
  ).toEqual([rows[1]])
})
