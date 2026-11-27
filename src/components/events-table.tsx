import { useState, type ReactNode } from "react"
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BjjEvent } from "@/lib/collections"
import { monthYear } from "@/lib/dates"
import { distanceFromHome } from "@/lib/geo"
import {
  AddToCalendarButton,
  DateTile,
  Distance,
  EventMeta,
  Place,
  RowLink,
} from "@/components/event-parts"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Module scope: features and columns must be stable across renders.
// Filtering happens upstream (see lib/event-filters); the table only sorts.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
})

const SORT_ICONS = { asc: ArrowUp, desc: ArrowDown }

const helper = createColumnHelper<typeof features, BjjEvent>()

// Cells are rendered by hand below (they depend on grouping), so the
// columns only describe headers and sorting.
const columns = helper.columns([
  helper.accessor("startDate", { header: "Date", sortFn: "text" }),
  helper.accessor("title", { header: "Competition", sortFn: "alphanumeric" }),
  helper.accessor("city", {
    header: "City",
    sortFn: "alphanumeric",
    sortUndefined: "last",
  }),
  helper.accessor((event) => distanceFromHome(event) ?? undefined, {
    id: "distance",
    header: () => (
      <span title="Straight-line distance from Brunswick">
        Distance
        <span className="block text-[0.65rem] font-normal tracking-normal normal-case">
          from Brunswick
        </span>
      </span>
    ),
    sortFn: (a, b) =>
      (distanceFromHome(a.original) ?? 0) - (distanceFromHome(b.original) ?? 0),
    sortUndefined: "last",
    sortDescFirst: false,
  }),
  helper.display({
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
  }),
])

interface Group {
  key: string
  label: string
  events: BjjEvent[]
}

/** Consecutive events sharing a start month, in the given order. */
function groupByMonth(events: BjjEvent[]): Group[] {
  const groups: Group[] = []
  for (const event of events) {
    const key = event.startDate.slice(0, 7)
    const last = groups.at(-1)
    if (last?.key === key) last.events.push(event)
    else
      groups.push({ key, label: monthYear(event.startDate), events: [event] })
  }
  return groups
}

const countLabel = (n: number) => `${n} ${n === 1 ? "event" : "events"}`

export function EventsTable({
  data,
  today,
  empty,
  footer,
  map,
}: {
  data: BjjEvent[]
  today: string
  /** Rendered instead of the rows when `data` is empty. */
  empty: ReactNode
  footer: ReactNode
  map?: ReactNode
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "startDate", desc: false },
  ])

  const table = useTable({
    features,
    columns,
    data,
    state: { sorting },
    onSortingChange: setSorting,
  })

  const events = table.getRowModel().rows.map((row) => row.original)
  // Month groups only make sense in date order (either direction).
  const grouped = sorting.length === 0 || sorting[0]?.id === "startDate"
  const groups: Group[] = grouped
    ? groupByMonth(events)
    : [{ key: "all", label: "", events }]

  return (
    // overflow-clip (not hidden) rounds the corners without creating a
    // scroll container, so the sticky month headers still stick.
    <div className="overflow-clip rounded-2xl border border-border bg-card">
      {data.length === 0 ? (
        empty
      ) : map ? (
        map
      ) : (
        <>
          {/* Desktop: table. A raw <table> because the ui/table wrapper
              adds overflow-x-auto, which would break sticky headers. */}
          <table className="hidden w-full text-sm md:table">
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow
                  key={group.id}
                  className="bg-muted/60 hover:bg-muted/60"
                >
                  {group.headers.map((header) => {
                    const sorted = header.column.getIsSorted()
                    const SortIcon = sorted ? SORT_ICONS[sorted] : ArrowUpDown
                    return (
                      <TableHead
                        key={header.id}
                        aria-sort={
                          sorted
                            ? sorted === "asc"
                              ? "ascending"
                              : "descending"
                            : undefined
                        }
                        className={cn(
                          "h-10 px-4 font-heading text-[0.8rem] font-bold tracking-[0.14em] text-muted-foreground uppercase",
                          header.column.id === "startDate" && "w-[1%]",
                          header.column.id === "actions" && "w-[1%]"
                        )}
                      >
                        {header.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className={cn(
                              "inline-flex items-center gap-1.5 uppercase hover:text-foreground",
                              sorted && "text-foreground"
                            )}
                          >
                            <table.FlexRender header={header} />
                            <SortIcon
                              className={cn(
                                "size-3.5",
                                !sorted && "opacity-40"
                              )}
                            />
                          </button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            {groups.map((group) => (
              <TableBody key={group.key}>
                {grouped && (
                  <tr>
                    <th
                      colSpan={columns.length}
                      scope="colgroup"
                      className="sticky top-16 z-20 border-y border-border bg-muted px-4 py-2 text-left"
                    >
                      <MonthLabel group={group} />
                    </th>
                  </tr>
                )}
                {group.events.map((event) => (
                  <TableRow
                    key={event.id}
                    className="group relative hover:bg-accent/40 has-[a:focus-visible]:bg-accent/40"
                  >
                    <TableCell className="py-2 pr-2 pl-4">
                      <DateTile event={event} showMonth={!grouped} />
                    </TableCell>
                    <TableCell className="py-2 whitespace-normal">
                      <div className="flex max-w-[40rem] flex-col gap-1">
                        <RowLink
                          event={event}
                          className="leading-snug group-hover:text-primary-deep"
                        />
                        <EventMeta event={event} today={today} />
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Place event={event} className="max-w-[16rem]" />
                    </TableCell>
                    <TableCell className="py-2">
                      <Distance event={event} />
                    </TableCell>
                    <TableCell className="py-2 pr-3">
                      <div className="flex items-center gap-1">
                        <AddToCalendarButton event={event} />
                        <ArrowUpRight
                          aria-hidden
                          className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-has-[a:focus-visible]:opacity-100"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            ))}
          </table>

          {/* Mobile: stacked cards, no horizontal scrolling. */}
          <div className="md:hidden">
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label || undefined}>
                {grouped && (
                  <h3 className="sticky top-16 z-20 border-b border-border bg-muted px-4 py-2 font-sans normal-case [&:not(:first-child)]:border-t">
                    <MonthLabel group={group} />
                  </h3>
                )}
                <ul className="divide-y divide-border">
                  {group.events.map((event) => (
                    <li key={event.id}>
                      <EventCard
                        event={event}
                        today={today}
                        showMonth={!grouped}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
      <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
        {footer}
      </div>
    </div>
  )
}

function MonthLabel({ group }: { group: Group }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="font-heading text-[0.95rem] font-bold tracking-[0.1em] text-foreground uppercase">
        {group.label}
      </span>
      <span className="text-xs font-normal text-muted-foreground">
        · {countLabel(group.events.length)}
      </span>
    </span>
  )
}

function EventCard({
  event,
  today,
  showMonth,
}: {
  event: BjjEvent
  today: string
  showMonth: boolean
}) {
  return (
    <article className="relative flex gap-3 px-4 py-3 active:bg-accent/40 has-[a:focus-visible]:bg-accent/40">
      <DateTile event={event} showMonth={showMonth} className="self-start" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <RowLink
          event={event}
          className="line-clamp-2 text-[0.95rem] leading-snug"
        />
        <EventMeta event={event} today={today} />
        <Place event={event} className="text-sm" />
        <Distance event={event} label />
      </div>
      <AddToCalendarButton event={event} className="-mr-1.5 self-start" />
    </article>
  )
}
