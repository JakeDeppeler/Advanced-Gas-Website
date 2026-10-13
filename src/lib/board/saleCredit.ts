/**
 * Moving a sold job's credit from one person to another, for the portal.
 *
 * The board credits a job to whoever wrote the quote (`creditFor` in
 * metrics.ts). One person prices a job and another goes back and closes it
 * often enough that the office needs to be able to say so, and ServiceTitan has
 * nowhere to record that decision — anything written into the estimate would be
 * overwritten by the next sync. So the move is kept in `portal_settings` and
 * applied on the way out; the rules are in `saleCreditTypes.ts`.
 *
 * A move takes the whole job: see the note there on why the sale cannot be
 * moved without the quote.
 */

import { getSettings, saveSettings } from "@/lib/portal/db";
import { q, sbSelect } from "@/lib/dashboard/db";
import { quoteKey } from "@/lib/dashboard/metrics";
import {
  IMPORT_USER,
  SALE_CREDIT_KEY,
  creditWith,
  normaliseSaleCredits,
  type CreditMove,
  type CreditTotal,
  type SaleCredits,
  type SoldJob,
} from "@/lib/dashboard/saleCreditTypes";

/*
 * Re-exported so the portal page and this module are imported from one place,
 * while the client component takes the pure half straight from
 * saleCreditTypes: this file reaches the database, and a client component that
 * imported it would pull `server-only` into the browser bundle and fail the
 * build. It did, once.
 */
export * from "@/lib/dashboard/saleCreditTypes";

type SaleRow = {
  id: number;
  job_id: number | null;
  customer_id: number | null;
  created_on: string | null;
  created_by: string | null;
  sold_by: string | null;
  total_inc: number | null;
  sold_on: string | null;
  first: boolean;
};

/**
 * What has sold, newest first, with who it is credited to.
 *
 * Sixty days by default rather than the month: a sale closed on the 30th gets
 * argued about on the 2nd, and a page that only reaches back to the 1st cannot
 * fix it. The whole history is 384 sales, which is a page rather than a
 * problem — but see `IMPORT_USER`: everything before September 2026 is under
 * the integration account and was never one person's.
 */
export async function readSoldJobs(
  days: number | null = 60,
): Promise<{ jobs: SoldJob[]; people: string[]; moves: number; totals: CreditTotal[] }> {
  const from = days == null ? null : new Date(Date.now() - days * 86_400_000).toISOString();

  const [savedRaw, sales] = await Promise.all([
    getSettings<unknown>(SALE_CREDIT_KEY).catch(() => null),
    sbSelect<SaleRow>(
      "st_sales",
      [
        q.select("id,job_id,customer_id,created_on,created_by,sold_by,total_inc,sold_on,first"),
        from ? q.gte("sold_on", from) : q.notNull("sold_on"),
        q.order("sold_on", "desc", "last"),
      ].join("&"),
    ).catch(() => []),
  ]);

  const moves = normaliseSaleCredits(savedRaw);
  const credit = creditWith(moves, quoteKey);

  /*
   * One row per job, not per sales entry.
   *
   * st_sales holds an entry per change, so a quote re-sold at a different price
   * has two rows; the value sums every entry and the identity is the job. This
   * is the same grouping the leaderboard uses, which is the point — a move made
   * here has to land on exactly what the leaderboard counts.
   */
  const byJob = new Map<string, SoldJob & { _ids: number[] }>();
  for (const r of sales) {
    const key = quoteKey(r);
    const got = byJob.get(key);
    if (got) {
      got.value += Number(r.total_inc ?? 0);
      continue;
    }
    byJob.set(key, {
      key,
      jobId: r.job_id == null ? null : Number(r.job_id),
      customerId: r.customer_id == null ? null : Number(r.customer_id),
      jobNumber: null,
      customer: null,
      suburb: null,
      value: Number(r.total_inc ?? 0),
      soldOn: r.sold_on,
      credited: credit(r),
      original: r.created_by ?? r.sold_by,
      soldBy: r.sold_by,
      move: moves[key] ?? null,
      _ids: [Number(r.id)],
    });
  }

  const jobIds = [...byJob.values()].map((j) => j.jobId).filter((v): v is number => v != null);
  if (jobIds.length) {
    const jobs = await sbSelect<{ id: number; job_number: string | null; customer_name: string | null; suburb: string | null }>(
      "st_jobs",
      [q.select("id,job_number,customer_name,suburb"), `id=in.(${jobIds.join(",")})`].join("&"),
    ).catch(() => []);
    const byId = new Map(jobs.map((j) => [Number(j.id), j]));
    for (const j of byJob.values()) {
      const got = j.jobId == null ? undefined : byId.get(j.jobId);
      j.jobNumber = got?.job_number ?? null;
      j.customer = got?.customer_name ?? null;
      j.suburb = got?.suburb ?? null;
    }
  }

  /*
   * The name on a sale that carries no job.
   *
   * ServiceTitan leaves job_id null on a share of estimates, and one of those
   * is the biggest sale in the last sixty days at $16,928. There is no
   * customers table in the replica, so the only names available are the ones on
   * that customer's jobs — and `st_jobs.customer_name` is the *site*, not the
   * account: customer 151304546 reads as both "Allan Williams" and "7 The
   * Beachway Chelsea". So every name that customer has is shown, rather than
   * whichever row came back first, which would put one address confidently
   * against a quote written for another.
   */
  const orphanCustomers = [...new Set(
    [...byJob.values()].filter((j) => j.jobId == null && j.customerId != null).map((j) => j.customerId as number),
  )];
  if (orphanCustomers.length) {
    const named = await sbSelect<{ customer_id: number | null; customer_name: string | null; suburb: string | null }>(
      "st_jobs",
      [q.select("customer_id,customer_name,suburb"), `customer_id=in.(${orphanCustomers.join(",")})`].join("&"),
    ).catch(() => []);
    const byCustomer = new Map<number, { names: Set<string>; suburbs: Set<string> }>();
    for (const r of named) {
      if (r.customer_id == null) continue;
      const got = byCustomer.get(Number(r.customer_id)) ?? { names: new Set<string>(), suburbs: new Set<string>() };
      if (r.customer_name) got.names.add(r.customer_name);
      if (r.suburb) got.suburbs.add(r.suburb);
      byCustomer.set(Number(r.customer_id), got);
    }
    const few = (s: Set<string>) => {
      const all = [...s];
      return all.length === 0 ? null : all.slice(0, 2).join(" / ") + (all.length > 2 ? ` +${all.length - 2}` : "");
    };
    for (const j of byJob.values()) {
      if (j.jobId != null || j.customerId == null) continue;
      const got = byCustomer.get(j.customerId);
      j.customer = got ? few(got.names) : null;
      j.suburb = got ? few(got.suburbs) : null;
    }
  }

  /*
   * Who a job can be moved to: everybody who has written an estimate in the
   * last four months, less the integration account. Not the employee list —
   * half of it has never quoted, and a picker of thirty names where seven of
   * them sell is a picker nobody finds the right name in.
   */
  const recent = await sbSelect<{ created_by: string | null; sold_by: string | null }>(
    "st_estimates",
    [q.select("created_by,sold_by"), q.gte("created_on", new Date(Date.now() - 120 * 86_400_000).toISOString())].join("&"),
  ).catch(() => []);

  const people = [
    ...new Set(
      [
        ...recent.flatMap((r) => [r.created_by, r.sold_by]),
        // Anybody a move already names, so a name that has gone quiet since
        // does not vanish from the list that already uses it.
        ...Object.values(moves).map((m) => m.to),
      ]
        .map((n) => (n ?? "").trim())
        .filter((n) => !!n && n !== IMPORT_USER),
    ),
  ].sort((a, b) => a.localeCompare(b));

  const list = [...byJob.values()]
    .map(({ _ids, ...j }) => j)
    .sort((a, b) => String(b.soldOn ?? "").localeCompare(String(a.soldOn ?? "")));

  /*
   * Who the window is under, and for how much.
   *
   * The question this page is opened with is "who is everything listed under",
   * and the answer is not in a list of rows — it is four lines. Counted after
   * the moves, because that is what the board shows.
   */
  const totals = new Map<string, CreditTotal>();
  for (const j of list) {
    const who = j.credited ?? "(nobody)";
    const got = totals.get(who) ?? { who, jobs: 0, value: 0, moved: 0 };
    got.jobs += 1;
    got.value += j.value;
    if (j.move) got.moved += 1;
    totals.set(who, got);
  }

  return {
    jobs: list,
    people,
    moves: Object.keys(moves).length,
    totals: [...totals.values()].sort((a, b) => b.value - a.value || a.who.localeCompare(b.who)),
  };
}

/**
 * Move one job's credit. `to` null undoes the move.
 *
 * `original` is who ServiceTitan credits the job to, read from the job itself
 * rather than taken from the page: the audit line has to say where the job
 * started, and a job moved twice would otherwise record the second move's
 * starting point as whoever the first move had already given it to.
 */
export async function moveCredit(key: string, to: string | null, by: string | null): Promise<void> {
  const current = normaliseSaleCredits(await getSettings<unknown>(SALE_CREDIT_KEY).catch(() => null));
  /*
   * Read, change one, write back — the whole map is one settings row, and two
   * people moving different jobs in the same minute would otherwise have the
   * last save throw the other away.
   */
  const next: SaleCredits = { ...current };
  if (to == null) delete next[key];
  else next[key] = { to, from: current[key]?.from ?? (await originalCredit(key)), by, at: new Date().toISOString() };
  await saveSettings(SALE_CREDIT_KEY, next);
}

/**
 * Who ServiceTitan credits a job to, for the `from` on a first move.
 *
 * Straight off the sales rows rather than through `readSoldJobs`, which would
 * pull the job table and the people list to answer one question about one row.
 */
export async function originalCredit(key: string): Promise<string | null> {
  const jobId = /^j(\d+)$/.exec(key)?.[1];
  const rows = await sbSelect<{ created_by: string | null; sold_by: string | null }>(
    "st_sales",
    [q.select("created_by,sold_by"), jobId ? q.eq("job_id", jobId) : q.eq("id", key.replace(/^e/, "")), "limit=1"].join("&"),
  ).catch(() => []);
  return rows[0] ? rows[0].created_by ?? rows[0].sold_by : null;
}
