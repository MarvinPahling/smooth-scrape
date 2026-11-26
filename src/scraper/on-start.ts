/**
 * Runs the scraper as a child process: once before a server starts
 * listening (`scrapeOnStart`) and then on a timer (`startScrapeSchedule`).
 *
 * A child process keeps Crawlee out of Vite's config bundle and the SSR
 * bundle. A failed scrape never stops the server: it keeps serving whatever
 * events.db already holds. Set SKIP_SCRAPE=1 to turn both off.
 */

const DEFAULT_INTERVAL_HOURS = 24

let running = false

/** Runs one scrape. Never throws. Skips if another scrape is still running. */
async function runScrape(label: string): Promise<void> {
  if (running) {
    console.warn(`[scrape] ${label}: previous scrape still running, skipping`)
    return
  }
  running = true
  console.info(`[scrape] ${label}: fetching events from smoothcomp.com …`)
  const started = performance.now()
  let code: number
  let out = ""
  let err = ""
  try {
    const proc = Bun.spawn(["bun", "src/scraper/cli.ts"], {
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, CRAWLEE_LOG_LEVEL: "WARNING" },
    })
    ;[out, err, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
  } catch (error) {
    code = -1
    err = String(error)
  } finally {
    running = false
  }
  const seconds = ((performance.now() - started) / 1000).toFixed(1)
  if (code === 0) {
    console.info(`[scrape] ${label}: ${out.trim()} (${seconds}s)`)
  } else {
    console.error(
      `[scrape] ${label}: failed, keeping existing events.db\n${err || out}`
    )
  }
}

/** Scrapes once. Call before the server starts listening. */
export async function scrapeOnStart(): Promise<void> {
  if (process.env.SKIP_SCRAPE === "1") {
    console.info("[scrape] SKIP_SCRAPE=1, using existing events.db")
    return
  }
  await runScrape("startup")
}

/**
 * Scrapes again every SCRAPE_INTERVAL_HOURS (default 24). The timer does not
 * keep the process alive. Returns a function that stops the schedule.
 */
export function startScrapeSchedule(): () => void {
  if (process.env.SKIP_SCRAPE === "1") return () => {}

  const raw = process.env.SCRAPE_INTERVAL_HOURS
  const hours = raw === undefined ? DEFAULT_INTERVAL_HOURS : Number(raw)
  if (!Number.isFinite(hours) || hours <= 0) {
    console.warn(
      `[scrape] invalid SCRAPE_INTERVAL_HOURS="${raw}", using ${DEFAULT_INTERVAL_HOURS}`
    )
    return startTimer(DEFAULT_INTERVAL_HOURS)
  }
  return startTimer(hours)
}

function startTimer(hours: number): () => void {
  const timer = setInterval(
    () => void runScrape("scheduled"),
    hours * 3_600_000
  )
  timer.unref()
  console.info(`[scrape] rescraping every ${hours} h`)
  return () => clearInterval(timer)
}
