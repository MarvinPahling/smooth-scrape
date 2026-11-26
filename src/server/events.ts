import { createServerFn } from "@tanstack/react-start"
import { asc } from "drizzle-orm"
import { events, openDb } from "@/scraper/db"

let db: ReturnType<typeof openDb> | undefined

/** Server-only: reads the events the scraper stored in events.db. */
export const getEvents = createServerFn({ method: "GET" }).handler(() => {
  db ??= openDb()
  return db.select().from(events).orderBy(asc(events.startDate)).all()
})
