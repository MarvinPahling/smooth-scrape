import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core"

export const events = sqliteTable("events", {
  id: integer("id").primaryKey(), // smoothcomp event id
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
  sqlite.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY, title TEXT NOT NULL, url TEXT NOT NULL,
    start_date TEXT NOT NULL, end_date TEXT NOT NULL, city TEXT,
    country TEXT NOT NULL, lat REAL, lng REAL, cover_image TEXT,
    scraped_at TEXT NOT NULL)`)
  return drizzle(sqlite)
}
