import { ArrowUpRight, MapPin } from "lucide-react"
import type { BjjEvent } from "@/lib/collections"
import { daysBetween, formatLong, formatStamp, relativeDays } from "@/lib/dates"
import { useUpcomingEvents } from "@/lib/upcoming-events"
import { Button } from "@/components/ui/button"
import { Eyebrow } from "@/components/eyebrow"

export function Hero({ today }: { today: string }) {
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

export function HeroFallback() {
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
