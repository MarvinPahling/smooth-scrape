import { gte, lte, useLiveSuspenseQuery } from "@tanstack/react-db"
import { eventCollection } from "@/lib/collections"
import { addDays } from "@/lib/dates"
import type { Range } from "@/lib/event-filters"

/**
 * Live query over the events collection. On the server it suspends, and
 * routerWithDbClient streams the result to the browser, which hydrates
 * from that snapshot before its own collection sync takes over.
 */
export function useUpcomingEvents(today: string, range: Range = "all") {
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
