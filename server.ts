/**
 * Production server: `bun run build && bun run start`.
 *
 * 1. Scrape smoothcomp.com into events.db (failures keep the old data),
 *    then rescrape every 24 h (SCRAPE_INTERVAL_HOURS).
 * 2. Serve the built client assets from dist/client.
 * 3. Hand every other request to the TanStack Start SSR handler.
 */
import { join, normalize } from "node:path"
import { scrapeOnStart, startScrapeSchedule } from "./src/scraper/on-start.ts"

type StartHandler = { fetch: (request: Request) => Promise<Response> }

const CLIENT_DIR = join(import.meta.dir, "dist", "client")
// Computed path, so type checking works before the first build.
const serverEntry = join(import.meta.dir, "dist", "server", "server.js")

if (!(await Bun.file(serverEntry).exists())) {
  console.error("dist/ is missing. Run `bun run build` first.")
  process.exit(1)
}

await scrapeOnStart()
startScrapeSchedule()

const { default: handler } = (await import(serverEntry)) as {
  default: StartHandler
}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3100),
  async fetch(request) {
    const { pathname } = new URL(request.url)
    const filePath = normalize(join(CLIENT_DIR, decodeURIComponent(pathname)))
    if (filePath.startsWith(CLIENT_DIR + "/")) {
      const file = Bun.file(filePath)
      if (await file.exists()) {
        const immutable = pathname.startsWith("/assets/")
        return new Response(file, {
          headers: immutable
            ? { "Cache-Control": "public, max-age=31536000, immutable" }
            : {},
        })
      }
    }
    return handler.fetch(request)
  },
})

console.info(`Mat Calendar running on ${server.url}`)
