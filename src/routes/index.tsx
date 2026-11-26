import { Suspense, useDeferredValue, useState, useTransition } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { gte, lte, useLiveSuspenseQuery } from "@tanstack/react-db"
import { ArrowUpRight, MapPin, Search } from "lucide-react"
import { eventCollection, type BjjEvent } from "@/lib/collections"
import {
  addDays,
  daysBetween,
  formatLong,
  formatStamp,
  relativeDays,
  todayIso,
} from "@/lib/dates"
import { EventsTable } from "@/components/events-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export const Route = createFileRoute("/")({ component: HomePage })

const RANGES = [
  { value: "all", label: "All" },
  { value: "30", label: "30 days" },
  { value: "90", label: "3 months" },
] as const
type Range = (typeof RANGES)[number]["value"]

const isRange = (value: string | undefined): value is Range =>
  RANGES.some((r) => r.value === value)

/**
 * Live query over the events collection. On the server it suspends, and
 * routerWithDbClient streams the result to the browser, which hydrates
 * from that snapshot before its own collection sync takes over.
 */
function useUpcomingEvents(today: string, range: Range = "all") {
  return useLiveSuspenseQuery({
    query: (q) => {
      let query = q
        .from({ event: eventCollection })
        .where(({ event }) => gte(event.endDate, today))
      if (range !== "all") {
        const until = addDays(today, Number(range))
        query = query.where(({ event }) => lte(event.startDate, until))
      }
      return query.orderBy(({ event }) => event.startDate, "asc")
    },
  })
}

function HomePage() {
  const today = todayIso()
  return (
    <main>
      <Suspense fallback={<HeroFallback />}>
        <Hero today={today} />
      </Suspense>
      <Calendar today={today} />
    </main>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────

function Hero({ today }: { today: string }) {
  const { data: events } = useUpcomingEvents(today)
  const next = events.at(0)
  const cities = new Set(events.map((e) => e.city).filter(Boolean)).size
  const lastScraped = events.reduce(
    (max, e) => (e.scrapedAt > max ? e.scrapedAt : max),
    ""
  )

  return (
    <HeroShell
      facts={[
        { value: events.length, label: "Upcoming competitions" },
        { value: cities, label: "Cities" },
        {
          value: next ? Math.max(0, daysBetween(today, next.startDate)) : "—",
          label: "Days until the next one",
        },
        {
          value: lastScraped ? formatStamp(lastScraped.slice(0, 10)) : "—",
          label: "Last scraped",
        },
      ]}
    >
      {next ? <NextUp event={next} today={today} /> : <NoData />}
    </HeroShell>
  )
}

function HeroShell({
  facts,
  children,
}: {
  facts: Array<{ value: React.ReactNode; label: string }>
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto grid max-w-[1160px] gap-10 px-5 md:grid-cols-[1.15fr_.85fr]">
        <div className="flex flex-col justify-center gap-6 py-14">
          <Eyebrow>Upcoming competitions</Eyebrow>
          <h1 className="text-[clamp(2.7rem,7.5vw,5.4rem)] font-extrabold">
            BJJ tournaments in Germany
          </h1>
          <p className="max-w-[34em] text-lg text-muted-foreground">
            Every upcoming Gi and No-Gi Jiu-Jitsu competition in Germany listed
            on Smoothcomp, in one sortable calendar.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              className="h-auto px-6 py-3.5 text-[1.05rem]"
              nativeButton={false}
              render={<a href="#calendar" />}
            >
              See the calendar
            </Button>
          </div>
          <dl className="mt-2 grid grid-cols-2 border-t border-border sm:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-1 pt-4 pr-3">
                <dt className="order-2 text-sm text-muted-foreground">
                  {fact.label}
                </dt>
                <dd className="font-heading text-3xl leading-none font-extrabold tabular-nums">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative my-9 hidden min-h-[380px] md:block">
          {children}
        </div>
      </div>
    </section>
  )
}

function HeroFallback() {
  const facts = [
    "Upcoming competitions",
    "Cities",
    "Days until the next one",
    "Last scraped",
  ]
  return (
    <HeroShell facts={facts.map((label) => ({ value: "…", label }))}>
      <div className="absolute inset-0 animate-pulse rounded-2xl bg-muted" />
    </HeroShell>
  )
}

/** Card with the academia's offset red block behind it. */
function NextUp({ event, today }: { event: BjjEvent; today: string }) {
  return (
    <>
      <div className="absolute inset-[22px_-18px_-18px_22px] rounded-2xl bg-primary" />
      <article className="absolute inset-0 flex flex-col justify-between gap-6 rounded-2xl bg-foreground p-8 text-white">
        <div className="flex flex-col gap-4">
          <span className="font-heading text-[0.85rem] font-bold tracking-[0.2em] text-[#ff7a66] uppercase">
            Next up · {relativeDays(daysBetween(today, event.startDate))}
          </span>
          <h2 className="text-[clamp(2rem,3.6vw,2.9rem)] font-extrabold">
            {event.title}
          </h2>
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1 text-[#c9ccd2]">
            <span className="font-semibold text-white">
              {formatLong(event.startDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 text-[#ff7a66]" /> {event.city}
            </span>
          </div>
          <Button
            className="h-auto self-start border-white bg-white px-6 py-3.5 text-[1.05rem] text-foreground hover:border-primary hover:bg-primary hover:text-white"
            nativeButton={false}
            render={<a href={event.url} target="_blank" rel="noreferrer" />}
          >
            View on Smoothcomp <ArrowUpRight />
          </Button>
        </div>
      </article>
    </>
  )
}

function NoData() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-8">
      <h2 className="text-3xl font-extrabold">No data yet</h2>
      <p className="text-muted-foreground">
        Run <code className="font-mono text-foreground">bun run scrape</code> to
        fill the database.
      </p>
    </div>
  )
}

// ─── Calendar ────────────────────────────────────────────────────────────

function Calendar({ today }: { today: string }) {
  const [search, setSearch] = useState("")
  const [range, setRange] = useState<Range>("all")
  const [isPending, startTransition] = useTransition()
  // Keep typing snappy; filtering the table can lag a frame behind.
  const deferredSearch = useDeferredValue(search)

  return (
    <section id="calendar" className="scroll-mt-24 py-[72px]">
      <div className="mx-auto max-w-[1160px] px-5">
        <div className="mb-8 flex max-w-[720px] flex-col gap-3">
          <Eyebrow>Calendar</Eyebrow>
          <h2 className="text-[clamp(2rem,4.6vw,3.3rem)] font-extrabold">
            Find your next tournament
          </h2>
          <p className="text-muted-foreground">
            Search by name or city, narrow the time window, and sort any column.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[20px] border border-border bg-muted p-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search competitions or cities…"
              aria-label="Search competitions or cities"
              className="h-11 rounded-full border-border bg-white pl-10 text-base"
            />
          </div>
          <ToggleGroup
            value={[range]}
            onValueChange={([value]) => {
              // Base UI allows unpressing the active item; keep one selected.
              if (isRange(value)) startTransition(() => setRange(value))
            }}
            spacing={1}
            aria-label="Time window"
          >
            {RANGES.map((r) => (
              <ToggleGroupItem
                key={r.value}
                value={r.value}
                className="h-11 rounded-full border-2 border-border bg-white px-4 font-heading text-[0.95rem] font-bold tracking-[0.08em] uppercase hover:border-foreground hover:bg-white data-pressed:border-foreground data-pressed:bg-foreground data-pressed:text-white"
              >
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div
          className={isPending ? "opacity-60 transition-opacity" : undefined}
        >
          <Suspense fallback={<TableFallback />}>
            <CalendarTable
              today={today}
              range={range}
              search={deferredSearch}
            />
          </Suspense>
        </div>
      </div>
    </section>
  )
}

function CalendarTable({
  today,
  range,
  search,
}: {
  today: string
  range: Range
  search: string
}) {
  const { data } = useUpcomingEvents(today, range)
  return <EventsTable data={data} search={search} />
}

function TableFallback() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-heading text-[0.85rem] leading-none font-bold tracking-[0.2em] text-primary-deep uppercase">
      {children}
    </span>
  )
}
