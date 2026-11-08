import "server-only";
import { dashboardDbConfigured, q, sbInsertIfAbsent, sbSelect, sbUpdate, sbUpdateReturning } from "@/lib/dashboard/db";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { tagWords } from "@/lib/outlook/bookingTypes";
import { emailContext } from "@/lib/email/context";
import { fromBox } from "@/lib/email/from";
import { withInlineImages } from "@/lib/email/inline";
import { letterHtml, letterText } from "@/lib/email/premium";
import { sendEmail } from "@/lib/email/send";
import { resolveSigner } from "@/lib/email/templates/signer";
import { loadTemplates, type StoredTemplate } from "@/lib/email/templates/store";
import type { QuoteKind } from "@/lib/email/templates/types";
import { logTouch } from "@/lib/pipeline/store";
import { noteFollowUp } from "@/lib/pipeline/stLost";
import { site } from "@/lib/site";
import { answerUrl } from "./answers";
import { followUpEmail, quoteKind } from "./followUpContent";
import { emailProblem, householdUnit, inSendingHours, PER_RUN, planFor, SENT_TAG_WORDS, stopReason, type Plan, type Sent, type Step } from "./followUpRules";

/**
 * Sends the quote follow-up emails (rules in followUpRules.ts, words on
 * Marketing › Customer emails). Run every ten minutes with the review
 * emails; does nothing while switched off or outside 9am–7pm Mon–Sat.
 *
 * Each email is claimed in portal_quote_followup_sends before it goes, so
 * two runs can't both send it. Each one sent is noted on the job in
 * ServiceTitan and on the Pipeline (as a note, so it doesn't count as one of
 * the office's three calls).
 */

const TABLE = "portal_quote_followups";
const SENDS = "portal_quote_followup_sends";
const SETTINGS = "quote_followups";
const REPLY_TO = "admin@advancedgas.com.au";
/** Who the Pipeline and ServiceTitan notes say did it. */
const BY = "the portal";

export type FollowUpSettings = { on: boolean; since: string | null; by: string | null };

export async function loadFollowUpSettings(): Promise<FollowUpSettings> {
  const s = await getSettings<Partial<FollowUpSettings>>(SETTINGS).catch(() => null);
  return { on: s?.on === true, since: typeof s?.since === "string" ? s.since : null, by: typeof s?.by === "string" ? s.by : null };
}

type Job = { id: number; job_number: string | null; status: string | null; business_unit: string | null; customer_id: number | null; customer_name: string | null; suburb: string | null; tags: unknown };
type FRow = { quote_key: string; job_id: number | null; customer_id: number | null; estimate_id: number | null; email: string | null; kind: string | null; status: string; reason: string | null; started_at: string; last_sent_at: string | null; updated_at?: string };
type SRow = { quote_key: string; template_key: string; day: number | null; status: Sent["status"]; attempts: number; subject: string | null; sent_at: string | null; created_at: string };
type Est = { id: number; job_id: number; status: string | null; name: string | null; created_by: string | null; active: string | null };

const JOB_COLS = "id,job_number,status,business_unit,customer_id,customer_name,suburb,tags:raw->tagTypeIds";
const chunks = <T,>(xs: T[], n = 150) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const many = async <T,>(table: string, cols: string, col: string, xs: (number | string)[], extra: string[] = []) =>
  xs.length ? (await Promise.all(chunks([...new Set(xs)]).map((c) => sbSelect<T>(table, [q.select(cols), `${col}=in.(${c.map((x) => (typeof x === "string" ? `"${x}"` : x)).join(",")})`, ...extra].join("&"))))).flat() : [];
const tagList = (v: unknown): number[] => (Array.isArray(v) ? v.map(Number).filter(Number.isFinite) : []);
const first = (name: string | null | undefined) => (name ?? "").trim().split(/[\s,&]+/)[0] || "";

async function sentTagId(): Promise<number | null> {
  const tags = await sbSelect<{ id: number; name: string | null; active: boolean | null }>("st_job_tags", "select=id,name,active");
  return tags.find((t) => t.active !== false && tagWords(t.name ?? "") === SENT_TAG_WORDS)?.id ?? null;
}

/** Household jobs tagged Awaiting Quote Approval now. */
async function taggedJobs(tagId: number): Promise<Job[]> {
  const rows = await sbSelect<Job>("st_jobs", [q.select(JOB_COLS), `raw->tagTypeIds=cs.[${tagId}]`, "status=neq.Canceled", "limit=2000"].join("&"));
  return rows.filter((j) => householdUnit(j.business_unit));
}

/* ---------------------------------------------------------------- the switch */

/**
 * On: from now. Every quote already tagged is written down as already out
 * and left alone, so only quotes sent from here on get the emails. Off: the
 * ones in progress wait; switched on again, each picks up at the email due
 * that day, passing over any it missed.
 */
export async function setFollowUps(on: boolean, by: string): Promise<{ ok: boolean; error?: string; leftAlone?: number }> {
  if (!dashboardDbConfigured()) return { ok: false, error: "The database isn't connected." };
  let leftAlone = 0;
  if (on) {
    const tagId = await sentTagId().catch(() => null);
    if (!tagId) return { ok: false, error: "There's no “Awaiting Quote Approval” tag in ServiceTitan to go by." };
    const [jobs, rows] = await Promise.all([taggedJobs(tagId), sbSelect<{ quote_key: string }>(TABLE, "select=quote_key&limit=10000")]);
    const have = new Set(rows.map((r) => r.quote_key));
    for (const j of jobs) {
      if (have.has(`j${j.id}`)) continue;
      const made = await sbInsertIfAbsent(TABLE, { quote_key: `j${j.id}`, job_id: j.id, customer_id: j.customer_id, status: "before", reason: "Already out when the follow-ups were switched on" }, "quote_key").catch(() => false);
      if (made) leftAlone++;
    }
  }
  const saved = await saveSettings(SETTINGS, { on, since: on ? new Date().toISOString() : (await loadFollowUpSettings()).since, by });
  return saved.ok ? { ok: true, leftAlone } : { ok: false, error: "Couldn't save the switch." };
}

/* ------------------------------------------------------------------ the run */

export type PlanLine = { key: string; jobNumber: string | null; customer: string | null; suburb: string | null; email: string | null; kind: QuoteKind | null; started: string; stop: string | null; plan: Plan | null };
export type FollowUpRun = { on: boolean; skipped?: string; started: number; sent: number; failed: number; stopped: number; done: number; lines?: PlanLine[] };

export async function runFollowUps(now = new Date(), opts: { dry?: boolean } = {}): Promise<FollowUpRun> {
  const dry = !!opts.dry;
  const out: FollowUpRun = { on: false, started: 0, sent: 0, failed: 0, stopped: 0, done: 0, lines: dry ? [] : undefined };
  const s = await loadFollowUpSettings();
  out.on = s.on;
  if (!s.on && !dry) return { ...out, skipped: "switched off" };
  const tagId = await sentTagId();
  if (!tagId) return { ...out, skipped: "no Awaiting Quote Approval tag in ServiceTitan" };

  const [tagged, rows] = await Promise.all([taggedJobs(tagId), sbSelect<FRow>(TABLE, "select=*&limit=10000")]);
  const byKey = new Map(rows.map((r) => [r.quote_key, r]));
  const iso = now.toISOString();

  // Newly tagged: their days start now. Not while off, and not in a dry run.
  const fresh = tagged.filter((j) => !byKey.has(`j${j.id}`));
  const active: FRow[] = rows.filter((r) => r.status === "active");
  for (const j of fresh) {
    const row: FRow = { quote_key: `j${j.id}`, job_id: j.id, customer_id: j.customer_id, estimate_id: null, email: null, kind: null, status: "active", reason: null, started_at: iso, last_sent_at: null };
    if (s.on && !dry) {
      const made = await sbInsertIfAbsent(TABLE, row, "quote_key").catch(() => false);
      if (!made) continue;
      out.started++;
    }
    active.push(row);
  }
  if (!active.length) return out;

  const jobIds = active.map((r) => Number(r.job_id)).filter((n) => n > 0);
  const keys = active.map((r) => r.quote_key);
  const since = active.map((r) => r.started_at).sort()[0];
  const taggedIds = new Set(tagged.map((j) => j.id));
  const [jobs, ests, sends, answers, follows, touches, templates] = await Promise.all([
    many<Job>("st_jobs", JOB_COLS, "id", jobIds),
    many<Est>("st_estimates", "id,job_id,status,name:raw->>name,created_by,active:raw->>active", "job_id", jobIds),
    many<SRow>(SENDS, "quote_key,template_key,day,status,attempts,subject,sent_at,created_at", "quote_key", keys),
    many<{ estimate_id: number; answer: "yes" | "question" | "no"; created_at: string }>("portal_quote_answers", "estimate_id,answer,created_at", "job_id", jobIds),
    many<{ quote_key: string; lost_at: string | null }>("portal_quote_follow", "quote_key,lost_at", "quote_key", keys),
    many<{ quote_key: string; how: string; created_by: string | null; created_at: string }>("portal_quote_touches", "quote_key,how,created_by,created_at", "quote_key", keys, [q.gte("created_at", since)]),
    loadTemplates().then((t) => t.templates),
  ]);
  const jobById = new Map(jobs.map((j) => [Number(j.id), j]));
  const estsBy = new Map<number, Est[]>();
  for (const e of ests) if (e.active !== "false") estsBy.set(Number(e.job_id), [...(estsBy.get(Number(e.job_id)) ?? []), e]);
  const custIds = [...new Set(jobs.map((j) => j.customer_id).filter((c): c is number => !!c))];
  const contacts = await many<{ customer_id: number; value: string; modified_on: string | null }>("st_customer_contacts", "customer_id,value,modified_on", "customer_id", custIds, [q.eq("type", "Email"), "active=not.is.false"]);
  const emailOf = new Map<number, string>();
  for (const c of [...contacts].sort((a, b) => (b.modified_on ?? "").localeCompare(a.modified_on ?? ""))) {
    const e = c.value?.trim().toLowerCase();
    if (e && !emailProblem(e) && !emailOf.has(Number(c.customer_id))) emailOf.set(Number(c.customer_id), e);
  }
  const emails = [...new Set(emailOf.values())];
  // Every email in since the oldest started, matched here without regard to case: addresses arrive as people type them.
  const wanted = new Set(emails);
  const inbound = emails.length
    ? (await sbSelect<{ from_address: string | null; received_at: string }>("mail_drafts", [q.select("from_address,received_at"), q.gte("received_at", since), "limit=10000"].join("&")).catch(() => []))
      .filter((m) => wanted.has((m.from_address ?? "").trim().toLowerCase()))
    : [];
  const series = (kind: QuoteKind): (StoredTemplate & { day: number })[] =>
    templates.filter((t): t is StoredTemplate & { day: number } => t.series === kind && t.active && t.day != null).sort((a, b) => a.day - b.day);

  const ctx = emailContext();
  const sending = inSendingHours(now);

  for (const r of active) {
    const job = jobById.get(Number(r.job_id));
    const opts = estsBy.get(Number(r.job_id)) ?? [];
    const open = opts.filter((e) => e.status === "Open").sort((a, b) => a.id - b.id);
    const email = job?.customer_id ? emailOf.get(Number(job.customer_id)) ?? null : null;
    const anyEmail = job?.customer_id ? contacts.find((c) => Number(c.customer_id) === Number(job.customer_id))?.value ?? null : null;
    const kind = open.length ? quoteKind(open.map((e) => e.name ?? "")) : null;
    const answer = answers.filter((a) => opts.some((e) => e.id === Number(a.estimate_id))).sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
    const stop = !job ? "The job couldn't be found" : stopReason({
      options: opts,
      jobCancelled: job.status === "Canceled",
      tagged: taggedIds.has(Number(job.id)) || tagList(job.tags).includes(tagId),
      lostOnPipeline: follows.some((f) => f.quote_key === r.quote_key && !!f.lost_at),
      answered: answer?.answer ?? null,
      emailedUs: !!email && inbound.some((m) => (m.from_address ?? "").trim().toLowerCase() === email && m.received_at >= r.started_at),
      officeTouched: touches.some((t) => t.quote_key === r.quote_key && ["call", "visit", "email"].includes(t.how) && t.created_by !== BY && t.created_by !== "the customer" && t.created_at >= r.started_at),
    }) ?? (email ? null : emailProblem(anyEmail));

    const mine: Sent[] = sends.filter((x) => x.quote_key === r.quote_key).map((x) => ({ key: x.template_key, status: x.status, at: x.sent_at ?? x.created_at, attempts: x.attempts }));
    const steps: Step[] = kind ? series(kind).map((t) => ({ key: t.key, day: t.day })) : [];
    const plan = stop ? null : planFor(steps, r.started_at, now, mine);
    out.lines?.push({ key: r.quote_key, jobNumber: job?.job_number ?? null, customer: job?.customer_name ?? null, suburb: job?.suburb ?? null, email, kind, started: r.started_at, stop, plan });
    if (dry) continue;

    if (stop) {
      await sbUpdate(TABLE, q.eq("quote_key", r.quote_key), { status: "stopped", reason: stop, updated_at: iso }).catch(() => undefined);
      out.stopped++;
      continue;
    }
    if (!plan) continue;
    if (plan.done) {
      await sbUpdate(TABLE, q.eq("quote_key", r.quote_key), { status: "done", reason: "Every email in the series has gone", updated_at: iso }).catch(() => undefined);
      out.done++;
      continue;
    }
    if (!plan.send || !sending || out.sent + out.failed >= PER_RUN || !email || !kind || !open.length) continue;

    // Passed over: the ones that came due while nothing was sending.
    for (const sk of plan.skip) await sbInsertIfAbsent(SENDS, { quote_key: r.quote_key, template_key: sk.key, day: sk.day, status: "skipped", email }, "quote_key,template_key").catch(() => false);

    // Claimed before it goes: a fresh row, or a failed one taken back for another try.
    const prior = mine.find((m) => m.key === plan.send!.key);
    const claimed = prior
      ? (await sbUpdateReturning(SENDS, [q.eq("quote_key", r.quote_key), q.eq("template_key", plan.send.key), "status=eq.failed", "attempts=lt.3"].join("&"), { status: "sending", attempts: (prior.attempts ?? 1) + 1, error: null }).catch(() => [])).length > 0
      : await sbInsertIfAbsent(SENDS, { quote_key: r.quote_key, template_key: plan.send.key, day: plan.send.day, status: "sending", email }, "quote_key,template_key").catch(() => false);
    if (!claimed) continue;

    const t = series(kind).find((x) => x.key === plan.send!.key)!;
    const quoterFull = open[0].created_by?.trim() || null;
    const signer = resolveSigner(t.signer, quoterFull);
    const quoterSigns = !!quoterFull && signer.name.toLowerCase() === quoterFull.toLowerCase();
    const est = open[0].id;
    const e = followUpEmail(kind, 0, {
      first: first(job!.customer_name) || "there",
      quoter: first(quoterFull),
      quoterSigns,
      options: open.map((o) => o.name ?? ""),
      phone: site.phone,
      answers: { yes: answerUrl(est, "yes"), question: answerUrl(est, "question"), no: answerUrl(est, "no") },
    }, t, ctx.base);
    const mail = { base: ctx.base, footer: ctx.footer, preheader: e.preheader, blocks: e.blocks, signer };
    const person = signer.photo !== null || signer.name !== resolveSigner("team", null).name;
    const res = await sendEmail("quote-followup", await withInlineImages({
      from: fromBox("quotes", person ? `${first(signer.name)} from ${site.shortName}` : site.name),
      to: [email],
      reply_to: REPLY_TO,
      subject: e.subject,
      html: letterHtml(mail),
      text: letterText(mail),
    }), { quote: r.quote_key, template: t.key, day: t.day, job: job!.job_number });

    const at = new Date().toISOString();
    if (!res.ok) {
      out.failed++;
      await sbUpdate(SENDS, [q.eq("quote_key", r.quote_key), q.eq("template_key", t.key)].join("&"), { status: "failed", error: res.error.slice(0, 300) }).catch(() => undefined);
      continue;
    }
    out.sent++;
    await sbUpdate(SENDS, [q.eq("quote_key", r.quote_key), q.eq("template_key", t.key)].join("&"), { status: "sent", sent_at: at, subject: e.subject, provider_id: res.id, error: null }).catch(() => undefined);
    await sbUpdate(TABLE, q.eq("quote_key", r.quote_key), { last_sent_at: at, email, kind, estimate_id: est, updated_at: at }).catch(() => undefined);
    const n = series(kind).findIndex((x) => x.key === t.key) + 1;
    const line = `Follow-up email ${n} of ${series(kind).length} sent to ${email}: “${e.subject}”`;
    await logTouch(r.quote_key, "note", line, BY).catch(() => undefined);
    await noteFollowUp(r.quote_key, `${line}. Sent by the portal.`).catch(() => undefined);
  }
  return out;
}

/* ---------------------------------------------------------------- the board */

export type BoardLine = {
  key: string; jobId: number | null; jobNumber: string | null; customer: string | null; suburb: string | null; email: string | null;
  status: string; reason: string | null; started: string; sent: { subject: string | null; at: string | null; status: string; day: number | null }[];
  next: { name: string; day: number; on: string } | null; total: number;
};

/** What the Customer emails page shows: in progress, and finished or stopped in the last 30 days. */
export async function followUpBoard(now = new Date()): Promise<{ settings: FollowUpSettings; lines: BoardLine[]; leftAlone: number; ok: boolean }> {
  const settings = await loadFollowUpSettings();
  if (!dashboardDbConfigured()) return { settings, lines: [], leftAlone: 0, ok: false };
  try {
    const cut = new Date(now.getTime() - 30 * 86_400_000).toISOString();
    const rows = await sbSelect<FRow>(TABLE, ["select=*", `or=(status.eq.active,updated_at.gte.${cut})`, "status=neq.before", "order=started_at.desc", "limit=200"].join("&"));
    const leftAlone = (await sbSelect<{ quote_key: string }>(TABLE, "select=quote_key&status=eq.before&limit=5000")).length;
    const jobIds = rows.map((r) => Number(r.job_id)).filter((n) => n > 0);
    const [jobs, sends, ests, { templates }] = await Promise.all([
      many<Job>("st_jobs", JOB_COLS, "id", jobIds),
      many<SRow>(SENDS, "quote_key,template_key,day,status,attempts,subject,sent_at,created_at", "quote_key", rows.map((r) => r.quote_key)),
      many<Est>("st_estimates", "id,job_id,status,name:raw->>name,created_by,active:raw->>active", "job_id", jobIds),
      loadTemplates(),
    ]);
    const jobById = new Map(jobs.map((j) => [Number(j.id), j]));
    const lines = rows.map((r): BoardLine => {
      const job = jobById.get(Number(r.job_id));
      const open = ests.filter((e) => Number(e.job_id) === Number(r.job_id) && e.status === "Open" && e.active !== "false");
      const kind = (r.kind as QuoteKind | null) ?? (open.length ? quoteKind(open.map((e) => e.name ?? "")) : null);
      const steps = kind ? templates.filter((t) => t.series === kind && t.active && t.day != null).sort((a, b) => (a.day ?? 0) - (b.day ?? 0)) : [];
      const mine = sends.filter((x) => x.quote_key === r.quote_key).sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
      const settled = new Set(mine.filter((m) => m.status !== "failed").map((m) => m.template_key));
      const nextT = r.status === "active" ? steps.find((t) => !settled.has(t.key)) : undefined;
      const on = nextT ? new Date(Date.parse(r.started_at) + (nextT.day ?? 0) * 86_400_000).toISOString() : null;
      return {
        key: r.quote_key, jobId: r.job_id, jobNumber: job?.job_number ?? null, customer: job?.customer_name ?? null, suburb: job?.suburb ?? null, email: r.email,
        status: r.status, reason: r.reason, started: r.started_at,
        sent: mine.filter((m) => m.status !== "skipped").map((m) => ({ subject: m.subject, at: m.sent_at, status: m.status, day: m.day })),
        next: nextT && on ? { name: nextT.name, day: nextT.day ?? 0, on } : null, total: steps.length,
      };
    });
    return { settings, lines, leftAlone, ok: true };
  } catch {
    return { settings, lines: [], leftAlone: 0, ok: false };
  }
}

/** How many household quotes are tagged Awaiting Quote Approval right now: what switching on would leave alone. */
export async function awaitingNow(): Promise<number | null> {
  if (!dashboardDbConfigured()) return null;
  const tagId = await sentTagId().catch(() => null);
  return tagId ? (await taggedJobs(tagId).catch(() => [])).length : null;
}
