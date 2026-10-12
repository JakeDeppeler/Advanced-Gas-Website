import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can, ROLE_LABELS } from "@/lib/portal/caps";
import { getUserById, listGoals, listReviews, listReports, listVehicles } from "@/lib/portal/db";
import { listLeave } from "@/lib/portal/people";
import { LEAVE_KINDS } from "@/lib/portal/peopleParts";
import { PortalShell } from "@/components/portal/PortalShell";
import { PersonFile, type PersonTab } from "@/components/portal/PersonFile";
import { PersonActions } from "@/components/portal/PersonActions";
import { LEVEL_LABEL, type CrewLevel } from "@/lib/portal/crew";
import { PersonVan } from "@/components/portal/PersonVan";
import { personVan } from "@/lib/portal/personVan";
import { money2 } from "@/lib/portal/format";
import { money } from "@/lib/portal/run/month";
import { crewFigures } from "@/lib/portal/crewRates";
import { latestBoard } from "@/lib/portal/office";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { Locked } from "@/components/portal/Locked";
import { Card, Empty, Kv, Pill, Tabs, Two, type Status } from "@/components/portal/kit/Kit";
import { Licences } from "@/components/portal/crew/Licences";
import { CrewPay } from "@/components/portal/crew/CrewPay";
import { isCrewLevel } from "@/lib/portal/crew";
import { listLicences, licenceState } from "@/lib/portal/crewFile/licences";
import { commissionHistory, commissionRule, monthNow, soldThisMonth } from "@/lib/portal/crewFile/commission";
import { bonusFor } from "@/lib/portal/commissionTypes";

export const dynamic = "force-dynamic";

type Tab = PersonTab | "comm" | "pay" | "lic";

const when = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const monthName = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", month: "long", year: "numeric" });

/**
 * Crew & vans › Team › a person's file. Seven tabs as the design has them:
 * what's expected, goals, commission (admin only — it's money), reviews,
 * private notes, leave & pay, and licences & tickets.
 */
export default async function TeamMemberFile({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string } }) {
  const me = await getPortalUser();
  if (!me) redirect("/portal/login");
  if (!can(me, "reports_read")) return <Locked user={me} what="Team" forWhom="managers" />;

  const person = await getUserById(params.id);
  if (!person || !person.id) notFound();

  // Wages and commission dollars are the admin's; a lead hand reads the rest.
  const money$ = can(me, "manage_users");
  const want = searchParams.tab as Tab | undefined;
  const tab: Tab = want && ["goals", "reviews", "notes", "pay", "lic"].includes(want) ? want : want === "comm" && money$ ? "comm" : "expected";
  const today = isoDateMelbourne(new Date());

  const [goals, reviews, notes, vanView, licences, leave, figures, board, rule, history] = await Promise.all([
    listGoals(person.id),
    listReviews(person.id),
    listReports({ subjectId: person.id }),
    personVan(person.id, person.name),
    listLicences(person.id),
    listLeave({ userId: person.id, limit: 12 }),
    crewFigures().catch(() => ({ crew: [] as { id: string; rate: number | null }[] })),
    latestBoard(),
    commissionRule(),
    money$ ? commissionHistory(person.id) : Promise.resolve([]),
  ]);
  const rate = figures.crew.find((c) => c.id === person.id)?.rate ?? null;
  const canFleet = can(me, "vehicles");
  const vans = canFleet && tab === "pay" ? (await listVehicles()).map((v) => ({ id: v.id, name: v.name, rego: v.rego })) : [];
  const first = person.name.split(" ")[0];
  const level = person.level ? LEVEL_LABEL[person.level as CrewLevel] : ROLE_LABELS[person.role];
  const lic = licences.map((l) => ({ ...l, st: licenceState(l.expiresOn, today) }));
  const licBad = lic.some((l) => l.st.k === "bad");
  const sold = soldThisMonth(person.name, board?.metrics ?? null);
  const b = sold != null ? bonusFor(sold, rule) : null;
  const href = (t: Tab) => `/portal/team/${person.id}${t === "expected" ? "" : `?tab=${t}`}`;

  const tabs = [
    { key: "expected", label: "What’s expected", href: href("expected") },
    { key: "goals", label: "Goals & targets", href: href("goals") },
    ...(money$ ? [{ key: "comm", label: b?.hit ? "Commission ✓" : "Commission", href: href("comm") }] : []),
    { key: "reviews", label: "Reviews", href: href("reviews") },
    { key: "notes", label: "Private notes", href: href("notes") },
    { key: "pay", label: money$ ? "Pay, hours & leave" : "Leave & pay", href: href("pay") },
    { key: "lic", label: "Licences & tickets", href: href("lic"), count: lic.filter((l) => l.st.k === "bad").length || undefined, red: licBad },
  ];

  const glance = (
    <Card title="At a glance">
      <Kv t="Level" v={level} />
      <Kv t="Van" v={vanView.van ? <Link href={`/portal/vehicles/${vanView.van.id}`}>{vanView.van.name} ›</Link> : "None"} />
      <Kv t="Charge-out" sub="what an hour of them is priced at" v={rate !== null ? `${money2(rate)}/hr` : "Not costed"} />
      <Kv t="Annual leave" v={person.costing ? `${person.costing.leaveDays} days a year` : "—"} />
      {money$ && <Kv t="Overtime" v={person.costing ? `${person.costing.otMult}× · ${money2(person.costing.wage * person.costing.otMult)}/hr` : "—"} />}
      <Kv t="Licences" v={lic.length ? (licBad ? <span style={{ color: "var(--bad)" }}>▼ one has run out</span> : lic.some((l) => l.st.k === "mid") ? "! one runs out soon" : `${lic.length} on file`) : "None recorded"} />
    </Card>
  );

  return (
    <PortalShell user={me}>
      <div className="pk">
        <Link href="/portal/team" className="pk-note" style={{ textDecoration: "none" }}>‹ The crew</Link>
        <div className="pk-head">
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span className="pk-av" style={{ width: 56, height: 56, fontSize: 22 }} aria-hidden="true">{person.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <h1>{person.name}</h1>
              <div className="pk-sub">
                {level} · {person.email ? person.email : <b style={{ color: "var(--bad)" }}>No login email yet</b>}
              </div>
            </div>
          </div>
          <PersonActions userId={person.id} first={first} level={person.level ?? null} hasEmail={Boolean(person.email)} canManage={can(me, "manage_users")} />
        </div>
        <Tabs on={tab} label="Their file" items={tabs} />

        {(tab === "expected" || tab === "goals" || tab === "reviews" || tab === "notes") && (
          <Two>
            <div>
              {tab === "goals" && sold != null && (
                <div style={{ marginBottom: 14 }}>
                  <Card title="Sold this month" aside={`target ${money(rule.monthTarget)} · from Our numbers`}>
                    <Kv t={money(sold)} sub={b!.hit ? "target hit" : `${money(b!.toGo)} to go`} v={<Pill st={b!.hit ? { k: "good", w: "Hit" } : sold / rule.monthTarget >= 0.75 ? { k: "mid", w: "Close" } : { k: "bad", w: "Behind" }} />} />
                    <div className={`pk-bar ${b!.hit ? "good" : "mid"}`}><i style={{ width: `${Math.max(2, Math.min(100, (sold / rule.monthTarget) * 100))}%` }} /></div>
                  </Card>
                </div>
              )}
              <PersonFile
                show={tab}
                userId={person.id}
                name={person.name}
                expectations={person.expectations ?? null}
                goals={goals.map((g) => ({ id: g.id, title: g.title, target: g.target, status: g.status, due: g.due }))}
                reviews={reviews.map((r) => ({ id: r.id, period: r.period, rating: r.rating, body: r.body, authorName: r.authorName, when: when(r.createdAt) }))}
                notes={notes.map((n) => ({ id: n.id, sentiment: n.sentiment, body: n.body, authorName: n.authorName, when: when(n.createdAt) }))}
                canEdit={can(me, "reports_write")}
                canDeleteNotes={can(me, "manage_users")}
              />
            </div>
            {glance}
          </Two>
        )}

        {tab === "comm" && (
          <Card title="Commission" aside={`${rule.ratePct}% of everything sold in the month, once the ${money(rule.monthTarget)} target is hit · Our numbers › Commission`}>
            {sold == null ? (
              <Empty>ServiceTitan has no one called {person.name}, so there are no sales to count. If they sell under another name, make the two match.</Empty>
            ) : (
              <>
                <Kv t={<b>{monthName(monthNow())} so far</b>} sub={`${money(sold)} of ${money(rule.monthTarget)}`}
                  v={b!.hit ? money(b!.bonus) : "$0"}>
                  <Pill st={(b!.hit ? { k: "good", w: "Target hit" } : { k: sold / rule.monthTarget >= 0.75 ? "mid" : "bad", w: `${money(b!.toGo)} to go` }) as Status} />
                </Kv>
                <div className={`pk-bar ${b!.hit ? "good" : "mid"}`}><i style={{ width: `${Math.max(2, Math.min(100, (sold / rule.monthTarget) * 100))}%` }} /></div>
                <p className="pk-note">{b!.hit
                  ? `Hit. ${money(b!.bonus)} is on ${first}’s file and grows with every sale until the month ends.`
                  : `Sell ${money(b!.toGo)} more this month and the bonus is ${money(b!.wouldBe)}: ${rule.ratePct}% of the whole month, not just the part over the target.`}</p>
              </>
            )}
            <div style={{ marginTop: 16 }}>
              <b style={{ fontSize: 13 }}>On {first}’s file</b>
              {history.length === 0 ? <div className="pk-empty" style={{ marginTop: 8 }}>Nothing saved yet. Each month is saved as it goes, from the sync.</div> : (
                <div className="pk-tbl-wrap">
                  <table className="pk-tbl">
                    <thead><tr><th>Month</th><th>Sold</th><th>Target</th><th className="l">Result</th><th>Bonus</th></tr></thead>
                    <tbody>
                      {history.map((r) => (
                        <tr key={r.month}>
                          <td><b>{monthName(r.month)}</b>{r.month === monthNow() && <span className="ks"> · this month</span>}</td>
                          <td>{money(r.sold)}</td>
                          <td>{money(r.target)}</td>
                          <td className="l"><Pill st={r.hit ? { k: "good", w: "Hit" } : r.month === monthNow() ? { k: "none", w: "Going" } : { k: "none", w: "Missed" }} /></td>
                          <td><b>{r.hit ? money(r.bonus) : "·"}</b></td>
                        </tr>
                      ))}
                      <tr className="tot"><td>Bonuses on file</td><td /><td /><td className="l">{history.filter((r) => r.hit).length} hit</td><td>{money(history.reduce((a, r) => a + (r.hit ? r.bonus : 0), 0))}</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        )}

        {tab === "pay" && (
          <Two>
            <div style={{ display: "grid", gap: 14 }}>
              <Card title="Leave booked" aside="asked for on the iPad · approved in From the crew">
                {leave.length === 0 ? <Empty>Nothing booked.</Empty> : leave.map((l) => (
                  <Kv key={l.id} t={`${LEAVE_KINDS.find((k) => k.k === l.kind)?.label ?? l.kind}`} sub={`${day(l.from)}${l.to !== l.from ? ` to ${day(l.to)}` : ""}${l.note ? ` · ${l.note}` : ""}`}
                    v={<Pill st={l.status === "approved" ? { k: "good", w: "Approved" } : l.status === "declined" ? { k: "bad", w: "Declined" } : { k: "mid", w: "Asked" }} />} />
                ))}
              </Card>
              {/* The admin edits pay and hours here, on the person; Our numbers ›
                  Team & wages is the same record laid side by side. */}
              {person.costing && money$ && can(me, "overhead") ? (
                <CrewPay userId={person.id} first={first} level={isCrewLevel(person.level) ? person.level : "tradesman"} costing={person.costing} rate={rate} />
              ) : person.costing && (
                <Card title="Their year" aside="set by the office">
                  {money$ && <Kv t="Wage" sub="an hour, before super" v={money2(person.costing.wage)} />}
                  <Kv t="Annual leave" v={`${person.costing.leaveDays} days`} />
                  <Kv t="RDOs" v={`${person.costing.rdoDays} days`} />
                  <Kv t="Sick leave" v={`${person.costing.sickDays} days`} />
                  <Kv t="Public holidays" v={`${person.costing.phDays} days`} />
                  {money$ && <Kv t="Overtime" v={`${person.costing.otMult}× · ${money2(person.costing.wage * person.costing.otMult)}/hr`} />}
                  {money$ && <Kv t="Nights" v={`${person.costing.nightMult}× · ${money2(person.costing.wage * person.costing.nightMult)}/hr`} />}
                  <Kv t="Call-backs" v={`${person.costing.callbackPct ?? 0}%`} />
                </Card>
              )}
              <PersonVan {...vanView} mine={false} assign={canFleet ? { userId: person.id, vans } : undefined} />
            </div>
            {glance}
          </Two>
        )}

        {tab === "lic" && <Licences userId={person.id} first={first} canEdit={can(me, "reports_write")} rows={lic.map((l) => ({ id: l.id, name: l.name, number: l.number, expires: l.expiresOn ? day(l.expiresOn) : null, st: l.st }))} />}
      </div>
    </PortalShell>
  );
}
