import { asc } from "drizzle-orm"
import { openDb, events } from "./db"

const rows = openDb().select().from(events).orderBy(asc(events.startDate)).all()
console.table(
  rows.map((r) => ({
    date: r.startDate,
    title: r.title,
    city: r.city,
    url: r.url,
  }))
)
