import { useEffect, useMemo, useRef, useState } from "react"
import type { Map as LibreMap, GeoJSONSource } from "maplibre-gl"
import type { FeatureCollection, Point } from "geojson"
import type { BjjEvent } from "@/lib/collections"
import { HOME } from "@/lib/geo"
import { eventLocations, type EventLocation } from "@/lib/event-locations"
import { sourceLabel } from "@/lib/event-meta"
import { buildCalendar, downloadIcs, icsFilename } from "@/lib/ics"
import { Distance, EventMeta } from "./event-parts"
import "maplibre-gl/dist/maplibre-gl.css"
import "./events-map.css"

const SOURCE = "competitions"
const STYLE = "https://tiles.openfreemap.org/styles/positron"

function locationData(locations: EventLocation[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: locations.map((location) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [location.lng, location.lat] },
      properties: { key: location.key, count: location.events.length },
    })),
  }
}

/** The server renders only the fixed-size shell. WebGL is imported after mount. */
export function EventsMap({
  events,
  today,
  country,
  km,
}: {
  events: BjjEvent[]
  today: string
  country: string
  km: number | null
}) {
  const container = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<LibreMap | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const locations = useMemo(() => eventLocations(events), [events])
  const current = locations.find((location) => location.key === selected)
  const missing =
    events.length -
    locations.reduce((count, location) => count + location.events.length, 0)

  useEffect(() => {
    let disposed = false
    let instance: LibreMap | undefined
    let observer: ResizeObserver | undefined
    const load = async () => {
      const [libre, { default: workerUrl }] = await Promise.all([
        import("maplibre-gl"),
        import("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"),
      ])
      if (disposed || !container.current) return
      libre.setWorkerUrl(workerUrl)
      instance = new libre.Map({
        container: container.current,
        style: STYLE,
        center: [HOME.lng, HOME.lat],
        zoom: 5,
        attributionControl: false,
        renderWorldCopies: false,
      })
      const live = instance
      live.addControl(
        new libre.NavigationControl({ showCompass: false }),
        "top-right"
      )
      live.addControl(
        // The style supplies OpenFreeMap, OpenMapTiles and OSM credits.
        new libre.AttributionControl({ compact: true })
      )
      live.on("dataloading", () => {
        if (!disposed) setBusy(true)
      })
      live.on("idle", () => {
        if (!disposed) setBusy(false)
      })
      live.on("error", () => {
        if (!disposed) setError(true)
      })
      live.on("load", () => {
        if (disposed) return
        live.addSource(SOURCE, {
          type: "geojson",
          data: locationData([]),
          cluster: true,
          clusterRadius: 48,
          clusterMaxZoom: 11,
          clusterProperties: { eventCount: ["+", ["get", "count"]] },
        })
        live.addLayer({
          id: "clusters",
          type: "circle",
          source: SOURCE,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#15161a",
            "circle-stroke-width": 3,
            "circle-stroke-color": "#fff",
            "circle-radius": [
              "step",
              ["get", "eventCount"],
              20,
              10,
              26,
              30,
              33,
            ],
          },
        })
        live.addLayer({
          id: "locations",
          type: "circle",
          source: SOURCE,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#15161a",
            "circle-radius": 15,
            "circle-stroke-width": 3,
            "circle-stroke-color": "#fff",
          },
        })
        live.addLayer({
          id: "counts",
          type: "symbol",
          source: SOURCE,
          layout: {
            "text-field": [
              "to-string",
              ["coalesce", ["get", "eventCount"], ["get", "count"]],
            ],
            "text-size": 12,
            "text-font": ["Noto Sans Regular"],
            "text-allow-overlap": true,
          },
          paint: { "text-color": "#ffffff" },
        })
        live.on("click", "clusters", async (event) => {
          const feature = event.features?.[0]
          if (!feature || feature.geometry.type !== "Point") return
          const source = live.getSource(SOURCE) as GeoJSONSource
          try {
            const zoom = await source.getClusterExpansionZoom(
              Number(feature.properties.cluster_id)
            )
            if (disposed) return
            live.easeTo({
              center: feature.geometry.coordinates as [number, number],
              zoom,
              duration: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? 0
                : 350,
            })
          } catch {
            /* A filter change can invalidate an in-flight cluster lookup. */
          }
        })
        live.on("click", "locations", (event) => {
          const key = event.features?.[0]?.properties.key
          if (typeof key === "string") setSelected(key)
        })
        for (const layer of ["clusters", "locations"]) {
          live.on("mouseenter", layer, () => {
            live.getCanvas().style.cursor = "pointer"
          })
          live.on("mouseleave", layer, () => {
            live.getCanvas().style.cursor = ""
          })
        }
        const home = document.createElement("div")
        home.className = "event-map-home"
        home.textContent = "⌂ Brunswick"
        home.title = "Brunswick · home · 52.2689, 10.5268"
        home.setAttribute("aria-label", "Home: Brunswick")
        new libre.Marker({ element: home, anchor: "bottom", offset: [0, -34] })
          .setLngLat([HOME.lng, HOME.lat])
          .addTo(live)
        setMap(live)
      })
      observer = new ResizeObserver(() => live.resize())
      observer.observe(container.current)
    }
    void load().catch(() => {
      if (!disposed) setError(true)
    })
    return () => {
      disposed = true
      observer?.disconnect()
      instance?.remove()
    }
  }, [])

  useEffect(() => {
    if (!map) return
    const source = map.getSource(SOURCE) as GeoJSONSource
    source.setData(locationData(locations))
    const points = locations.map(
      (location) => [location.lng, location.lat] as const
    )
    points.push([HOME.lng, HOME.lat])
    // Default DE overview includes its borders; a distance filter fits nearby events instead.
    if (country === "DE" && km === null) points.push([5.8, 47.2], [15.1, 55.1])
    const lngs = points.map(([lng]) => lng)
    const lats = points.map(([, lat]) => lat)
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 55, maxZoom: 9, duration: 0 }
    )
  }, [map, locations, country, km])

  useEffect(() => {
    if (!map) return
    map.setPaintProperty("locations", "circle-color", [
      "case",
      ["==", ["get", "key"], current?.key ?? ""],
      "#d73722",
      "#15161a",
    ])
    if (current)
      map.easeTo({
        center: [current.lng, current.lat],
        zoom: Math.max(map.getZoom(), 9),
        // Keep the selected circle above the mobile details card.
        offset: [
          0,
          window.matchMedia("(max-width: 767px)").matches
            ? -map.getContainer().clientHeight * 0.32
            : 0,
        ],
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 350,
      })
  }, [map, current?.key])

  return (
    <div className="event-map">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <span className="text-xs text-muted-foreground">
          {locations.length} locations · circles count events
          {missing > 0 && ` · ${missing} without coordinates (see List)`}
        </span>
        <label className="flex min-w-0 items-center gap-2 text-xs font-semibold">
          Explore
          <select
            aria-label="Explore event location"
            value={current?.key ?? ""}
            onChange={(event) => setSelected(event.target.value || null)}
            className="h-9 max-w-[210px] rounded-lg border border-border bg-card px-2 text-sm"
          >
            <option value="">Choose a city…</option>
            {locations.map((location) => (
              <option key={location.key} value={location.key}>
                {location.label} ({location.events.length})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="relative h-[70vh] min-h-[420px] md:h-[600px]">
        <div
          ref={container}
          className="absolute inset-0"
          aria-label="Map of competition locations"
          aria-busy={busy}
        />
        {!map && !error && (
          <div
            role="status"
            className="absolute inset-0 grid place-items-center bg-muted text-sm text-muted-foreground"
          >
            Loading event map…
          </div>
        )}
        {error && (
          <p
            role="status"
            className="absolute top-3 left-3 max-w-[240px] rounded-xl border border-border bg-card p-3 text-sm shadow"
          >
            Some map tiles could not load. Use Explore above or switch to List
            to see events.
          </p>
        )}
        {current && (
          <LocationCard
            location={current}
            today={today}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
      <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        ⌂ Brunswick is home · Distances are straight-line · IBJJF pins
        approximate city centres
      </p>
    </div>
  )
}

function LocationCard({
  location,
  today,
  onClose,
}: {
  location: EventLocation
  today: string
  onClose: () => void
}) {
  return (
    <section
      aria-label={`Events in ${location.label}`}
      className="absolute right-3 bottom-8 left-3 z-10 max-h-[44vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl md:bottom-8 md:left-auto md:max-h-[440px] md:w-[360px]"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2">
        <h3 className="text-xl font-bold">
          {location.label}{" "}
          <span className="font-sans text-xs font-normal text-muted-foreground">
            · {location.events.length}{" "}
            {location.events.length === 1 ? "event" : "events"}
          </span>
        </h3>
        <button
          type="button"
          aria-label="Close location details"
          className="size-10 rounded-full text-xl hover:bg-muted"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <ul className="divide-y divide-border">
        {location.events.map((event) => (
          <li key={event.id} className="space-y-2 p-4">
            <p className="text-xs font-semibold text-primary-deep">
              {event.startDate}
              {event.endDate !== event.startDate && ` – ${event.endDate}`}
            </p>
            <h4 className="font-sans text-base leading-snug font-semibold">
              {event.title}
            </h4>
            <EventMeta event={event} today={today} />
            <Distance event={event} label />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
              <a
                href={event.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center text-primary-deep underline underline-offset-4"
              >
                View on {sourceLabel(event)} ↗
              </a>
              <button
                type="button"
                className="min-h-10 underline underline-offset-4"
                onClick={() =>
                  downloadIcs(
                    icsFilename(event.title),
                    buildCalendar([event], { name: event.title })
                  )
                }
              >
                Add to calendar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
