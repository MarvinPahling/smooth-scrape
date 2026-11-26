import { defineConfig, type Plugin } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { scrapeOnStart, startScrapeSchedule } from "./src/scraper/on-start.ts"

/** Dev only: scrape before the dev server listens, then rescrape on a timer. */
function scrapeOnDevStart(): Plugin {
  return {
    name: "scrape-on-dev-start",
    apply: "serve",
    async configureServer(server) {
      await scrapeOnStart()
      const stop = startScrapeSchedule()
      server.httpServer?.once("close", stop)
    },
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    scrapeOnDevStart(),
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
