import "server-only";
import { cache } from "react";
import { can, type PortalUser } from "@/lib/portal/caps";
import { crewRequests, latestBoard, vanIssues } from "@/lib/portal/office";
import { dueState, isLow, listStock } from "@/lib/portal/stock";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { money } from "@/lib/portal/format";
import { portalNav, type NavBand } from "@/lib/portal/nav";
import { journalErrors } from "@/lib/journals/read";
import { overdueByPerson } from "@/lib/todos/store";

/** One thing waiting on somebody, with the side-bar tab it belongs to. */
export type NeedLine = { n: number; text: string; href: string; band: NavBand | null };

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

/**
 * What needs someone today: the list Home and The numbers draw, and what the
 * side bar's "need you" counts are made of — one list, so the count beside
 * Crew & vans is the number of lines on Home that open a Crew & vans page.
 *
 * Only lines that can be counted. The design has nine; the ones with nothing
 * behind them yet — chats waiting, hours not billed, payment plans, VEU claims
 * — stay off rather than show a number nobody measured, and every line hides
 * at zero.
 */
export const needsToday = cache(async (user: PortalUser): Promise<NeedLine[]> => {
  if (!can(user, "overhead")) return [];
  const [board, issues, shelf, asks, journals, lateTodos] = await Promise.all([
    latestBoard(),
    vanIssues().catch(() => []),
    listStock().catch(() => null),
    crewRequests().catch(() => ({ orders: [], leave: [], incidents: [] })),
    journalErrors().catch(() => []),
    overdueByPerson().catch(() => []),
  ]);
  const m = board?.metrics;
  const lines: Array<Omit<NeedLine, "band">> = [];

  // Safety first: an incident sits at the top until somebody has read it.
  if (asks.incidents.length) {
    const f = asks.incidents[0];
    lines.push({ n: asks.incidents.length, text: `${plural(asks.incidents.length, "incident")} reported · ${f.userName ?? "the crew"}${asks.incidents.length > 1 ? ` and ${asks.incidents.length - 1} more` : ""}`, href: "/portal/requests#incidents" });
  }
  // The books are short until a journal entry that didn't reach Xero is fixed.
  if (journals.length) {
    const f = journals[0];
    lines.push({ n: journals.length, text: `journal ${plural(journals.length, "entry", "entries")} didn't sync to Xero · #${f.number ?? "—"}${journals.length > 1 ? ` and ${journals.length - 1} more` : ""}`, href: "/portal/journals#errors" });
  }
  // To-dos past their day, and whose they are.
  const lateN = lateTodos.reduce((t, p) => t + p.n, 0);
  if (lateN) {
    lines.push({ n: lateN, text: `${plural(lateN, "to-do")} overdue · ${lateTodos.map((p) => `${p.name.split(" ")[0]} ${p.n}`).join(", ")}`, href: "/portal/todo" });
  }
  if (m && (m.quotesQuietCount ?? 0) > 0) {
    lines.push({ n: m.quotesQuietCount, text: `${plural(m.quotesQuietCount, "quote")} gone quiet 7+ days`, href: "/portal/quotes#quiet" });
  }
  if (m && (m.overdueCount ?? 0) > 0 && m.overdueTotal != null) {
    lines.push({ n: m.overdueCount as number, text: `${plural(m.overdueCount as number, "invoice")} overdue · ${money(m.overdueTotal)}`, href: "/portal/money" });
  }
  // Jobs this month that lost money once their parts and hours are costed.
  const jp = m?.jobProfitMonth;
  if (jp && jp.losing > 0) {
    lines.push({ n: jp.losing, text: `${plural(jp.losing, "job")} lost money this month${jp.under > jp.losing ? ` · ${jp.under} under the goal's margin` : ""}`, href: "/portal/profit" });
  }
  const service = issues.filter((i) => i.kind === "service");
  if (service.length) {
    const f = service[0];
    lines.push({
      n: service.length,
      text: `van ${plural(service.length, "report")} to answer · ${f.item.toLowerCase()} (${f.van}${service.length > 1 ? ` and ${service.length - 1} more` : ""})`,
      href: service.length === 1 ? `/portal/vehicles/${f.vehicleId}?tab=report` : "/portal/requests#reports",
    });
  }
  const tools = issues.filter((i) => i.kind === "tool");
  if (tools.length) {
    const f = tools[0];
    lines.push({
      n: tools.length,
      text: `${plural(tools.length, "tool")} to sort on a van · ${f.item.toLowerCase()} (${f.van}${tools.length > 1 ? ` and ${tools.length - 1} more` : ""})`,
      href: tools.length === 1 ? `/portal/vehicles/${f.vehicleId}?tab=tools` : "/portal/vehicles",
    });
  }
  if (asks.orders.length) {
    const f = asks.orders[0];
    lines.push({ n: asks.orders.length, text: `parts ${plural(asks.orders.length, "order")} to place · ${f.requestedBy ?? "the crew"}${asks.orders.length > 1 ? ` and ${asks.orders.length - 1} more` : ""}`, href: "/portal/requests#parts" });
  }
  if (asks.leave.length) {
    lines.push({ n: asks.leave.length, text: `leave ${plural(asks.leave.length, "request")} to answer`, href: "/portal/requests#leave" });
  }
  const low = shelf ? shelf.filter(isLow) : [];
  const lowMaterials = low.filter((i) => i.section === "materials").length;
  const lowSystems = low.filter((i) => i.section === "systems").length;
  if (lowMaterials > 0) {
    lines.push({ n: lowMaterials, text: `factory stock ${plural(lowMaterials, "line")} at or under the minimum`, href: "/portal/stock" });
  }
  if (lowSystems > 0) {
    lines.push({ n: lowSystems, text: `${plural(lowSystems, "system")} in the factory at or under the minimum`, href: "/portal/stock?s=systems" });
  }
  // A tool past its test & tag or service shouldn't go on site, so it's a line
  // here the day it lapses rather than something found on the job.
  const today = isoDateMelbourne(new Date());
  const lapsed = shelf ? shelf.filter((i) => i.section === "tools" && dueState(i.dueOn, today) === "over") : [];
  if (lapsed.length) {
    lines.push({ n: lapsed.length, text: `${plural(lapsed.length, "tool")} overdue for test & tag or service · ${lapsed[0].name}${lapsed.length > 1 ? ` and ${lapsed.length - 1} more` : ""}`, href: "/portal/stock?s=tools" });
  }

  // Each line belongs to the tab whose page it opens.
  const items = portalNav(user);
  const bandOf = (href: string): NavBand | null => {
    const path = href.split(/[?#]/)[0];
    let best: { band: NavBand; len: number } | null = null;
    for (const it of items) {
      const base = it.href.split("?")[0];
      if (it.band === "hidden") continue;
      if (path === base || path.startsWith(`${base}/`)) {
        if (!best || base.length > best.len) best = { band: it.band, len: base.length };
      }
    }
    return best?.band ?? null;
  };
  return lines.map((l) => ({ ...l, band: bandOf(l.href) }));
});

/** How many lines of the list each tab holds: the side bar's and Home's "need you". */
export function needsByBand(lines: NeedLine[]): Partial<Record<NavBand, number>> {
  const out: Partial<Record<NavBand, number>> = {};
  for (const l of lines) if (l.band) out[l.band] = (out[l.band] ?? 0) + 1;
  return out;
}
