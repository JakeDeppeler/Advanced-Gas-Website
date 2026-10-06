/**
 * What the footer's light says about one upstream feed.
 *
 * Its own module so the rules that compute it (xeroFreshness.ts) need nothing
 * from metrics.ts, whose import graph reaches the database and, through the
 * journals reader, React.
 */
export type SourceState = "ok" | "stale" | "error" | "not-configured";
