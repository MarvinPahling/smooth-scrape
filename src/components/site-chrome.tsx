import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Sticky white top bar, like the academia site's `header.top`. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-[1160px] flex-wrap items-center gap-4 px-5 py-2">
        <a href="/" className="flex items-center gap-3 no-underline">
          <MatMark className="size-11" />
          <span className="flex flex-col gap-0.5">
            <span className="font-heading text-2xl leading-none font-extrabold tracking-[0.06em] uppercase">
              Mat Calendar
            </span>
            <small className="font-heading text-[0.68rem] leading-none font-semibold tracking-[0.34em] text-primary-deep uppercase">
              BJJ · Germany
            </small>
          </span>
        </a>
        <nav className="ml-auto flex items-center gap-4 font-heading text-[0.98rem] font-semibold tracking-[0.09em] uppercase">
          <a
            href="#calendar"
            className="hidden text-muted-foreground no-underline hover:text-foreground sm:inline"
          >
            Calendar
          </a>
          <Button
            size="sm"
            variant="outline"
            className="px-3.5"
            nativeButton={false}
            render={
              <a
                href="https://smoothcomp.com/en/events/upcoming"
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            Smoothcomp <ExternalLink />
          </Button>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-muted-foreground">
        <span>
          Data scraped from{" "}
          <a href="https://smoothcomp.com" className="text-foreground">
            smoothcomp.com
          </a>
          . Refresh with <code className="font-mono">bun run scrape</code>.
        </span>
        <span>Demo · Crawlee · Drizzle · TanStack · shadcn/ui</span>
      </div>
    </footer>
  )
}

/** A mat circle: red ring on a white square, the academia's one accent. */
function MatMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="var(--foreground)" />
      <circle
        cx="24"
        cy="24"
        r="13"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="5"
      />
      <circle cx="24" cy="24" r="3.5" fill="#fff" />
    </svg>
  )
}
