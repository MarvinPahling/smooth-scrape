import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react"
import { cn } from "cn"
import type { BjjEvent } from "@/lib/collections"
import {
  addDays,
  daysBetween,
  formatLong,
  formatStamp,
  relativeDays,
} from "@/lib/dates"
import {
  DEFAULT_COUNTRY,
  DISCIPLINE_LABELS,
  countryName,
  disciplinesOf,
  organizerOf,
  sourceLabel,
} from "@/lib/event-meta"
import { useUpcomingEvents } from "@/lib/upcoming-events"
import { buttonVariants } from "@/components/ui/button"

export function Hero({ today }: { today: string }) {
  const { data: events } = useUpcomingEvents(today)
  // The hero speaks for the default country; fall back to everything if
  // that country has no upcoming events at all.
  const local = events.filter((e) => e.country === DEFAULT_COUNTRY)
  const pool = local.length > 0 ? local : events
  const next = pool.at(0)

  const [satIso, sunIso] = upcomingWeekend(today)
  const thisWeekend = pool.filter(
    (e) => e.startDate <= sunIso && e.endDate >= satIso
  ).length
  const in30 = addDays(today, 30)
  const next30 = pool.filter((e) => e.startDate <= in30).length
  const lastScraped = events.reduce(
    (max, e) => (e.scrapedAt > max ? e.scrapedAt : max),
    ""
  )

  return (
    <HeroShell
      stats={[
        { value: thisWeekend, label: "this weekend" },
        { value: next30, label: "in the next 30 days" },
      ]}
      updated={lastScraped ? formatStamp(lastScraped.slice(0, 10)) : "—"}
    >
      {next ? <NextUp event={next} today={today} /> : <NoData />}
    </HeroShell>
  )
}

/** Saturday and Sunday of the current (or coming) weekend, as ISO dates. */
function upcomingWeekend(today: string): [string, string] {
  const dow = new Date(Date.parse(today)).getUTCDay()
  const sat = dow === 0 ? addDays(today, -1) : addDays(today, 6 - dow)
  return [sat, addDays(sat, 1)]
}

// "a · b · c": a dot before every item but the first.
const SEPARATED = "not-first:before:mr-2 not-first:before:content-['·']"

// Fixed card height so the fallback and the real hero match (no layout shift).
const CARD_HEIGHT = "h-[188px] sm:h-[196px]"

function HeroShell({
  stats,
  updated,
  children,
}: {
  stats: Array<{ value: React.ReactNode; label: string }>
  updated: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto grid max-w-[1160px] items-center gap-6 px-5 py-5 md:grid-cols-[1fr_minmax(0,500px)] md:gap-10 md:py-9">
        <div className="flex flex-col gap-2.5 md:gap-3">
          <h1 className="text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold">
            BJJ competitions in {countryName(DEFAULT_COUNTRY)}
          </h1>
          <p className="text-muted-foreground">
            Smoothcomp tournaments, plus IBJJF events worldwide.
          </p>
          <ul className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {stats.map((stat) => (
              <li key={stat.label} className={SEPARATED}>
                <strong className="font-semibold text-foreground tabular-nums">
                  {stat.value}
                </strong>{" "}
                {stat.label}
              </li>
            ))}
            {/* Own line on phones, so fallback and real text wrap the same way. */}
            <li className={`${SEPARATED} max-sm:w-full max-sm:before:hidden`}>
              Updated {updated}
            </li>
          </ul>
        </div>
        <div className={`relative ${CARD_HEIGHT}`}>{children}</div>
      </div>
    </section>
  )
}

export function HeroFallback() {
  const pending = <span className="inline-block animate-pulse">…</span>
  return (
    <HeroShell
      stats={[
        { value: pending, label: "this weekend" },
        { value: pending, label: "in the next 30 days" },
      ]}
      updated={pending}
    >
      <div className="absolute inset-0 animate-pulse rounded-2xl bg-muted" />
    </HeroShell>
  )
}

/** Compact ink card with the academia's offset red block behind it. */
function NextUp({ event, today }: { event: BjjEvent; today: string }) {
  const organizer = organizerOf(event)
  const disciplines = disciplinesOf(event)
  const days = daysBetween(event.startDate, event.endDate) + 1
  return (
    <>
      <div className="absolute inset-[10px_-10px_-10px_10px] hidden rounded-2xl bg-primary sm:block" />
      <article className="absolute inset-0 flex flex-col justify-between gap-3 rounded-2xl bg-foreground p-4 text-white sm:p-6">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-semibold text-[#ff7a66]">
            Next up · {relativeDays(daysBetween(today, event.startDate))}
          </span>
          <h2
            title={event.title}
            className="line-clamp-2 text-[1.5rem] font-extrabold sm:text-[1.85rem]"
          >
            {event.title}
          </h2>
        </div>
        <div className="flex flex-col gap-2.5 sm:gap-3">
          <p className="flex items-center gap-x-4 gap-y-1 overflow-hidden text-sm whitespace-nowrap text-[#c9ccd2] sm:flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-semibold text-white">
              <CalendarDays className="size-4 text-[#ff7a66]" />
              {formatLong(event.startDate)}
              {days > 1 && (
                <span className="font-normal text-[#c9ccd2]">
                  · {days} days
                </span>
              )}
            </span>
            {event.city && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="size-4 shrink-0 text-[#ff7a66]" />
                <span className="truncate">{event.city}</span>
              </span>
            )}
            {organizer && (
              <span className="hidden sm:inline">{organizer.label}</span>
            )}
          </p>
          <div className="flex items-center justify-between gap-3">
            <ul
              className="flex min-w-0 flex-wrap gap-1.5"
              aria-label="Disciplines"
            >
              {disciplines.map((d) => (
                <li
                  key={d}
                  className="rounded-full border border-white/25 px-2 py-0.5 text-xs font-medium"
                >
                  {DISCIPLINE_LABELS[d]}
                </li>
              ))}
            </ul>
            <a
              href={event.url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ size: "sm" }),
                "h-8 bg-white px-3.5 text-foreground no-underline hover:bg-primary hover:text-white focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
              )}
            >
              View on {sourceLabel(event)} <ArrowUpRight />
            </a>
          </div>
        </div>
      </article>
    </>
  )
}

function NoData() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-6">
      <h2 className="text-2xl font-extrabold">No upcoming events</h2>
      <p className="text-sm text-muted-foreground">
        Nothing is listed right now. Check back soon.
      </p>
    </div>
  )
}
