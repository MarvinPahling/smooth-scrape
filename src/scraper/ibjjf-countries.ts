/**
 * The IBJJF calendar API gives a `region` ("Europe") but no country. We find
 * the ISO 3166-1 alpha-2 code in two steps:
 *   1. `IBJJF_CITY_COUNTRY`: every city in the IBJJF calendar history.
 *   2. Else the event page's `<div class='country'>France</div>`.
 * If both fail, the caller uses UNKNOWN_COUNTRY and logs the city.
 */
import { COUNTRY_NAMES } from "../lib/event-meta"
import { cityKey } from "./normalize"

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  US: [
    "Albuquerque",
    "Baton Rouge",
    "Bedford Park",
    "Bethany",
    "Birmingham",
    "Boston",
    "Chesterfield",
    "Chicago",
    "Cleveland",
    "College Park",
    "Columbus",
    "Concord",
    "Costa Mesa",
    "Dallas",
    "Dearborn Heights",
    "Denver",
    "Duncanville",
    "Fort Lauderdale",
    "Fort Worth",
    "Franklin",
    "Fredericksburg",
    "Fullerton",
    "Hempstead",
    "Houston",
    "Indianapolis",
    "Kansas City",
    "Katy",
    "Kenner",
    "Kissimmee",
    "Las Vegas",
    "Long Beach",
    "Los Angeles",
    "Memphis",
    "Mesa",
    "Miami",
    "Murfreesboro",
    "New York",
    "North Charleston",
    "North Richland Hills",
    "Orlando",
    "Portland",
    "Puyallup",
    "Round Rock",
    "Sacramento",
    "San Antonio",
    "San Diego",
    "San Jose",
    "Santa Cruz",
    "Seattle",
    "Secaucus",
    "Waco",
    "Wahiawa",
    "Wesley Chapel",
  ],
  CA: ["Montreal", "Scarborough", "Toronto", "Vancouver"],
  BR: [
    "Balneário Camboriú",
    "Barueri",
    "Belo Horizonte",
    "Brasília",
    "Contagem",
    "Cruzeiro Novo",
    "Curitiba",
    "Florianópolis",
    "Fortaleza",
    "Itajaí",
    "Juiz de Fora",
    "Lauro de Freitas",
    "Madre de Deus",
    "Manaus",
    "Porto Alegre",
    "Recife",
    "Rio de Janeiro",
    "Salvador",
    "São José",
    "São Paulo",
    "Teresópolis",
    "Vitória",
  ],
  ES: ["Alcobendas", "Barcelona", "Madrid"],
  IE: ["Dublin"],
  CH: ["Geneva", "Petit-Lancy", "Vernier"],
  IT: ["Lido di Jesolo", "Lido di Ostia", "Milan", "Rome", "Turin"],
  PT: ["Lisbon", "Odivelas"],
  GB: ["London", "Manchester"],
  DE: ["Berlin", "Munich"],
  FR: ["Paris"],
  NL: ["Amsterdam"],
  JP: ["Chiba", "Nagoya", "Takasaki", "Tokyo"],
  MY: ["Cyberjaya"],
  KR: ["Suwon"],
  AE: ["Abu Dhabi"],
  AU: ["Melbourne", "Sydney"],
}

/** `cityKey(city)` → ISO-2 code. */
export const IBJJF_CITY_COUNTRY: ReadonlyMap<string, string> = new Map(
  Object.entries(CITIES_BY_COUNTRY).flatMap(([code, cities]) =>
    cities.map((city) => [cityKey(city), code] as const)
  )
)

/** ISO-2 code for a (normalized) IBJJF city, or null if unknown. */
export function countryFromCity(city: string | null): string | null {
  return city ? (IBJJF_CITY_COUNTRY.get(cityKey(city)) ?? null) : null
}

// Names as IBJJF writes them that differ from COUNTRY_NAMES.
const NAME_ALIASES: Record<string, string> = {
  "united states of america": "US",
  usa: "US",
  "united kingdom of great britain and northern ireland": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "republic of korea": "KR",
  korea: "KR",
  brasil: "BR",
  "czech republic": "CZ",
  uae: "AE",
}

let byName: Map<string, string> | undefined

/** English country name → ISO-2 code ("France" → "FR"), or null. */
export function countryCodeFromName(name: string): string | null {
  if (!byName) {
    byName = new Map()
    // Every ISO region Intl knows, then our own table, then aliases.
    const intl = new Intl.DisplayNames(["en"], { type: "region" })
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b)
        const n = intl.of(code)
        if (n && n !== code) byName.set(cityKey(n), code)
      }
    }
    for (const [code, n] of Object.entries(COUNTRY_NAMES)) {
      byName.set(cityKey(n), code)
    }
    for (const [n, code] of Object.entries(NAME_ALIASES)) byName.set(n, code)
  }
  return byName.get(cityKey(name)) ?? null
}

/** Reads the country from an IBJJF event page's location block. */
export function countryFromEventPage(html: string): string | null {
  const m = html.match(/<div class=['"]country['"]>\s*([^<]+?)\s*<\/div>/)
  return m ? countryCodeFromName(m[1]) : null
}
