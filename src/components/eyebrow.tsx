/** Small red kicker above a heading. Sentence case: let the H1/H2 shout. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm leading-none font-semibold text-primary-deep">
      {children}
    </span>
  )
}
