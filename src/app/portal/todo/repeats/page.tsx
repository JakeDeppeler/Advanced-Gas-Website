import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Card, Empty, Head, Say } from "@/components/portal/kit/Kit";
import { dbConfigured } from "@/lib/portal/db";
import { repeatedWork, type RepeatRow } from "@/lib/todos/repeats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Repeated work · Team portal" };

const days = (h: number) => (h < 24 ? `${Math.max(1, Math.round(h))} hrs` : `${(h / 24).toFixed(h < 72 ? 1 : 0)} days`);
const pl = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-AU")} ${n === 1 ? one : many}`;

function madeBy(r: RepeatRow): string {
  const hand = r.byHand.map((p) => `${p.name.split(" ")[0]} ${p.n}`);
  if (r.auto && hand.length) return `the portal ${r.auto}, by hand ${hand.join(", ")}`;
  if (r.auto) return "all written by the portal";
  return `typed by hand: ${hand.join(", ")}`;
}

/**
 * To-do › Repeats: the kinds of to-do that keep coming back, how many in the
 * last 90 days, who made them, how long they sit, and what would take each
 * kind off the list. Most of the count is reminders the portal writes; the
 * point of the page is the work behind them, which is still done by hand.
 */
export default async function RepeatsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead") && !can(user, "manage_users")) return <Locked user={user} what="Repeated work" forWhom="the office" />;

  const data = dbConfigured() ? await repeatedWork(90).catch(() => null) : null;
  const rows = data?.rows ?? [];
  const top = rows.slice(0, 3);
  const perDay = (n: number) => (n / 90 >= 1 ? `${(n / 90).toFixed(1)} a day` : `${Math.round((n / 90) * 7)} a week`);

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Repeated work" eyebrow="To-dos · last 90 days" info={[
          ["Kind", "To-dos sorted by what they ask for, from their words and notes. Names, numbers and amounts don't count, so every \"Close job\" is one kind."],
          ["Sits for", "Half the to-dos of that kind were done sooner than this, half later. Counted from when it was made to when it was ticked."],
          ["By the portal", "Written by the portal's automations, not typed by a person. The reminder is automatic; the work behind it usually isn't."],
        ]} />
        {data && rows.length ? (
          <>
            <Say>
              {pl(data.total, "to-do")} in 90 days. The three that come back most are {top.map((r, i) => <span key={r.key}>{i ? (i === top.length - 1 ? " and " : ", ") : ""}<b>{r.label.charAt(0).toLowerCase() + r.label.slice(1)}</b> ({r.total})</span>)}: {Math.round((top.reduce((n, r) => n + r.total, 0) / data.total) * 100)}% of everything on the lists.
            </Say>
            <div className="rp-list">
              {rows.map((r) => (
                <Card key={r.key} title={r.label} aside={`${r.total} · ${perDay(r.total)}`}>
                  <p className="rp-what">{r.what}</p>
                  <dl className="rp-facts">
                    <div><dt>Made</dt><dd>{madeBy(r)}</dd></div>
                    <div><dt>Done</dt><dd>{r.done} of {r.total}{r.open ? `, ${r.open} still open` : ""}</dd></div>
                    <div><dt>Sits for</dt><dd>{r.medianHrs != null ? days(r.medianHrs) : "—"}</dd></div>
                  </dl>
                  <div className="rp-fix">
                    <b>To stop doing it by hand</b>
                    <ol>{r.fix.map((f) => <li key={f}>{f}</li>)}</ol>
                  </div>
                  {r.examples.length > 0 && <p className="rp-eg">Recent: {r.examples.map((e, i) => <span key={i}>{i ? " · " : ""}&ldquo;{e}&rdquo;</span>)}</p>}
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Empty>{data ? "Nothing has come up more than twice in the last 90 days." : "The to-dos couldn't be read just now."}</Empty>
        )}
      </div>
    </PortalShell>
  );
}
