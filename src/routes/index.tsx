import { Suspense } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { todayIso } from "@/lib/dates"
import { Hero, HeroFallback } from "@/components/hero"
import { Calendar } from "@/components/calendar"

export const Route = createFileRoute("/")({ component: HomePage })

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
