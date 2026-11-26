import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { QueryClient } from "@tanstack/query-core"
import { DbClient } from "@tanstack/react-db"
import { routerWithDbClient } from "@tanstack/react-router-with-db"
import { routeTree } from "./routeTree.gen"

export type RouterContext = { dbClient: DbClient }

export function getRouter() {
  const queryClient = new QueryClient()
  const dbClient = new DbClient({ queryClient })

  const router = createTanStackRouter({
    routeTree,
    context: { dbClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  })

  return routerWithDbClient(router, dbClient)
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
