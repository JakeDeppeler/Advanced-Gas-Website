import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can, ROLE_LABELS } from "@/lib/portal/caps";
import { getUserById, listGoals, listReviews, listReports, listVehicles } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import Link from "next/link";
import { PersonFile, type PersonTab } from "@/components/portal/PersonFile";
import { PersonActions } from "@/components/portal/PersonActions";
import { LEVEL_LABEL, type CrewLevel } from "@/lib/portal/crew";
import { PersonVan } from "@/components/portal/PersonVan";
import { personVan } from "@/lib/portal/personVan";
import { money2 } from "@/lib/portal/format";
import { crewFigures } from "@/lib/portal/crewRates";

export const dynamic = "force-dynamic";


function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

/** The five tabs the design gives a person's file. */
const TABS: { k: PersonTab | "pay"; label: string }[] = [
  { k: "expected", label: "What's expected" },
  { k: "goals", label: "Goals & targets" },
  { k: "reviews", label: "Reviews" },
  { k: "notes", label: "Private notes" },
  { k: "pay", label: "Leave & pay" },
];

export default async function TeamMemberFile({
  params, searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const tab = (TABS.find((t) => t.k === searchParams.tab)?.k ?? "expected") as PersonTab | "pay";
  const me = await getPortalUser();
  if (!me) redirect("/portal/login");
  if (!can(me, "reports_read")) redirect("/portal?denied=1");

  const person = await getUserById(params.id);
  if (!person || !person.id) notFound();

  const [goals, reviews, notes, vanView] = await Promise.all([
    listGoals(person.id),
    listReviews(person.id),
    listReports({ subjectId: person.id }),
    personVan(person.id, person.name),
  ]);
  // The same figure the job calculator prices from, so a manager and a quote
  // never disagree about what an hour of this person costs.
  const { crew } = await crewFigures();
  const rate = crew.find((c) => c.id === person.id)?.rate ?? null;
  const canFleet = can(me, "vehicles");
  const vans = canFleet ? (await listVehicles()).map((v) => ({ id: v.id, name: v.name, rego: v.rego })) : [];

  return (
    <PortalShell user={me}>
      <div className="pt-person">
        <span className="pt-person__av" aria-hidden="true">{person.name.slice(0, 1).toUpperCase()}</span>
        <div className="pt-person__who">
          <PortalBack href="/portal/team" label="The crew" />
          <h1>{person.name}</h1>
          <p>
            {person.level ? LEVEL_LABEL[person.level as CrewLevel] : ROLE_LABELS[person.role]}
            {" · "}
            {/* Somebody with no email can be costed and rostered but cannot
                sign in, and that is worth saying out loud on their file. */}
            {person.email
              ? <span>{person.email}</span>
              : <strong className="pt-person__nologin">No login email yet</strong>}
          </p>
        </div>
        <div className="pt-person__acts">
          <PersonActions
            userId={person.id}
            first={person.name.split(" ")[0]}
            level={person.level ?? null}
            hasEmail={Boolean(person.email)}
            canManage={can(me, "manage_users")}
          />
        </div>
      </div>

      <nav className="pt-tabs pt-tabs--inline" aria-label="Their file">
        {TABS.map((t) => (
          <Link
            key={t.k}
            href={`/portal/team/${person.id}${t.k === "expected" ? "" : `?tab=${t.k}`}`}
            aria-current={t.k === tab ? "page" : undefined}
            className={`pt-tab${t.k === tab ? " is-on" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="pt-person__body">
        <div className="pt-person__main">
      {tab === "pay" && person.costing && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Their year, and what they&rsquo;re paid outside normal hours</h2>
          <p className="pt-panel__sub">Set in Costs &amp; capacity. Shown here so a manager doesn&rsquo;t have to go looking.</p>
          <div className="pt-pl__heads">
            <div className="pt-pl__head"><span className="pt-pl__headlabel">Annual leave</span><strong className="pt-pl__headval">{person.costing.leaveDays} days</strong></div>
            <div className="pt-pl__head"><span className="pt-pl__headlabel">RDOs</span><strong className="pt-pl__headval">{person.costing.rdoDays} days</strong></div>
            <div className="pt-pl__head"><span className="pt-pl__headlabel">Sick leave</span><strong className="pt-pl__headval">{person.costing.sickDays} days</strong></div>
            <div className="pt-pl__head"><span className="pt-pl__headlabel">Public holidays</span><strong className="pt-pl__headval">{person.costing.phDays} days</strong></div>
            <div className="pt-pl__head"><span className="pt-pl__headlabel">Overtime</span><strong className="pt-pl__headval">{person.costing.otMult}×<em> {money2(person.costing.wage * person.costing.otMult)}/hr</em></strong></div>
            <div className="pt-pl__head"><span className="pt-pl__headlabel">Nights</span><strong className="pt-pl__headval">{person.costing.nightMult}×<em> {money2(person.costing.wage * person.costing.nightMult)}/hr</em></strong></div>
            <div className="pt-pl__head"><span className="pt-pl__headlabel">Call-backs</span><strong className="pt-pl__headval">{person.costing.callbackPct ?? 0}%</strong></div>
          </div>
        </section>
      )}

      {tab === "pay" && <PersonVan {...vanView} mine={false} assign={canFleet ? { userId: person.id, vans } : undefined} />}

      {tab !== "pay" && (
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
      )}
        </div>

        {/* The five facts a manager opens this page already wanting. */}
        <aside className="pt-panel pt-glance">
          <h2 className="pt-panel__h">At a glance</h2>
          <div className="pt-glance__row"><span>Level</span><strong>{person.level ? LEVEL_LABEL[person.level as CrewLevel] : ROLE_LABELS[person.role]}</strong></div>
          <div className="pt-glance__row"><span>Van</span><strong>{vanView.van ? vanView.van.name : "Not signed to a van"}</strong></div>
          <div className="pt-glance__row"><span>Charge-out</span><strong>{rate !== null ? `${money2(rate)}/hr` : "Not costed"}</strong></div>
          <div className="pt-glance__row"><span>Annual leave</span><strong>{person.costing ? `${person.costing.leaveDays} days` : "—"}</strong></div>
          <div className="pt-glance__row">
            <span>Overtime</span>
            <strong>{person.costing ? `${person.costing.otMult}× · ${money2(person.costing.wage * person.costing.otMult)}/hr` : "—"}</strong>
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}
