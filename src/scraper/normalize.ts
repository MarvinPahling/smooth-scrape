/**
 * City-name cleanup applied at scrape time to every source, so the UI shows
 * one spelling per place.
 */

/**
 * Lookup key for a city: lower case, no accents, single spaces. "Genève",
 * "geneve" and "GENEVE " all give "geneve".
 */
export function cityKey(city: string): string {
  return city
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Raw city (any spelling, keyed by `cityKey`) → canonical name. The UI is in
 * English, so we use English exonyms where the sources mix both
 * ("Köln"/"Cologne"). Add entries when `bun run show` shows a new variant.
 */
const CITY_OVERRIDES: Record<string, string> = {
  // Misspellings in the IBJJF calendar.
  "balneario camburiu": "Balneário Camboriú",
  curitba: "Curitiba",
  "me. de deus": "Madre de Deus",
  // Season names leaking into the city field.
  "boston summer": "Boston",
  "curitiba summer": "Curitiba",
  // Abbreviations and casing.
  "ft. lauderdale": "Fort Lauderdale",
  "san jose": "San Jose",
  "petit-lancy": "Petit-Lancy",
  // Local names → English exonyms.
  koln: "Cologne",
  munchen: "Munich",
  nurnberg: "Nuremberg",
  geneve: "Geneva",
  lisboa: "Lisbon",
  milano: "Milan",
  torino: "Turin",
}

/**
 * Cleans a raw city value: normalizes Unicode, collapses whitespace, drops a
 * leading postal code ("63743 Aschaffenburg") and trailing punctuation
 * ("Round Rock,"), then applies `CITY_OVERRIDES`. Empty input gives null.
 */
export function normalizeCity(raw: string | null | undefined): string | null {
  if (!raw) return null
  const city = raw
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\d{4,5}\s+/, "")
    .replace(/[\s,;.:-]+$/, "")
  if (!city) return null
  return CITY_OVERRIDES[cityKey(city)] ?? city
}
