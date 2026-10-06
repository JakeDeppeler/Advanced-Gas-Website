import "server-only";
import { createHash } from "node:crypto";
import { q, sbSelect, sbUpdate, sbUpdateReturning } from "@/lib/dashboard/db";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { site } from "@/lib/site";

/**
 * Emailing the office when a journal entry doesn't reach Xero.
 *
 * Once per error: each entry carries the key of the error it was last emailed
 * about — its ServiceTitan version and a hash of the message — and an entry is
 * emailed again only when that changes. Every new error from one sync goes in
 * one email, not one each.
 *
 * The sync runs from two places (the scheduled job and the wall board's
 * refresh), so an entry is claimed before it is sent: the update only takes if
 * the key is still the old one, and only the run that gets the row back sends
 * it. If the send fails the claim is undone, and the next run tries again.
 */

const SETTING = "journal-alerts";
/** Who gets the emails until somebody changes the list. */
export const DEFAULT_RECIPIENTS = ["jake@advancedgas.com.au"];

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
export const isEmail = (s: string) => EMAIL.test(s.trim());

export async function alertRecipients(): Promise<string[]> {
  const saved = await getSettings<{ emails?: string[] }>(SETTING).catch(() => null);
  return Array.isArray(saved?.emails) ? saved.emails.filter(isEmail) : DEFAULT_RECIPIENTS;
}

export async function saveAlertRecipients(emails: string[]): Promise<{ ok: boolean; error?: string }> {
  const clean = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(isEmail))];
  return saveSettings(SETTING, { emails: clean });
}

type ErrRow = {
  id: string; number: number | null; name: string | null; message: string | null; post_date: string | null;
  url: string | null; version_id: number | null; alerted_key: string | null; alerted_at: string | null;
};

const keyOf = (r: Pick<ErrRow, "version_id" | "message">) =>
  `${r.version_id ?? 0}-${createHash("sha1").update(r.message ?? "").digest("hex").slice(0, 12)}`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const day = (iso: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "no post date";

export type AlertResult = { sent: number; to: number; error?: string };

export async function sendJournalAlerts(): Promise<AlertResult> {
  const errors = await sbSelect<ErrRow>(
    "st_journal_entries",
    [q.select("id,number,name,message,post_date,url,version_id,alerted_key,alerted_at"), "sync_status=eq.Error", "is_empty=eq.false", "limit=200"].join("&"),
  );
  const fresh = errors.filter((r) => r.alerted_key !== keyOf(r));
  if (!fresh.length) return { sent: 0, to: 0 };

  const to = await alertRecipients();
  const key = process.env.RESEND_API_KEY;
  // Nobody to tell, or no way to tell them: leave the errors unclaimed, so
  // they go out the first run that can send them.
  if (!to.length) return { sent: 0, to: 0, error: "No one is on the journal alert list" };
  if (!key) return { sent: 0, to: to.length, error: "RESEND_API_KEY missing" };

  const claimed: Array<ErrRow & { prev: Pick<ErrRow, "alerted_key" | "alerted_at"> }> = [];
  const at = new Date().toISOString();
  for (const r of fresh) {
    const k = keyOf(r);
    const was = r.alerted_key == null ? "alerted_key.is.null" : `alerted_key.eq.${r.alerted_key}`;
    const got = await sbUpdateReturning<ErrRow>("st_journal_entries", [q.eq("id", r.id), `or=(${was})`].join("&"), { alerted_key: k, alerted_at: at });
    if (got.length) claimed.push({ ...r, prev: { alerted_key: r.alerted_key, alerted_at: r.alerted_at } });
  }
  if (!claimed.length) return { sent: 0, to: to.length };

  const base = (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, "");
  const page = `${base}/portal/journals`;
  const n = claimed.length;
  const subject = n > 1
    ? `${n} journal entries didn't sync to Xero`
    : claimed[0].number != null ? `Journal entry #${claimed[0].number} didn't sync to Xero` : "A journal entry didn't sync to Xero";

  const rows = claimed.map((r) => `
    <tr>
      <td style="padding:12px 0;border-top:1px solid #e6e2d8;vertical-align:top;">
        <div style="font-weight:700;color:#050a30;">#${r.number ?? "—"} · ${esc(r.name ?? "Journal entry")}</div>
        <div style="font-size:13px;color:#6b6a68;margin-top:2px;">Posted ${esc(day(r.post_date))}</div>
        <div style="font-size:14px;color:#b3261e;margin-top:6px;">${esc(r.message ?? "ServiceTitan gave no reason.")}</div>
        ${r.url ? `<a href="${esc(r.url)}" style="display:inline-block;margin-top:8px;font-size:13px;font-weight:700;color:#c2521a;text-decoration:none;">Open in ServiceTitan →</a>` : ""}
      </td>
    </tr>`).join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f8;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:28px 20px;">
      <div style="background:#fff;border-radius:16px;padding:24px 26px;">
        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#c2521a;font-weight:700;">Advanced Gas &amp; Aircon · Xero sync</div>
        <h1 style="font-size:20px;margin:8px 0 6px;color:#050a30;">${esc(subject)}</h1>
        <p style="font-size:14px;line-height:1.5;color:#4b4a46;margin:0 0 8px;">ServiceTitan tried to post ${n === 1 ? "this journal entry" : "these journal entries"} to Xero and couldn't. Fix the cause in ServiceTitan and sync again; the portal clears it once ServiceTitan says it's through.</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px;">${rows}</table>
        <a href="${esc(page)}" style="display:inline-block;margin-top:18px;background:#c2521a;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 18px;border-radius:10px;">See every journal entry →</a>
        <p style="font-size:12px;color:#8b8a86;margin:18px 0 0;">You get this because you're on the journal alert list in the team portal. Change the list on the journal entries page.</p>
      </div>
    </div>
  </body></html>`;
  const text = [
    subject, "",
    ...claimed.map((r) => `#${r.number ?? "—"} ${r.name ?? "Journal entry"} (posted ${day(r.post_date)}): ${r.message ?? "no reason given"}${r.url ? `\n  ${r.url}` : ""}`),
    "", `Every journal entry: ${page}`,
  ].join("\n");

  const from = process.env.RESEND_FROM_EMAIL || "Advanced Gas Portal <onboarding@resend.dev>";
  let error: string | undefined;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    if (!res.ok) error = `Resend ${res.status}`;
  } catch (e) {
    error = e instanceof Error ? e.message : "send failed";
  }

  if (error) {
    // Undo the claims, so the next run sends them.
    for (const r of claimed) {
      await sbUpdate("st_journal_entries", q.eq("id", r.id), r.prev).catch(() => undefined);
    }
    return { sent: 0, to: to.length, error };
  }
  return { sent: n, to: to.length };
}
