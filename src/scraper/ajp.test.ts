import { expect, test } from "bun:test"
import { parseAjpEvents } from "./ajp"

const now = new Date("2026-11-29T08:00:00Z")
const card = `<div class="eventItem" data-id="1581" data-name="AJP - GI &amp; NO-GI"
  data-date="November 29" data-country="BR" data-lat="-7.16" data-lng="-34.87">
  <a class="image-container"><img src="/pictures/1581.png"></a>
  <div class="content"><p class="muted">Arena, Hall 1, João Pessoa, Brazil</p></div>
</div>`
const page = (cards: string) =>
  `<section id="upcoming-events">${cards}</section>`

test("imports only upcoming cards, keyed by AJP event id", () => {
  const featured = card.replace("1581", "999")
  expect(parseAjpEvents(featured + page(card + card), now)).toEqual([
    {
      id: "ajp:1581",
      source: "ajp",
      title: "AJP - GI & NO-GI",
      url: "https://ajptour.com/en/event/1581",
      city: "João Pessoa",
      country: "BR",
      lat: -7.16,
      lng: -34.87,
      coverImage: "https://ajptour.com/pictures/1581.png",
      startDate: "2026-11-29",
      endDate: "2026-11-29",
      scrapedAt: now.toISOString(),
    },
  ])
})

test("uses the calendar year rather than the tour season in the title", () => {
  expect(
    parseAjpEvents(
      page(card.replace("November 29", "2027 February 12 - 14")),
      now
    )[0]
  ).toMatchObject({ startDate: "2027-02-12", endDate: "2027-02-14" })
  expect(
    parseAjpEvents(
      page(card.replace("November 29", "December 31 - January 02")),
      now
    )[0]
  ).toMatchObject({ startDate: "2026-12-31", endDate: "2027-01-02" })
})

test("keeps ongoing events and tolerates missing location data", () => {
  const minimal = `<div class="eventItem" data-id="2" data-name="Open" data-date="November 28 - 29" data-lat=""></div>`
  expect(parseAjpEvents(page(minimal), now)[0]).toMatchObject({
    city: null,
    country: "ZZ",
    lat: null,
    lng: null,
    coverImage: null,
  })
  expect(
    parseAjpEvents(page(card.replace("November 29", "November 28")), now)
  ).toEqual([])
})

test("rejects unexpected pages and malformed dates before any source rows are saved", () => {
  expect(() => parseAjpEvents("<h1>Unavailable</h1>", now)).toThrow(
    "section not found"
  )
  expect(() =>
    parseAjpEvents(page(card.replace("November 29", "November 31")), now)
  ).toThrow("Invalid AJP date")
})
