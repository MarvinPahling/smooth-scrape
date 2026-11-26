import { scrapeEvents } from "./scrape"

const saved = await scrapeEvents()
console.info(`Saved ${saved} events to events.db`)
