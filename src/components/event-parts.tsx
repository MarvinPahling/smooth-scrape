// Small presentational pieces shared by the desktop table rows and the
// mobile event cards.
import { CalendarPlus, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BjjEvent } from "@/lib/collections"
import { dateParts, soonLabel } from "@/lib/dates"
import { distanceFromHome, formatDistance } from "@/lib/geo"
import {
  DEFAULT_COUNTRY,
  DISCIPLINE_LABELS,
  countryName,
  disciplinesOf,
  organizerOf,
  sourceLabel,
} from "@/lib/event-meta"
import { buildCalendar, downloadIcs, icsFilename } from "@/lib/ics"
import { Button } from "@/components/ui/button"

/** "Open Berlin Open on Smoothcomp" */
export const openLabel = (event: BjjEvent) =>
  `Open ${event.title} on ${sourceLabel(event)}`

/**
 * Compact date tile. Inside a month group the month is redundant, so it
 * shows the weekday instead ("SAT / 05"); ungrouped it shows "DEC / 05".
 */
export function DateTile({
  event,
  showMonth,
  className,
}: {
  event: BjjEvent
  showMonth: boolean
  className?: string
}) {
  const start = dateParts(event.startDate)
  const end = dateParts(event.endDate)
  const multiDay = event.endDate !== event.startDate
  const top = showMonth
    ? start.month
    : multiDay
      ? `${start.weekday}–${end.weekday}`
      : start.weekday
  return (
    <div
      className={cn(
        "flex w-[3.75rem] shrink-0 flex-col items-center justify-center rounded-[10px] border border-border bg-white py-1 leading-none",
        className
      )}
    >
      <span className="font-heading text-[0.65rem] font-bold tracking-[0.14em] text-primary-deep uppercase">
        {top}
      </span>
      <span
        className={cn(
          "font-heading font-extrabold tabular-nums",
          multiDay ? "text-base leading-5" : "text-xl leading-5"
        )}
      >
        {start.day}
        {multiDay && `–${end.day}`}
      </span>
    </div>
  )
}

/** "Tomorrow", "This weekend", "In 5 days"; nothing beyond two weeks. */
export function SoonLabel({
  event,
  today,
}: {
  event: BjjEvent
  today: string
}) {
  const label = soonLabel(today, event.startDate, event.endDate)
  if (!label) return null
  const urgent = !label.startsWith("In ")
  return (
    <span
      className={cn(
        "font-heading text-xs font-bold tracking-[0.12em] uppercase",
        urgent ? "text-primary-deep" : "text-muted-foreground"
      )}
    >
      {label}
    </span>
  )
}

/** Organizer · discipline chips (+ the "soon" label when relevant). */
export function EventMeta({
  event,
  today,
  className,
}: {
  event: BjjEvent
  today: string
  className?: string
}) {
  const organizer = organizerOf(event)
  const disciplines = disciplinesOf(event)
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 leading-none",
        className
      )}
    >
      <SoonLabel event={event} today={today} />
      {organizer && (
        <span className="font-heading text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {organizer.label}
        </span>
      )}
      {disciplines.map((d) => (
        <span
          key={d}
          className="rounded-full border border-border px-1.5 py-0.5 font-heading text-[0.68rem] leading-none font-bold tracking-[0.08em] text-muted-foreground uppercase"
        >
          {DISCIPLINE_LABELS[d]}
        </span>
      ))}
    </div>
  )
}

const flag = (code: string) =>
  /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(
        ...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
      )
    : null

/** City, plus the country when it isn't the default one. */
export function Place({
  event,
  className,
}: {
  event: BjjEvent
  className?: string
}) {
  // Some scraped cities carry a trailing comma ("Round Rock,").
  const city = event.city?.replace(/[\s,]+$/, "")
  const foreign = event.country !== DEFAULT_COUNTRY
  const emoji = flag(event.country)
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 text-muted-foreground",
        className
      )}
    >
      <MapPin className="size-3.5 shrink-0 text-primary-deep" aria-hidden />
      <span className="truncate">{city ?? "—"}</span>
      {foreign && (
        <span
          title={countryName(event.country)}
          className="shrink-0 text-xs font-medium whitespace-nowrap"
        >
          {emoji ? (
            <>
              <span aria-hidden>{emoji} </span>
              <span className="sr-only">{countryName(event.country)}</span>
              <span aria-hidden>{event.country}</span>
            </>
          ) : (
            `· ${countryName(event.country)}`
          )}
        </span>
      )}
    </span>
  )
}

/** Stable formatting shared by list, mobile cards and the map. */
export function Distance({
  event,
  label = false,
}: {
  event: BjjEvent
  label?: boolean
}) {
  return (
    <span
      title="Straight-line distance from Brunswick"
      className="text-sm whitespace-nowrap text-muted-foreground tabular-nums"
    >
      {formatDistance(distanceFromHome(event))}
      {label && " from Brunswick"}
    </span>
  )
}

/** Icon button that downloads a one-event .ics file. */
export function AddToCalendarButton({
  event,
  className,
}: {
  event: BjjEvent
  className?: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={`Add ${event.title} to calendar`}
      title="Add to calendar (.ics)"
      className={cn(
        "relative z-10 text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={(e) => {
        // The row behind is a link; don't open it too.
        e.stopPropagation()
        e.preventDefault()
        downloadIcs(
          icsFilename(event.title),
          buildCalendar([event], { name: event.title })
        )
      }}
    >
      <CalendarPlus />
    </Button>
  )
}

/**
 * Stretched link: an <a> whose ::after covers the whole row/card (the
 * nearest `relative` ancestor), so the entire row is clickable while
 * staying a real, keyboard-focusable link with one accessible name.
 */
export function RowLink({
  event,
  className,
}: {
  event: BjjEvent
  className?: string
}) {
  return (
    <a
      href={event.url}
      target="_blank"
      rel="noreferrer"
      aria-label={openLabel(event)}
      className={cn(
        "font-semibold text-foreground no-underline outline-none",
        "after:absolute after:inset-0 after:rounded-[inherit] after:content-['']",
        "focus-visible:after:outline-3 focus-visible:after:-outline-offset-3 focus-visible:after:outline-ring",
        className
      )}
    >
      {event.title}
    </a>
  )
}
