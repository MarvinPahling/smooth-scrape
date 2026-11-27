import { Suspense } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { todayIso } from "@/lib/dates"
import { validateCalendarSearch } from "@/lib/event-filters"
import { Hero, HeroFallback } from "@/components/hero"
import { Calendar } from "@/components/calendar"

export const Route = createFileRoute("/")({
  // Calendar filters live in the URL so a filtered view can be shared.
  validateSearch: validateCalendarSearch,
  component: HomePage,
})

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
