import { describe, expect, test } from "bun:test"
import { ibjjfDates, resolveIbjjfCountries, type RawIbjjfEvent } from "./ibjjf"
import {
  countryCodeFromName,
  countryFromCity,
  countryFromEventPage,
} from "./ibjjf-countries"

const raw = (over: Partial<RawIbjjfEvent>): RawIbjjfEvent => ({
  id: 1,
  name: "Paris Fall International Open IBJJF Jiu-Jitsu Championship 2026",
  startDay: 28,
  endDay: 29,
  month: "Nov",
  year: 2026,
  city: "Paris",
  region: "Europe",
  status: "published",
  pageUrl: null,
  ...over,
})

describe("ibjjfDates", () => {
  test("same month", () => {
    expect(ibjjfDates(raw({}))).toEqual({
      startDate: "2026-11-28",
      endDate: "2026-11-29",
    })
  })

  test("rolls over into the next month and year", () => {
    expect(ibjjfDates(raw({ month: "Dec", startDay: 31, endDay: 2 }))).toEqual({
      startDate: "2026-12-31",
      endDate: "2027-01-02",
    })
  })

  test("unknown month throws", () => {
    expect(() => ibjjfDates(raw({ month: "Foo" }))).toThrow()
  })
})

describe("countryFromCity", () => {
  test("cities in the current calendar", () => {
    const cases: [string, string][] = [
      ["Paris", "FR"],
      ["Dublin", "IE"],
      ["Nagoya", "JP"],
      ["Chiba", "JP"],
      ["Waco", "US"],
      ["Las Vegas", "US"],
      ["Round Rock", "US"],
      ["Balneário Camboriú", "BR"],
      ["São José", "BR"],
      ["Rio de Janeiro", "BR"],
      ["Odivelas", "PT"],
      ["Alcobendas", "ES"],
      ["Geneva", "CH"],
      ["London", "GB"],
    ]
    for (const [city, code] of cases) expect(countryFromCity(city)).toBe(code)
  })

  test("matches regardless of case and accents", () => {
    expect(countryFromCity("sao jose")).toBe("BR")
    expect(countryFromCity("TERESOPOLIS")).toBe("BR")
  })

  test("unknown or missing city gives null", () => {
    expect(countryFromCity("Atlantis")).toBeNull()
    expect(countryFromCity(null)).toBeNull()
  })
})

describe("countryCodeFromName", () => {
  test("IBJJF page spellings", () => {
    expect(countryCodeFromName("France")).toBe("FR")
    expect(countryCodeFromName("United States of America")).toBe("US")
    expect(countryCodeFromName("Switzerland")).toBe("CH")
    expect(countryCodeFromName("Japan")).toBe("JP")
    expect(countryCodeFromName("Brazil")).toBe("BR")
    expect(countryCodeFromName("united kingdom")).toBe("GB")
  })

  test("unknown name gives null", () => {
    expect(countryCodeFromName("Europe")).toBeNull()
  })
})

test("countryFromEventPage reads the location block", () => {
  const html = `<address>
<div class='local'>Salle Charpy - Stade Charléty</div>
<div class='complement'>Paris</div>
<div class='country'>France</div>
</address>`
  expect(countryFromEventPage(html)).toBe("FR")
  expect(countryFromEventPage("<html></html>")).toBeNull()
})

describe("resolveIbjjfCountries", () => {
  test("uses the table, then the event page once per city", async () => {
    const loaded: string[] = []
    const loadPage = async (url: string) => {
      loaded.push(url)
      return url.includes("atlantis")
        ? "<div class='country'>Greece</div>"
        : null
    }
    const { countries, unmapped } = await resolveIbjjfCountries(
      [
        { city: "Paris", region: "Europe", url: "https://x/paris" },
        { city: "Atlantis", region: "Europe", url: "https://x/atlantis-1" },
        { city: "Atlantis", region: "Europe", url: "https://x/atlantis-2" },
        { city: "Nowhere", region: "Asia", url: null },
        { city: "Mystery", region: "Asia", url: "https://x/mystery" },
      ],
      loadPage
    )
    expect(countries).toEqual(["FR", "GR", "GR", "ZZ", "ZZ"])
    expect(loaded).toEqual(["https://x/atlantis-1", "https://x/mystery"])
    expect([...unmapped.keys()]).toEqual(["Nowhere (Asia)", "Mystery (Asia)"])
  })
})
