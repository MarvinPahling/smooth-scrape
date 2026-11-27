import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { sqliteTable, text, real } from "drizzle-orm/sqlite-core"

export const events = sqliteTable("events", {
  id: text("id").primaryKey(), // "<source>:<source event id>"
  source: text("source").notNull(), // "smoothcomp" | "ibjjf"
  title: text("title").notNull(),
  url: text("url").notNull(),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date").notNull(),
  city: text("city"),
  country: text("country").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  coverImage: text("cover_image"),
  scrapedAt: text("scraped_at").notNull(),
})

export type EventRow = typeof events.$inferInsert

export function openDb(path = "events.db") {
  const sqlite = new Database(path, { create: true })
  // Demo: create the schema inline instead of running drizzle-kit migrations.
  // events.db is a re-scrapable cache: drop tables from before multi-source.
  const cols = sqlite.query("PRAGMA table_info(events)").all() as {
    name: string
  }[]
  if (cols.length > 0 && !cols.some((c) => c.name === "source")) {
    sqlite.run("DROP TABLE events")
  }
  sqlite.run(`CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, source TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL,
    start_date TEXT NOT NULL, end_date TEXT NOT NULL, city TEXT,
    country TEXT NOT NULL, lat REAL, lng REAL, cover_image TEXT,
    scraped_at TEXT NOT NULL)`)
  return drizzle(sqlite)
}

export type Db = ReturnType<typeof openDb>

/** Upserts rows in one transaction. */
export function saveEvents(db: Db, rows: EventRow[]) {
  db.transaction((tx) => {
    for (const row of rows) {
      tx.insert(events)
        .values(row)
        .onConflictDoUpdate({ target: events.id, set: row })
        .run()
    }
  })
}
