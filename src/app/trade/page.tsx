import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell, TradeIcon } from "@/components/portal/TradeShell";
import { TRADE_ICON, TRADE_TILES, tileLabel } from "@/lib/portal/tradeNav";
import { mondayWeek } from "@/lib/portal/monday";
import { getUser, listGoals, dbConfigured } from "@/lib/portal/db";
import { SOP_CHANGES, SOP_VERSION, allSops } from "@/lib/portal/sops";
import { localToday } from "@/lib/portal/xero";
import { LEVEL_LABEL, type CrewLevel } from "@/lib/portal/crew";
import { ROLE_LABELS } from "@/lib/portal/caps";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trade portal" };

/** Melbourne's hour, so the greeting isn't a UTC server's idea of morning. */
function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", hour12: false }).format(new Date()),
  );
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

/**
 * The trade home: what's left of Monday, your van, and the way into everything
 * else.
 *
 * The Monday panel leads because at 7am on a Monday it is the only thing on
 * this screen anybody needs, and the rest of the week it reads as done and gets
 * out of the way.
 */
export default async function TradeHome() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const first = user.name.split(" ")[0];
  const week = await mondayWeek(user.id);
  const record = dbConfigured() ? await getUser(user.email).catch(() => null) : null;
  const goals = user.id && dbConfigured() ? await listGoals(user.id).catch(() => []) : [];
  const open = goals.filter((g) => g.status !== "done");

  const today = localToday().toLocaleDateString("en-AU", {
    timeZone: "UTC", weekday: "long", day: "numeric", month: "long",
  });
  // What they do, not what the portal calls them. "Tradesman" is the word a
  // tradesman recognises; "Team member" is an access level.
  const level = user.viewingAs
    ? LEVEL_LABEL[user.viewingAs as CrewLevel]
    : record?.level
      ? LEVEL_LABEL[record.level as CrewLevel]
      : ROLE_LABELS[user.role];

  // The newest entry in the procedure change log, and the procedure it names.
  // C6 says a change gets told to everyone; this is where the crew is told.
  const change = SOP_CHANGES[0] ?? null;
  const changed = change
    ? allSops().find((s) => change.what.startsWith(s.sop.code) || change.what.includes(` ${s.sop.code} `))
    : undefined;

  const pct = (week.done / week.steps.length) * 100;

  return (
    <TradeShell user={user} active="/trade" title={`${greeting()} ${first}.`} sub={`${today} · ${level}`}>
      <div className="tr-split">
        <section className="tr-panel tr-stack" style={{ gap: 12 }}>
          <div className="tr-card__h">
            <h2 style={{ fontSize: 22 }}>Monday van jobs</h2>
            <strong style={{ fontSize: 15, color: "var(--pt-accent-dark-bg)" }}>{week.done} of {week.steps.length} done</strong>
          </div>
          <span className="tr-sub">Due by 8am, before the first job.</span>
          <div className="tr-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>

          {week.van ? (
            <div className="tr-rows">
              {week.steps.map((s) => (
                <div className="tr-row" key={s.key}>
                  <span className={`tr-tick${s.done ? " is-on" : ""}`} aria-hidden="true">{s.done ? "✓" : ""}</span>
                  <span className="tr-row__k" style={{ flex: "1 1 auto" }}>
                    <strong>{s.title}</strong>
                    <span>{s.status}</span>
                  </span>
                  <Link href={`/trade/monday?step=${s.key}`} className="tr-chip">{s.done ? "Done" : s.cta}</Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="tr-sub" style={{ margin: 0 }}>
              No van is signed to you yet, so there is nothing to check. The office signs vans to people on the
              fleet page.
            </p>
          )}
        </section>

        <div className="tr-stack">
          <Link href="/trade/van" className="tr-card tr-link">
            <span className="tr-link__k">Your van</span>
            <strong className="tr-link__v">
              {week.van ? `${week.van.name}${week.van.rego ? ` · ${week.van.rego}` : ""}` : "None signed to you"}
            </strong>
            <span className="tr-sub">
              {week.van
                ? week.van.odometer != null
                  ? `${week.van.odometer.toLocaleString("en-AU")} km on the clock`
                  : "No reading logged yet"
                : "Ask the office to sign you one."}
            </span>
          </Link>

          <Link href="/trade/me" className="tr-card tr-link">
            <span className="tr-link__k">Your goals</span>
            <strong className="tr-link__v">
              {open.length ? `${open.length} open` : "Nothing set yet"}
            </strong>
            <span className="tr-sub">
              {open.length ? open[0].title : "Your manager adds these."}
            </span>
          </Link>

          <Link href={changed ? `/trade/processes?sop=${changed.sop.code}` : "/trade/processes"} className="tr-card tr-link">
            <span className="tr-link__k">Latest change to how we work</span>
            <strong className="tr-link__v">
              {changed ? `${changed.sop.code} · ${changed.sop.title}` : SOP_VERSION}
            </strong>
            <span className="tr-sub">{change ? `${change.on}. Have a read.` : "Nothing changed yet."}</span>
          </Link>
        </div>
      </div>

      <div className="tr-tiles">
        {TRADE_TILES.map((t) => (
          <Link key={t.href} href={t.href} className="tr-tile">
            <TradeIcon path={TRADE_ICON[t.icon]} size={26} />
            <span>{tileLabel(t)}</span>
          </Link>
        ))}
      </div>
    </TradeShell>
  );
}
