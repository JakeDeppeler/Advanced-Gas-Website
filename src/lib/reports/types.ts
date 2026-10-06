/**
 * The board's reports: a day, a week, a month, each kept in the portal and
 * emailed. Shared by the pages and the email, so it carries no server code.
 */

export type ReportKind = "daily" | "weekly" | "monthly";

export const KIND_LABEL: Record<ReportKind, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

/** One figure: the words, the number, and the line under it. Tone backs up the words, never replaces them. */
export type ReportLine = { label: string; value: string; sub?: string; tone?: "good" | "bad" | null };
export type ReportSection = { title: string; lines: ReportLine[] };

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
