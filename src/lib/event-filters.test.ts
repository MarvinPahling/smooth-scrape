import { describe, expect, test } from "bun:test"
import {
  ALL_COUNTRIES,
  DEFAULT_FILTERS,
  activeFilters,
  countryOptions,
  filterEvents,
  filtersFromSearch,
  searchFromFilters,
  validateCalendarSearch,
  type EventFilters,
} from "@/lib/event-filters"
import { soonLabel } from "@/lib/dates"
import { DEFAULT_COUNTRY } from "@/lib/event-meta"

const today = "2026-11-27" // a Friday

const ev = (over: Partial<Parameters<typeof filterEvents>[0][number]>) => ({
  source: "smoothcomp",
  url: "https://smoothcomp.com/en/event/1",
  title: "Open",
  city: "Berlin",
  country: DEFAULT_COUNTRY,
  startDate: "2026-12-05",
  ...over,
})

const events = [
  ev({ title: "Berlin Open Gi", city: "Berlin" }),
  ev({ title: "Hamburg No-Gi Cup", city: "Hamburg", startDate: "2027-03-01" }),
  ev({ title: "Kids Cup", city: "Köln", startDate: "2026-12-12" }),
  ev({
    source: "ibjjf",
    url: "https://ibjjf.com/events/paris",
    title: "Paris Open",
    city: "Paris",
    country: "FR",
  }),
]

const run = (over: Partial<EventFilters>) =>
  filterEvents(events, { ...DEFAULT_FILTERS, ...over }, today).map(
    (e) => e.title
  )

describe("filterEvents", () => {
  test("defaults to the default country", () => {
    expect(run({})).toEqual(["Berlin Open Gi", "Hamburg No-Gi Cup", "Kids Cup"])
  })

  test("all countries", () => {
    expect(run({ country: ALL_COUNTRIES })).toHaveLength(4)
  })

  test("time range limits by start date", () => {
    expect(run({ range: "30" })).toEqual(["Berlin Open Gi", "Kids Cup"])
  })

  test("disciplines match ANY selected", () => {
    expect(run({ disciplines: ["nogi"] })).toEqual(["Hamburg No-Gi Cup"])
    expect(run({ disciplines: ["nogi", "kids"] })).toEqual([
      "Hamburg No-Gi Cup",
      "Kids Cup",
    ])
  })

  test("organizer", () => {
    expect(run({ country: ALL_COUNTRIES, org: "ibjjf" })).toEqual([
      "Paris Open",
    ])
  })

  test("search is case-, accent- and word-order-insensitive", () => {
    expect(run({ q: "koln" })).toEqual(["Kids Cup"])
    expect(run({ q: "cup hamburg" })).toEqual(["Hamburg No-Gi Cup"])
  })
})

describe("activeFilters", () => {
  test("defaults are not active", () => {
    expect(activeFilters(DEFAULT_FILTERS)).toEqual([])
  })
  test("lists changed facets", () => {
    expect(
      activeFilters({ ...DEFAULT_FILTERS, q: " x ", country: ALL_COUNTRIES })
    ).toEqual(["q", "country"])
  })
})

describe("countryOptions", () => {
  test("counts countries and always includes the default", () => {
    const opts = countryOptions([{ country: "FR" }, { country: "FR" }], "all")
    expect(opts.map((o) => [o.value, o.count])).toContainEqual(["FR", 2])
    expect(opts.map((o) => o.value)).toContain(DEFAULT_COUNTRY)
  })
})

describe("URL search round trip", () => {
  test("defaults produce an empty search", () => {
    expect(searchFromFilters(DEFAULT_FILTERS)).toEqual({})
    expect(filtersFromSearch({})).toEqual(DEFAULT_FILTERS)
  })

  test("non-defaults survive a round trip", () => {
    const filters: EventFilters = {
      q: "berlin",
      range: "90",
      country: "FR",
      disciplines: ["kids", "gi"],
      org: "ibjjf",
    }
    const search = searchFromFilters(filters)
    expect(search).toEqual({
      q: "berlin",
      days: 90,
      country: "FR",
      disc: "gi,kids",
      org: "ibjjf",
    })
    expect(filtersFromSearch(validateCalendarSearch({ ...search }))).toEqual({
      ...filters,
      disciplines: ["gi", "kids"],
    })
  })

  test("drops junk", () => {
    expect(
      validateCalendarSearch({ days: "7", disc: "foo,nogi", q: 42, org: "" })
    ).toEqual({ disc: "nogi", q: "42" })
  })
})

describe("soonLabel", () => {
  test("next two weeks only", () => {
    expect(soonLabel(today, "2026-11-27")).toBe("Today")
    expect(soonLabel(today, "2026-11-28")).toBe("Tomorrow")
    expect(soonLabel(today, "2026-11-29")).toBe("This weekend")
    expect(soonLabel(today, "2026-12-01")).toBe("In 4 days")
    expect(soonLabel(today, "2026-12-11")).toBe("In 14 days")
    expect(soonLabel(today, "2026-12-12")).toBeNull()
  })
  test("multi-day events that already started are ongoing", () => {
    expect(soonLabel(today, "2026-11-26", "2026-11-28")).toBe("Ongoing")
  })
  test("on Saturday, Sunday is tomorrow and next Saturday is not this weekend", () => {
    expect(soonLabel("2026-11-28", "2026-11-29")).toBe("Tomorrow")
    expect(soonLabel("2026-11-28", "2026-12-05")).toBe("In 7 days")
  })
})
