import type { BjjEvent } from "./collections"
import { hasCoordinates, type Coordinates } from "./geo"

export interface EventLocation extends Coordinates {
  key: string
  label: string
  events: BjjEvent[]
}

/** One point per city, so co-located events stay together even at maximum zoom. */
export function eventLocations(events: BjjEvent[]): EventLocation[] {
  const locations = new Map<string, EventLocation>()
  for (const event of events) {
    if (!hasCoordinates(event)) continue
    const city = event.city?.trim()
    const key = city
      ? `${event.country}:${city.toLowerCase()}`
      : `${event.lat},${event.lng}`
    const existing = locations.get(key)
    if (existing) existing.events.push(event)
    else
      locations.set(key, {
        key,
        label: city || "Event location",
        lat: event.lat,
        lng: event.lng,
        events: [event],
      })
  }
  return [...locations.values()]
}
