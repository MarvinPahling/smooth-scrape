/** Straight-line distances, not driving routes. Coordinates are WGS84 degrees. */
export interface Coordinates {
  lat: number
  lng: number
}
export const HOME = { name: "Brunswick", lat: 52.2689, lng: 10.5268 } as const
const radians = (degrees: number) => (degrees * Math.PI) / 180

export function hasCoordinates(point: {
  lat?: number | null
  lng?: number | null
}): point is Coordinates {
  return (
    typeof point.lat === "number" &&
    Number.isFinite(point.lat) &&
    Math.abs(point.lat) <= 90 &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lng) <= 180
  )
}

/** Haversine distance on the mean-radius Earth, in kilometres. */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = radians(b.lat - a.lat)
  const dLng = radians(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) *
      Math.cos(radians(b.lat)) *
      Math.sin(dLng / 2) ** 2
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))))
}

export function distanceFromHome(point: {
  lat?: number | null
  lng?: number | null
}): number | null {
  return hasCoordinates(point) ? haversineKm(HOME, point) : null
}

export function formatDistance(km: number | null): string {
  if (km === null || !Number.isFinite(km) || km < 0) return "—"
  return km < 1 ? "<1 km" : `${Math.round(km).toLocaleString("en-US")} km`
}
