import { describe, expect, test } from "bun:test"
import {
  countryName,
  DEFAULT_COUNTRY,
  disciplinesOf,
  organizerOf,
  sourceLabel,
  UNKNOWN_COUNTRY,
} from "./event-meta"

const sc = (title: string, url = "https://smoothcomp.com/en/event/1") => ({
  source: "smoothcomp",
  url,
  title,
})
const ibjjf = (title: string) => ({
  source: "ibjjf",
  url: "https://ibjjf.com/events/x",
  title,
})

describe("organizerOf", () => {
  test("IBJJF source", () => {
    expect(organizerOf(ibjjf("Pan IBJJF Jiu-Jitsu Championship 2027"))).toEqual(
      { id: "ibjjf", label: "IBJJF" }
    )
  })

  test("known Smoothcomp subdomains get nice labels", () => {
    const cases: [string, string, string, string][] = [
      [
        "Grappling Industries HAMBURG",
        "https://grapplingindustries.smoothcomp.com/en/event/28730",
        "grapplingindustries",
        "Grappling Industries",
      ],
      [
        "ILLCS XII Hannover 2026",
        "https://illcs.smoothcomp.com/en/event/30060",
        "illcs",
        "ILLCS",
      ],
      [
        "FRANKFURT WINTER OPEN CHAMPIONSHIP 2026 I EUROPEAN CUP",
        "https://jjlg.smoothcomp.com/en/event/28576",
        "jjlg",
        "JJLG",
      ],
      [
        "NAGA Nuremberg Grappling Championship",
        "https://naga.smoothcomp.com/en/event/36531",
        "naga",
        "NAGA",
      ],
      [
        "DGL Deutsche Meisterschaft Kids und Teens + Queen of the Mat",
        "https://kakutogi.smoothcomp.com/en/event/32308",
        "kakutogi",
        "Kakutogi",
      ],
      [
        "ADCC US Open - Louisville, KY",
        "https://adcc.smoothcomp.com/en/event/1",
        "adcc",
        "ADCC",
      ],
    ]
    for (const [title, url, id, label] of cases) {
      expect(organizerOf(sc(title, url))).toEqual({ id, label })
    }
  })

  test("known organizer named in the title on plain smoothcomp.com", () => {
    expect(organizerOf(sc("IJJCS I Hannover 2026"))?.label).toBe("IJJCS")
    expect(organizerOf(sc("ADCC OPEN > Auckland"))?.id).toBe("adcc")
  })

  test("unknown subdomain gets a title-cased label", () => {
    const url = (sub: string) => `https://${sub}.smoothcomp.com/en/event/1`
    expect(organizerOf(sc("X", url("ontario-jiu-jitsu")))).toEqual({
      id: "ontario-jiu-jitsu",
      label: "Ontario Jiu Jitsu",
    })
    expect(organizerOf(sc("X", url("luta-livre-series")))?.label).toBe(
      "Luta Livre Series"
    )
    expect(organizerOf(sc("X", url("cfs")))?.label).toBe("CFS")
  })

  test("plain smoothcomp.com event with no known name gives null", () => {
    expect(organizerOf(sc("Stallion Open"))).toBeNull()
    expect(organizerOf(sc("King Tatami - BJJ Kids Pro"))).toBeNull()
  })
})

test("AJP Tour source and organizer do not depend on the title", () => {
  const event = {
    source: "ajp",
    url: "https://ajptour.com/en/event/1534",
    title: "Abu Dhabi Grand Slam",
  }
  expect(organizerOf(event)).toEqual({ id: "ajp", label: "AJP" })
  expect(sourceLabel(event)).toBe("AJP Tour")
})

test("sourceLabel", () => {
  expect(sourceLabel({ url: "https://ibjjf.com/events/x" })).toBe("IBJJF")
  expect(sourceLabel({ url: "https://jjlg.smoothcomp.com/en/event/1" })).toBe(
    "Smoothcomp"
  )
  expect(sourceLabel({ url: "https://www.example.org/x" })).toBe("example.org")
})

describe("disciplinesOf", () => {
  const cases: [string, ReturnType<typeof disciplinesOf>, string?][] = [
    // IBJJF
    ["Paris Fall International Open IBJJF Jiu-Jitsu Championship 2026", ["gi"]],
    [
      "Paris Fall International Open IBJJF Jiu-Jitsu No-Gi Championship 2026",
      ["nogi"],
    ],
    [
      "Boston Fall Kids International Open IBJJF Jiu-Jitsu Championship 2026",
      ["gi", "kids"],
    ],
    [
      "Kids International IBJJF Jiu-Jitsu No-Gi Championship - Las Vegas 2026",
      ["nogi", "kids"],
    ],
    ["Jiu-Jitsu CON No-Gi International 2027", ["nogi"]],
    ["Jiu-Jitsu CON Kids No-Gi International 2027", ["nogi", "kids"]],
    [
      "Campeonato Brasileiro de Jiu-Jitsu (idade 04 a 15 anos) 2027",
      ["gi", "kids"],
    ],
    ["World Master IBJJF Jiu-Jitsu Championship 2027", ["gi"]],
    // Smoothcomp
    ["TMIYC - TAP ME IF YOU CAN SUBMISSION ONLY (GI & NOGI)", ["gi", "nogi"]],
    ["SOLT BERLIN: GI & NO-GI (SUBMISSION ONLY)", ["gi", "nogi"]],
    [
      "INTERCONTINENTAL CHAMPIONSHIP SOUTH AMERICAN DE JIU-JITSU GI E NO GI 2026",
      ["gi", "nogi"],
    ],
    [
      "Open de Nice GI / NO-GI / KIDS de jiu-jitsu Brésilien",
      ["gi", "nogi", "kids"],
    ],
    ["VERSUS The Future League 11 - Gi & NoGi", ["gi", "nogi"]],
    ["Combattle No-Gi Grappling Tournament KIDS & ADULTS", ["nogi", "kids"]],
    ["Gladiator Grappling Tournament", ["nogi"]],
    ["Performance Grappling", ["nogi"]],
    ["Only Submission Series 5", ["nogi"]],
    [
      "Tri-Combat NB | Grappling | Striking-Light | MMA-Light/Allkampf | 2027",
      ["nogi"],
    ],
    ["LUTA LIVRE SERIES TARBES", ["nogi"]],
    ["King Tatami - BJJ Kids Pro", ["gi", "kids"]],
    [
      "DGL Deutsche Meisterschaft Kids und Teens + Queen of the Mat",
      ["gi", "kids"],
    ],
    ["WHITEBELT TRIALS & KIDS - SCHÖNEBECK 2026", ["gi", "kids"]],
    [
      "Youth/Adult Jiu Jitsu Grappling | Controlled Combat | January 16, 2027",
      ["nogi", "kids"],
    ],
    ["Stallion Open", ["gi"]],
    ["BERLIN OPEN 2027 I EUROPEAN CUP", ["gi"]],
    // "Gi" inside a word is not a gi signal.
    ["Belgian Open", ["gi"]],
    // Organizers that always run both.
    [
      "Grappling Industries HAMBURG",
      ["gi", "nogi"],
      "https://grapplingindustries.smoothcomp.com/en/event/28730",
    ],
    [
      "NAGA Nuremberg Grappling Championship",
      ["gi", "nogi"],
      "https://naga.smoothcomp.com/en/event/36531",
    ],
  ]
  for (const [title, expected, url] of cases) {
    test(title, () => {
      const event =
        title.includes("IBJJF") ||
        title.startsWith("Jiu-Jitsu CON") ||
        title.startsWith("Campeonato")
          ? ibjjf(title)
          : sc(title, url)
      expect(disciplinesOf(event)).toEqual(expected)
    })
  }
})

describe("countryName", () => {
  test("codes the scrapers produce", () => {
    for (const [code, name] of [
      ["DE", "Germany"],
      ["US", "United States"],
      ["BR", "Brazil"],
      ["FR", "France"],
      ["IE", "Ireland"],
      ["JP", "Japan"],
      ["CH", "Switzerland"],
      ["PT", "Portugal"],
      ["ES", "Spain"],
      ["GB", "United Kingdom"],
    ]) {
      expect(countryName(code)).toBe(name)
    }
  })

  test("unknown country", () => {
    expect(countryName(UNKNOWN_COUNTRY)).toBe("Unknown country")
    expect(countryName("??")).toBe("Unknown country")
  })

  test("legacy region values and unknown codes pass through", () => {
    expect(countryName("Europe")).toBe("Europe")
    expect(countryName("QQ")).toBe("QQ")
  })

  test("default is Germany", () => {
    expect(countryName(DEFAULT_COUNTRY)).toBe("Germany")
  })
})
