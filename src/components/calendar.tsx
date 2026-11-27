import {
  Suspense,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react"
import { getRouteApi } from "@tanstack/react-router"
import {
  ChevronDown,
  Download,
  Search,
  SearchX,
  SlidersHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUpcomingEvents } from "@/lib/upcoming-events"
import {
  ALL_COUNTRIES,
  DEFAULT_FILTERS,
  DISCIPLINES,
  DISTANCES,
  RANGES,
  activeFilters,
  countryOptions,
  filtersFromSearch,
  isRange,
  matchesFilters,
  organizerOptions,
  searchFromFilters,
  type EventFilters,
  type Option,
  type MaxDistance,
} from "@/lib/event-filters"
import { DISCIPLINE_LABELS, type Discipline } from "@/lib/event-meta"
import { buildCalendar, downloadIcs } from "@/lib/ics"
import { EventsTable } from "@/components/events-table"
import { EventsMap } from "@/components/events-map"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const route = getRouteApi("/")

// Shared pill look for range/discipline toggles and the selects.
const PILL =
  "h-9 rounded-full border-2 border-border bg-white px-3.5 font-heading text-[0.85rem] font-bold tracking-[0.08em] uppercase hover:border-foreground hover:bg-white"
const PILL_ON =
  "data-pressed:border-foreground data-pressed:bg-foreground data-pressed:text-white"

export function Calendar({ today }: { today: string }) {
  return (
    <section id="calendar" className="scroll-mt-20 py-10 md:py-14">
      <div className="mx-auto max-w-[1160px] px-5">
        <h2 className="mb-4 text-[clamp(1.75rem,3.4vw,2.4rem)] font-extrabold">
          Find your next tournament
        </h2>
        <Suspense fallback={<CalendarFallback />}>
          <CalendarBody today={today} />
        </Suspense>
      </div>
    </section>
  )
}

function useFilters() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const filters = useMemo(() => filtersFromSearch(search), [search])
  const update = (patch: Partial<EventFilters>) =>
    navigate({
      search: (prev) => ({
        ...searchFromFilters({ ...filtersFromSearch(prev), ...patch }),
        view: prev.view,
      }),
      replace: true,
      resetScroll: false,
    })
  return [filters, update] as const
}

function CalendarBody({ today }: { today: string }) {
  const { data: upcoming } = useUpcomingEvents(today)
  const [filters, setFilters] = useFilters()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const view = search.view ?? "list"

  // The search box keeps its own state so typing never waits on the
  // router; the URL catches up after a short pause.
  const [q, setQ] = useState(filters.q)
  const deferredQ = useDeferredValue(q)
  useEffect(() => {
    if (q === filters.q) return
    const timer = setTimeout(() => setFilters({ q }), 300)
    return () => clearTimeout(timer)
  }, [q]) // Only on typing: Clear filters resets both sides itself.

  const effective = { ...filters, q: deferredQ }
  const shown = upcoming.filter((e) => matchesFilters(e, effective, today))
  const active = activeFilters({ ...filters, q })

  const clearAll = () => {
    setQ("")
    setFilters(DEFAULT_FILTERS)
  }

  const countries = countryOptions(upcoming, filters.country)
  // Organizers of the selected country only, so the list stays short.
  const inCountry =
    filters.country === ALL_COUNTRIES
      ? upcoming
      : upcoming.filter((e) => e.country === filters.country)
  const organizers = organizerOptions(inCountry, filters.org)

  // For the empty state: how many results each relaxation would bring back.
  const relaxed = (facets: ("range" | "country" | "km")[]) =>
    upcoming.filter((e) => matchesFilters(e, effective, today, facets)).length
  const suggestions: Suggestion[] = []
  if (shown.length === 0) {
    if (filters.km !== null) {
      suggestions.push({
        label: "Any distance",
        count: relaxed(["km"]),
        apply: () => setFilters({ km: null }),
      })
    }
    const ranged = filters.range !== "all"
    const localized = filters.country !== ALL_COUNTRIES
    if (ranged) {
      suggestions.push({
        label: "Show all dates",
        count: relaxed(["range"]),
        apply: () => setFilters({ range: "all" }),
      })
    }
    if (localized) {
      suggestions.push({
        label: "Search all countries",
        count: relaxed(["country"]),
        apply: () => setFilters({ country: ALL_COUNTRIES, org: "" }),
      })
    }
    if (ranged && localized && suggestions.every((s) => s.count === 0)) {
      suggestions.push({
        label: "All dates, all countries",
        count: relaxed(["range", "country"]),
        apply: () => setFilters({ range: "all", country: ALL_COUNTRIES }),
      })
    }
  }

  return (
    <>
      <FilterBar
        q={q}
        onQ={setQ}
        filters={filters}
        onChange={setFilters}
        countries={countries}
        organizers={organizers}
        totals={{ countries: upcoming.length, organizers: inCountry.length }}
        activeCount={active.length}
        onClear={clearAll}
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p
          className="text-xs text-muted-foreground"
          title="Straight-line distance, not driving distance"
        >
          Distances from Brunswick · straight-line
        </p>
        <div
          className="inline-flex rounded-full border border-border bg-card p-1"
          aria-label="Calendar view"
          role="group"
        >
          {(["list", "map"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              className={cn(
                "min-h-9 rounded-full px-5 text-sm font-semibold",
                view === value
                  ? "bg-foreground text-white"
                  : "text-muted-foreground hover:bg-muted"
              )}
              onClick={() =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    view: value === "map" ? "map" : undefined,
                  }),
                  replace: true,
                  resetScroll: false,
                })
              }
            >
              {value === "map" ? "Map" : "List"}
            </button>
          ))}
        </div>
      </div>
      <EventsTable
        map={
          view === "map" ? (
            <EventsMap
              events={shown}
              today={today}
              country={filters.country}
              km={filters.km}
            />
          ) : undefined
        }
        data={shown}
        today={today}
        empty={
          <EmptyState
            onClear={active.length > 0 ? clearAll : undefined}
            rangeSet={filters.range !== "all"}
            suggestions={suggestions.filter((s) => s.count > 0)}
          />
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span aria-live="polite">
              Showing{" "}
              <strong className="text-foreground">{shown.length}</strong> of{" "}
              {upcoming.length} competitions
            </span>
            {shown.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                aria-label={`Download the ${shown.length} shown competitions as a calendar file (.ics)`}
                onClick={() =>
                  downloadIcs(
                    "bjj-competitions.ics",
                    buildCalendar(shown, { name: "BJJ competitions" })
                  )
                }
              >
                <Download />
                Export .ics
              </Button>
            )}
          </div>
        }
      />
    </>
  )
}

function FilterBar({
  q,
  onQ,
  filters,
  onChange,
  countries,
  organizers,
  totals,
  activeCount,
  onClear,
}: {
  q: string
  onQ: (q: string) => void
  filters: EventFilters
  onChange: (patch: Partial<EventFilters>) => void
  countries: Option[]
  organizers: Option[]
  /** Counts shown on the "All …" options. */
  totals: { countries: number; organizers: number }
  activeCount: number
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  // Facets hidden behind the mobile "Filters" button (search/range stay out).
  const hiddenCount =
    filters.disciplines.length +
    (filters.country !== DEFAULT_FILTERS.country ? 1 : 0) +
    (filters.org ? 1 : 0) +
    (filters.km !== null ? 1 : 0)

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-border bg-card p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 md:min-w-[240px]">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder="Search events…"
            aria-label="Search competitions"
            className="h-9 rounded-full border-2 border-border bg-white pl-9 text-base md:text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className={cn(PILL, "gap-1.5 md:hidden")}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          <SlidersHorizontal />
          Filters
          {hiddenCount > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[0.7rem] leading-4 text-white">
              {hiddenCount}
            </span>
          )}
        </Button>
        <ToggleGroup
          value={[filters.range]}
          onValueChange={([value]) => {
            // Base UI allows unpressing the active item; keep one selected.
            if (isRange(value)) onChange({ range: value })
          }}
          spacing={1}
          aria-label="Time window"
          className="w-full md:w-auto"
        >
          {RANGES.map((r) => (
            <ToggleGroupItem
              key={r.value}
              value={r.value}
              className={cn(PILL, PILL_ON, "flex-1 md:flex-none")}
            >
              {r.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div
        id={panelId}
        className={cn(
          "flex-wrap items-center gap-2 md:flex",
          open ? "flex" : "hidden"
        )}
      >
        <ToggleGroup
          multiple
          value={filters.disciplines}
          onValueChange={(value) =>
            onChange({
              disciplines: DISCIPLINES.filter((d) => value.includes(d)),
            })
          }
          spacing={1}
          aria-label="Discipline"
        >
          {DISCIPLINES.map((d: Discipline) => (
            <ToggleGroupItem key={d} value={d} className={cn(PILL, PILL_ON)}>
              {DISCIPLINE_LABELS[d]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <PillSelect
          label="Country"
          value={filters.country}
          onChange={(country) => onChange({ country, org: "" })}
          options={[
            {
              value: ALL_COUNTRIES,
              label: "All countries",
              count: totals.countries,
            },
            ...countries,
          ]}
          highlighted={filters.country !== DEFAULT_FILTERS.country}
        />
        <PillSelect
          label="Organizer"
          value={filters.org}
          onChange={(org) => onChange({ org })}
          options={[
            {
              value: "",
              label: "All organizers",
              count: totals.organizers,
            },
            ...organizers,
          ]}
          highlighted={filters.org !== ""}
        />
        <div
          className="w-full md:w-auto"
          title="Straight-line distance from Brunswick"
        >
          <PillSelect
            label="Max distance from Brunswick"
            value={filters.km === null ? "" : String(filters.km)}
            onChange={(value) =>
              onChange({ km: value ? (Number(value) as MaxDistance) : null })
            }
            options={[
              { value: "", label: "Max distance: Any" },
              ...DISTANCES.map((km) => ({
                value: String(km),
                label: `Max distance: ${km} km`,
              })),
            ]}
            highlighted={filters.km !== null}
          />
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto px-2 text-sm font-medium text-primary-deep underline-offset-4 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}

/** Native <select> styled as a pill: accessible and mobile-friendly. */
function PillSelect({
  label,
  value,
  onChange,
  options,
  highlighted,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string; count?: number }[]
  highlighted: boolean
}) {
  return (
    <div className="relative w-full md:w-auto">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          PILL,
          "w-full cursor-pointer appearance-none truncate pr-8 md:w-auto md:max-w-[16rem]",
          highlighted && "border-foreground"
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
            {o.count !== undefined && ` (${o.count})`}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}

/** A one-click way out of an empty result, with its result count. */
interface Suggestion {
  label: string
  count: number
  apply: () => void
}

function EmptyState({
  onClear,
  rangeSet,
  suggestions,
}: {
  onClear?: () => void
  rangeSet: boolean
  suggestions: Suggestion[]
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <SearchX className="size-8 text-muted-foreground" aria-hidden />
      <p className="font-heading text-xl font-bold tracking-[0.04em] uppercase">
        No competitions match your filters
      </p>
      <p className="max-w-[28rem] text-sm text-muted-foreground">
        {rangeSet
          ? "Try a longer time window, or loosen the other filters."
          : "Try a different search or loosen the filters."}
      </p>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        {onClear && (
          <Button type="button" onClick={onClear} className="h-9 px-4">
            Clear filters
          </Button>
        )}
        {suggestions.map((s) => (
          <Button
            key={s.label}
            type="button"
            variant="outline"
            onClick={s.apply}
            className="h-9 px-4"
          >
            {s.label} ({s.count})
          </Button>
        ))}
      </div>
    </div>
  )
}

function CalendarFallback() {
  return (
    <>
      <div className="mb-4 h-[106px] animate-pulse rounded-2xl border border-border bg-card" />
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </>
  )
}
