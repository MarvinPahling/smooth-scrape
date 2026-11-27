/** Sticky white top bar, like the academia site's `header.top`. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-[1160px] flex-wrap items-center gap-4 px-5 py-2">
        <a href="/" className="flex items-center gap-3 no-underline">
          <MatMark className="size-10" />
          <span className="flex flex-col gap-0.5">
            <span className="font-heading text-2xl leading-none font-extrabold tracking-[0.06em] uppercase">
              Mat Calendar
            </span>
            <small className="font-heading text-[0.68rem] leading-none font-semibold tracking-[0.22em] text-primary-deep uppercase">
              BJJ · Germany
            </small>
          </span>
        </a>
        <nav className="ml-auto flex items-center gap-5 text-[0.95rem] font-medium">
          <a
            href="#calendar"
            className="text-muted-foreground no-underline hover:text-foreground"
          >
            Calendar
          </a>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-6 text-sm text-muted-foreground">
        <span>
          Data from{" "}
          <a
            href="https://smoothcomp.com/en/events/upcoming"
            className="text-foreground underline-offset-4 hover:underline"
          >
            smoothcomp.com
          </a>
          ,{" "}
          <a
            href="https://ibjjf.com/events/championships"
            className="text-foreground underline-offset-4 hover:underline"
          >
            ibjjf.com
          </a>
          , and{" "}
          <a
            href="https://ajptour.com/en/federation/1"
            className="text-foreground underline-offset-4 hover:underline"
          >
            ajptour.com
          </a>
          . Check the organizer&apos;s page before you travel.
        </span>
        <span>Mat Calendar</span>
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
