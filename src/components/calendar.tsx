import { Suspense, useDeferredValue, useState, useTransition } from "react"
import { Search } from "lucide-react"
import {
  RANGES,
  isRange,
  useUpcomingEvents,
  type Range,
} from "@/lib/upcoming-events"
import { EventsTable } from "@/components/events-table"
import { Eyebrow } from "@/components/eyebrow"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export function Calendar({ today }: { today: string }) {
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
