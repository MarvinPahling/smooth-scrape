import { useState } from "react"
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  MapPin,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { BjjEvent } from "@/lib/collections"
import { dateParts, daysBetween, relativeDays, todayIso } from "@/lib/dates"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Module scope: features and columns must be stable across renders.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
})

const SORT_ICONS = { asc: ArrowUp, desc: ArrowDown }

const helper = createColumnHelper<typeof features, BjjEvent>()

const columns = helper.columns([
  helper.accessor("startDate", {
    header: "Date",
    sortFn: "text",
    cell: ({ row }) => <DateChip event={row.original} />,
  }),
  helper.accessor("title", {
    header: "Competition",
    sortFn: "alphanumeric",
    cell: ({ row }) => <TitleCell event={row.original} />,
  }),
  helper.accessor("city", {
    header: "City",
    sortFn: "alphanumeric",
    sortUndefined: "last",
    cell: ({ getValue }) => (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <MapPin className="size-4 text-primary-deep" />
        {getValue() ?? "—"}
      </span>
    ),
  }),
  helper.display({
    id: "countdown",
    header: "Starts",
    cell: ({ row }) => <Countdown start={row.original.startDate} />,
  }),
  helper.display({
    id: "link",
    header: () => <span className="sr-only">Link</span>,
    cell: ({ row }) => (
      <Button
        size="sm"
        variant="outline"
        className="px-3"
        nativeButton={false}
        render={<a href={row.original.url} target="_blank" rel="noreferrer" />}
      >
        Details <ArrowUpRight />
      </Button>
    ),
  }),
])

export function EventsTable({
  data,
  search,
}: {
  data: BjjEvent[]
  search: string
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "startDate", desc: false },
  ])

  const table = useTable({
    features,
    columns,
    data,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    globalFilterFn: "includesString",
    getColumnCanGlobalFilter: (column) =>
      column.id === "title" || column.id === "city",
  })

  const rows = table.getRowModel().rows

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="bg-muted/60 hover:bg-muted/60">
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                const SortIcon = sorted ? SORT_ICONS[sorted] : ArrowUpDown
                return (
                  <TableHead
                    key={header.id}
                    className="h-12 px-4 font-heading text-[0.85rem] font-bold tracking-[0.14em] text-muted-foreground uppercase"
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
                          className={cn("size-3.5", !sorted && "opacity-40")}
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
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-muted-foreground"
              >
                No competitions match your filters.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-accent/40">
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className="px-4 py-3">
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
        {rows.length} of {data.length} competitions
      </div>
    </div>
  )
}

function DateChip({ event }: { event: BjjEvent }) {
  const start = dateParts(event.startDate)
  const multiDay = event.endDate !== event.startDate
  return (
    <div className="flex items-center gap-3">
      <div className="flex w-14 flex-col items-center rounded-xl border border-border bg-white py-1.5 leading-none">
        <span className="font-heading text-[0.7rem] font-bold tracking-[0.2em] text-primary-deep uppercase">
          {start.month}
        </span>
        <span className="font-heading text-2xl font-extrabold tabular-nums">
          {start.day}
        </span>
      </div>
      <span className="text-sm text-muted-foreground">
        {start.weekday}
        {multiDay && (
          <>
            {" – "}
            {dateParts(event.endDate).weekday}
          </>
        )}
      </span>
    </div>
  )
}

function TitleCell({ event }: { event: BjjEvent }) {
  // Organizer subdomains like grapplingindustries.smoothcomp.com.
  const host = new URL(event.url).hostname.split(".")[0]
  const organizer = host && host !== "smoothcomp" ? host : null
  return (
    <div className="flex max-w-[34rem] flex-col gap-0.5 whitespace-normal">
      <span className="font-semibold">{event.title}</span>
      {organizer && (
        <span className="font-heading text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {organizer}
        </span>
      )}
    </div>
  )
}

function Countdown({ start }: { start: string }) {
  const days = daysBetween(todayIso(), start)
  const soon = days <= 7
  return (
    <Badge
      variant={soon ? "default" : "outline"}
      className={cn(
        "rounded-full px-2.5 font-heading text-[0.8rem] font-bold tracking-[0.06em] uppercase",
        !soon && "text-muted-foreground"
      )}
    >
      {relativeDays(days)}
    </Badge>
  )
}
