import { collectionOptions } from "@tanstack/react-db"
import { queryCollectionOptions } from "@tanstack/query-db-collection"
import type { QueryClient } from "@tanstack/query-core"
import { getEvents } from "@/server/events"

export type BjjEvent = Awaited<ReturnType<typeof getEvents>>[number]

/**
 * Collection descriptor. Each DbClient (one per SSR request, one in the
 * browser) materializes its own instance with its own QueryClient.
 */
export const eventCollection = collectionOptions("events", (client) =>
  queryCollectionOptions({
    id: "events",
    queryKey: ["events"],
    queryFn: () => getEvents(),
    queryClient: client.requireDependency<QueryClient>("queryClient"),
    getKey: (event: BjjEvent) => event.id,
  })
)
