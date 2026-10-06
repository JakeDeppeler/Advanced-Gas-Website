/**
 * The board's reports: a day, a week, a month, each kept in the portal and
 * emailed. Shared by the pages and the email, so it carries no server code.
 */

export type ReportKind = "daily" | "weekly" | "monthly";

export const KIND_LABEL: Record<ReportKind, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

/** One figure: the words, the number, and the line under it. Tone backs up the words, never replaces them. */
export type ReportLine = {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "bad" | null;
  /**
   * For a pace row: how far through the period's need the figure is (0–1, may
   * pass 1), and where the goal says it should be by now. For a ranking: the
   * share of the leader.
   */
  bar?: number | null;
  mark?: number | null;
  /** The standing in words — "Behind by 2", "On pace" — for the pill beside a pace bar. */
  status?: string;
};

/**
 * How a section is laid out, after the wall board's pages:
 *   hero   — the two big tiles, the first in navy
 *   tiles  — small figures, two to a row
 *   pace   — a bar each, against where the goal says we should be
 *   rank   — a leaderboard, bars scaled to the leader
 *   alerts — what needs someone, each with its severity in words
 *   list   — label and figure down the page
 * Reports kept before layouts existed have none, and read as a list.
 */
export type ReportLayout = "hero" | "tiles" | "pace" | "rank" | "alerts" | "list";

export type ReportSection = { title: string; lines: ReportLine[]; layout?: ReportLayout; note?: string };

export type Report = {
  kind: ReportKind;
  /** report:<kind>:<period> — the portal_settings key it lives under. */
  key: string;
  title: string;
  periodLabel: string;
  from: string;
  to: string;
  /** When the report was put together, and when the board's figures in it were taken. */
  createdAt: string;
  figuresAt: string | null;
  headline: string;
  sections: ReportSection[];
  status: "building" | "sent" | "failed" | "kept";
  sentTo: string[];
  sentAt: string | null;
  error: string | null;
  /** How many times it has been sent or tried. A failed send is tried again, up to three. */
  tries?: number;
};
