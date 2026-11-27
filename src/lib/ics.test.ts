import { describe, expect, test } from "bun:test"
import { buildCalendar, escapeText, foldLine, icsFilename } from "@/lib/ics"

const event = {
  id: "smoothcomp:33016",
  source: "smoothcomp",
  title: "Berlin Open 2027, European Cup; Gi & No-Gi",
  url: "https://jjlg.smoothcomp.com/en/event/33016",
  startDate: "2027-05-15",
  endDate: "2027-05-16",
  city: "Berlin",
  country: "DE",
}
const now = new Date("2026-11-27T09:30:00.123Z")

describe("buildCalendar", () => {
  const ics = buildCalendar([event], { name: "Test", now })
  const lines = ics.split("\r\n")

  test("wraps events in a VCALENDAR with CRLF line endings", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR")
    expect(lines).toContain("VERSION:2.0")
    expect(lines.at(-2)).toBe("END:VCALENDAR")
    expect(ics.endsWith("\r\n")).toBe(true)
    expect(ics.replaceAll("\r\n", "")).not.toContain("\n")
  })

  test("is an all-day event with an exclusive DTEND", () => {
    expect(lines).toContain("DTSTART;VALUE=DATE:20270515")
    expect(lines).toContain("DTEND;VALUE=DATE:20270517")
  })

  test("single-day events end the next day, across month ends", () => {
    const single = buildCalendar(
      [{ ...event, startDate: "2026-12-31", endDate: "2026-12-31" }],
      { now }
    )
    expect(single).toContain("DTSTART;VALUE=DATE:20261231\r\n")
    expect(single).toContain("DTEND;VALUE=DATE:20270101\r\n")
  })

  test("has a stable UID, DTSTAMP, escaped summary and location", () => {
    expect(lines).toContain("UID:smoothcomp-33016@mat-calendar")
    expect(lines).toContain("DTSTAMP:20261127T093000Z")
    expect(lines).toContain(
      "SUMMARY:Berlin Open 2027\\, European Cup\\; Gi & No-Gi"
    )
    expect(lines.find((l) => l.startsWith("LOCATION:"))).toStartWith(
      "LOCATION:Berlin\\, "
    )
    expect(lines).toContain("URL:https://jjlg.smoothcomp.com/en/event/33016")
  })

  test("one VEVENT per event", () => {
    const many = buildCalendar([event, { ...event, id: "x:2" }], { now })
    expect(many.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(many.match(/END:VEVENT/g)).toHaveLength(2)
  })

  test("no physical line exceeds 75 octets", () => {
    const long = buildCalendar(
      [{ ...event, title: "Ünïcödé Jiu-Jitsu Championship ".repeat(8) }],
      { now }
    )
    for (const line of long.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
  })
})

describe("escapeText", () => {
  test("escapes backslash, semicolon, comma and newlines", () => {
    expect(escapeText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne")
  })
})

describe("foldLine", () => {
  test("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short")
  })

  test("folds long lines and unfolds back to the original", () => {
    const line = "DESCRIPTION:" + "x".repeat(200)
    const folded = foldLine(line)
    expect(folded).toContain("\r\n ")
    expect(folded.replaceAll("\r\n ", "")).toBe(line)
  })

  test("never splits a multi-byte character", () => {
    const line = "SUMMARY:" + "ü".repeat(100)
    const folded = foldLine(line)
    expect(folded.replaceAll("\r\n ", "")).toBe(line)
    expect(folded).not.toContain("�")
  })
})

describe("icsFilename", () => {
  test("slugifies titles", () => {
    expect(icsFilename("BERLIN OPEN 2027 I EUROPEAN CUP")).toBe(
      "berlin-open-2027-i-european-cup.ics"
    )
    expect(icsFilename("Balneário Camboriú Open")).toBe(
      "balneario-camboriu-open.ics"
    )
    expect(icsFilename("!!!")).toBe("event.ics")
  })
})
