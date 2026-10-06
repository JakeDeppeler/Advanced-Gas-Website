import "server-only";
import { q, sbInsertIfAbsent, sbSelect } from "@/lib/dashboard/db";
import { getSettings, listUsers, saveSettings } from "@/lib/portal/db";
import type { Report } from "@/lib/reports/types";

/**
 * Where the reports live, and who they go to.
 *
 * Each report is one document under its own key in portal_settings —
 * report:daily:2026-10-06, report:weekly:2026-10-05, report:monthly:2026-10 —
 * written once, read whole, a few kilobytes each. That is a key and a value,
 * which is what the table already is, so the reports need no table of their
 * own. The key is also the claim: a report is created with an insert that
 * does nothing if the key exists, so two runs racing for the same day can't
 * both send it.
 */

export const reportKey = (kind: string, period: string) => `report:${kind}:${period}`;

/** Make the report's row if nobody has. True when this call made it. */
export async function claimReport(report: Report): Promise<boolean> {
  return sbInsertIfAbsent("portal_settings", { key: report.key, value: report, updated_at: new Date().toISOString() }, "key");
}

export async function saveReport(report: Report): Promise<void> {
  const res = await saveSettings(report.key, report);
  if (!res.ok) throw new Error(`couldn't save ${report.key}`);
}

export async function getReport(key: string): Promise<Report | null> {
  if (!/^report:(daily|weekly|monthly):[0-9-]+$/.test(key)) return null;
  return getSettings<Report>(key);
}

export async function listReports(limit = 120): Promise<Report[]> {
  const rows = await sbSelect<{ key: string; value: Report }>(
    "portal_settings",
    [q.select("key,value"), "key=like.report:*", "order=updated_at.desc", `limit=${limit}`].join("&"),
  );
  return rows.map((r) => r.value).filter((r) => r && r.key);
}

/* ------------------------------------------------------------ who gets them */

const RECIPIENTS = "report-recipients";
const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
export const isEmail = (s: string) => EMAIL.test(s.trim());

/**
 * The list on the Reports page. Until somebody changes it: Jake, and whoever
 * in the portal's team list is called Dean or Kellie, at the address they
 * sign in with — so the first reports go to the three people asked for, and
 * the page shows exactly which addresses that came to.
 */
export async function reportRecipients(): Promise<string[]> {
  const saved = await getSettings<{ emails?: string[] }>(RECIPIENTS).catch(() => null);
  if (Array.isArray(saved?.emails)) return saved.emails.filter(isEmail);
  const people = await listUsers().catch(() => []);
  const named = people
    .filter((p) => p.active && /^(dean|kellie)\b/i.test(p.name.trim()))
    .map((p) => (p.email ?? "").trim().toLowerCase())
    .filter(isEmail);
  return [...new Set(["jake@advancedgas.com.au", ...named])];
}

export async function saveReportRecipients(emails: string[]): Promise<{ ok: boolean }> {
  const clean = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(isEmail))];
  return saveSettings(RECIPIENTS, { emails: clean });
}
