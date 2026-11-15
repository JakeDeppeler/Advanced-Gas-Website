import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";

/**
 * The work that keeps coming back, and how to stop doing it by hand (Jake,
 * 15 Nov: "tracking tasks that are being repeated that could be automated").
 *
 * Looking at the 90 days to 15 Nov, nearly all the repetition was in to-dos
 * the portal writes itself: 229 "Close job in ServiceTitan", 145 "Invoice
 * job", 219 "Chase invoice". The reminder is automatic; the work behind it
 * isn't, and that work is the thing to take away. The rest was the office
 * typing the same kind of task by hand, an address and a note saying "book
 * the install" or "send the quote", forty-odd times.
 *
 * So the to-dos are sorted into kinds by their words, counted, timed from
 * made to done, and each kind carries what would take it off the list. A
 * to-do that fits no kind is grouped by its words with the names and numbers
 * taken out, and shows only when the same words come up three times.
 */

export type RepeatRow = {
  key: string;
  label: string;
  /** What it is, in a line. */
  what: string;
  /** How to stop doing it by hand, in order. */
  fix: string[];
  total: number;
  auto: number;
  /** Who typed the rest, most first. */
  byHand: Array<{ name: string; n: number }>;
  done: number;
  open: number;
  /** Median hours from made to done, over the ones done. */
  medianHrs: number | null;
  /** Up to three recent titles, so the kind can be recognised. */
  examples: string[];
};

export type Repeats = { days: number; rows: RepeatRow[]; total: number };

type Kind = { key: string; label: string; what: string; fix: string[]; test: (title: string, notes: string) => boolean };

const KINDS: Kind[] = [
  {
    key: "close", label: "Close the job in ServiceTitan", what: "The portal writes one when a job's work is finished but the job is still open in ServiceTitan.",
    test: (t) => /^close job\b/.test(t),
    fix: [
      "Make closing the job the tech's last step on site, on the iPad, before they drive away.",
      "Then the to-do never gets written. The portal could also close the job itself once it's invoiced; that changes ServiceTitan, so it's Jake's call.",
    ],
  },
  {
    key: "invoice", label: "Invoice the job", what: "The portal writes one for each finished job with no invoice.",
    test: (t) => /^invoice job\b/.test(t),
    fix: [
      "Service and breakdown calls: the tech invoices on the iPad and takes payment before leaving.",
      "The office then only invoices installs and real estate work, which need a check first.",
    ],
  },
  {
    key: "chase", label: "Chase an unpaid invoice", what: "The portal writes one when an invoice goes past its due date.",
    test: (t) => /^chase\b/.test(t),
    fix: [
      "Turn on Xero's automatic invoice reminders: before the due date, on it, and a week and two weeks after.",
      "Then only the customers who ignore the emails come to a person, and the to-do is for a phone call, not a reminder.",
    ],
  },
  {
    key: "followup", label: "Follow up a quote", what: "The portal writes these on the follow-up days, day 2 and after.",
    test: (t) => /^(first |second |third |last )?follow[- ]?up\b/.test(t),
    fix: [
      "Send an automatic text on day 2 with the quote and a line asking if they have questions. ServiceTitan's Marketing Pro can send estimate follow-ups by itself.",
      "Keep the phone call for the quotes that answer, and for anything over $10K.",
    ],
  },
  {
    key: "quote", label: "Write or send a quote", what: "A quote visit that still needs its price, written by the portal or typed by hand.",
    test: (t, n) => /^(write the quote|quote:)/.test(t) || /\b(quote|quoting)\b/.test(n) || /\bquote\b/.test(t),
    fix: [
      "Price the common jobs from the quote templates, so a split or a system replacement is done in minutes on the day of the visit.",
      "The portal already writes a \"Write the quote\" to-do after every quote visit. A second one typed by hand is the same job twice.",
    ],
  },
  {
    key: "book", label: "Book a job or another visit", what: "Typed by hand: an address and a note to book the install, the site visit or another attendance.",
    test: (t, n) => /\bbook(ed|ing)?\b/.test(t) || /\bbook(ed|ing)?\b/.test(n) || /\battendance\b/.test(n),
    fix: [
      "Sold work: book it straight from the pipeline's Sold, to be booked column. The portal already lists every sale with no job.",
      "Another visit: have the tech mark it on the iPad with the reason before leaving, so the booking comes to the office written, not by phone.",
    ],
  },
];

/** Names, numbers and amounts out, so "Chase invoice 20311, Smith" and "Chase invoice 20412, Lee" read the same. */
const shape = (t: string) => t.replace(/\$[\d,.]+k?/g, "$").replace(/\d+/g, "#").split(/[,·:–-]/)[0].trim().split(/\s+/).slice(0, 3).join(" ");

type Row = { title: string | null; notes: string | null; created_by: string | null; created_at: string; done_at: string | null; removed_at: string | null };

export async function repeatedWork(days = 90): Promise<Repeats> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = await sbSelect<Row>("portal_todos", [q.select("title,notes,created_by,created_at,done_at,removed_at"), q.gte("created_at", since), "order=created_at.desc", "limit=5000"].join("&")).catch(() => [] as Row[]);

  type Acc = { kind: Kind | null; label: string; rows: Row[] };
  const groups = new Map<string, Acc>();
  for (const r of rows) {
    const title = (r.title ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    const notes = (r.notes ?? "").toLowerCase();
    if (!title || /^te?st$/.test(title)) continue;
    const k = KINDS.find((x) => x.test(title, notes)) ?? null;
    const key = k ? k.key : `w:${shape(title)}`;
    const g = groups.get(key) ?? { kind: k, label: k ? k.label : (r.title ?? "").trim(), rows: [] };
    g.rows.push(r);
    groups.set(key, g);
  }

  const out: RepeatRow[] = [];
  for (const [key, g] of groups) {
    // Words that fit no kind only count once they've come up three times.
    if (!g.kind && g.rows.length < 3) continue;
    const auto = g.rows.filter((r) => r.created_by === "Automatic").length;
    const hand = new Map<string, number>();
    for (const r of g.rows) if (r.created_by && r.created_by !== "Automatic") hand.set(r.created_by, (hand.get(r.created_by) ?? 0) + 1);
    const done = g.rows.filter((r) => r.done_at);
    const hrs = done.map((r) => (Date.parse(r.done_at as string) - Date.parse(r.created_at)) / 3_600_000).filter((h) => h >= 0).sort((a, b) => a - b);
    out.push({
      key,
      label: g.kind ? g.label : `"${shape((g.rows[0].title ?? "").trim())}…"`,
      what: g.kind ? g.kind.what : "Typed by hand with the same words, names and numbers aside.",
      fix: g.kind ? g.kind.fix : ["If it's the same job each time, it can be a step the portal does: tell Jake what triggers it and where the answer comes from."],
      total: g.rows.length,
      auto,
      byHand: [...hand.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n),
      done: done.length,
      open: g.rows.filter((r) => !r.done_at && !r.removed_at).length,
      medianHrs: hrs.length ? hrs[Math.floor(hrs.length / 2)] : null,
      examples: g.rows.slice(0, 3).map((r) => (r.title ?? "").trim()),
    });
  }
  out.sort((a, b) => b.total - a.total);
  return { days, rows: out, total: rows.length };
}
