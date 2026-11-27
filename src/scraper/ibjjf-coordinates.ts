import type { Coordinates } from "../lib/geo"
import { cityKey } from "./normalize"

/**
 * Approximate city centres (WGS84), not venue entrances. Keep offline:
 * unknown cities are logged at scrape time, never guessed from a region.
 * College Park is Georgia (IBJJF's Atlanta venue); São José is Santa Catarina.
 * Keys include country to avoid confusing namesakes.
 */
const CITIES: [string, string, number, number][] = [
  ["Albuquerque", "US", 35.0844, -106.6504],
  ["Alcobendas", "ES", 40.5373, -3.6372],
  ["Balneário Camboriú", "BR", -26.9926, -48.6352],
  ["Barueri", "BR", -23.5113, -46.8765],
  ["College Park", "US", 33.6534, -84.4494],
  ["Costa Mesa", "US", 33.6412, -117.9187],
  ["Dallas", "US", 32.7767, -96.797],
  ["Dublin", "IE", 53.3498, -6.2603],
  ["Geneva", "CH", 46.2044, 6.1432],
  ["Kissimmee", "US", 28.2919, -81.4076],
  ["Las Vegas", "US", 36.1699, -115.1398],
  ["London", "GB", 51.5074, -0.1278],
  ["Los Angeles", "US", 34.0522, -118.2437],
  ["Memphis", "US", 35.1495, -90.049],
  ["Nagoya", "JP", 35.1815, 136.9066],
  ["Odivelas", "PT", 38.7927, -9.1838],
  ["Paris", "FR", 48.8566, 2.3522],
  ["Rio de Janeiro", "BR", -22.9068, -43.1729],
  ["Round Rock", "US", 30.5083, -97.6789],
  ["San Jose", "US", 37.3382, -121.8863],
  ["São José", "BR", -27.6136, -48.6356],
  ["Teresópolis", "BR", -22.4123, -42.9668],
  ["Waco", "US", 31.5493, -97.1467],
  ["Berlin", "DE", 52.52, 13.405],
  ["Munich", "DE", 48.1372, 11.5756],
  ["Lisbon", "PT", 38.7223, -9.1393],
  ["São Paulo", "BR", -23.5505, -46.6333],
  ["Tokyo", "JP", 35.6762, 139.6503],
]

export const IBJJF_CITY_COORDINATES: ReadonlyMap<string, Coordinates> = new Map(
  CITIES.map(([city, country, lat, lng]) => [
    `${country}:${cityKey(city)}`,
    { lat, lng },
  ])
)

export function coordinatesFromCity(
  city: string | null,
  country: string
): Coordinates | null {
  return city
    ? (IBJJF_CITY_COORDINATES.get(`${country}:${cityKey(city)}`) ?? null)
    : null
}
