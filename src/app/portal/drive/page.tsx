import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { onTheTools } from "@/lib/portal/onTheTools";
import { getSettings } from "@/lib/portal/db";
import { normalisePricing } from "@/lib/portal/pricingTypes";
import { BENCH, benchStatus } from "@/lib/portal/benchmarks";
import { money } from "@/lib/portal/run/month";
import { Bad, Card, Empty, Grid, Head, Kv, Pill, Say, Tile, none } from "@/components/portal/kit/Kit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Drive time — Team portal" };

/** Fewer timed visits than this over four weeks is an owner's odd job, not a share of anybody's week. */
const MIN_VISITS = 10;

/**
 * Crew & vans › Drive time: the share of each person's working day spent on
 * the road over the last four full weeks, from ServiceTitan's own clock-ins —
 * dispatched to arrived is the drive, arrived to done is on site. Only visits
 * someone clocked in on count, so it's a share of the time we can see, not of
 * the whole week; a share holds up where a total wouldn't.
 */
export default async function DrivePage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Drive time" forWhom="the office" />;

  const [tools, pricingRow] = await Promise.all([onTheTools().catch(() => null), getSettings<unknown>("pricing").catch(() => null)]);
  const rate = normalisePricing(pricingRow).hourly;
  // The share is over visits with a drive recorded (see fourTimedOn); hours a
  // day are over every visit, which is what a day actually held.
  const everyone = (tools?.rows ?? []).filter((r) => r.field && r.fourTimed >= MIN_VISITS && r.fourTimedOn + r.fourTravel > 0)
    .map((r) => {
      const timed = r.fourTimedOn + r.fourTravel;
      const pct = (r.fourTravel / timed) * 100;
      const days = Math.max(1, r.fourDays);
      const over = Math.max(0, r.fourTravel - (timed * BENCH.drive.hi) / 100);
      return { name: r.name, ownVan: r.ownVan, pct, driveDay: r.fourTravel / days, siteDay: r.fourOn / days, days: r.fourDays, visits: r.fourVisits, timed: r.fourTimed, travel: r.fourTravel, timedOn: r.fourTimedOn, over };
    })
    .sort((a, b) => b.pct - a.pct);
  // Someone riding along is dispatched with their van, so their drive is the
  // driver's drive again, and it always comes out as long or longer. They get
  // their own list and stay out of the crew figures, which would otherwise
  // count each shared trip twice.
  const people = everyone.filter((p) => p.ownVan);
  const riders = everyone.filter((p) => !p.ownVan);

  const info: [string, string][] = [
    ["Drive time", "From ServiceTitan: dispatched to arrived on each visit is the drive, arrived to done is on site. The share is taken over visits where a drive was recorded; one dispatched the moment the tech arrived says nothing about the drive, so it's left out of the share."],
    ["The band", `${BENCH.drive.words} — ${BENCH.drive.why}.`],
    ["Hours over the band", "Every hour of driving above 25% of the day is an hour that could have been on a job."],
    ["Riding along", "Someone with no van of their own (set on their Pay, hours & leave) travels in someone else's, so they're listed apart and left out of the crew figures."],
  ];

  if (!people.length) {
    return (
      <PortalShell user={user}>
        <div className="pk">
          <Head title="Drive time" sub="Last four full weeks · ServiceTitan clock-ins" info={info} />
          <Empty>{riders.length ? "Nobody running their own van" : "Nobody on the tools"} has ten visits with the drive timed in the last four weeks, so there’s no drive time to show yet.</Empty>
        </div>
      </PortalShell>
    );
  }

  const drive = people.reduce((a, p) => a + p.travel, 0);
  const site = people.reduce((a, p) => a + p.timedOn, 0);
  const fleet = (drive / (drive + site)) * 100;
  const worst = people[0];
  const overH = Math.round(people.reduce((a, p) => a + p.over, 0));
  const worth = rate != null ? overH * rate : null;
  const fleetSt = benchStatus("drive", fleet, true);

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Drive time" sub="Last four full weeks · ServiceTitan clock-ins" info={info} />
        <Say>
          <b>{worst.name.split(" ")[0]} spends the most of the day on the road</b>: {Math.round(worst.pct)}%, about {worst.driveDay.toFixed(1)} hours a day.{" "}
          The crew is at {Math.round(fleet)}%{fleet > BENCH.drive.hi
            ? <>; <Bad>{overH} hours over the band{worth != null ? `, worth about ${money(worth)} at our rate` : ""}</Bad>.</>
            : ", inside the band."}
        </Say>
        <Grid cols={4}>
          <Tile label="Crew drive time" st={fleetSt} fig={`${Math.round(fleet)}%`} frac={fleet / 40} sub={`of the working day · aim ${BENCH.drive.words.split(" of")[0]}`} />
          <Tile label="Most on the road" st={benchStatus("drive", worst.pct, true)} fig={`${Math.round(worst.pct)}%`} frac={worst.pct / 40} sub={`${worst.name.split(" ")[0]} · ${worst.driveDay.toFixed(1)} hrs driving a day`} />
          <Tile label="Hours over the band" st={overH > 20 ? { k: "bad", w: "Routing" } : overH > 0 ? { k: "mid", w: "Watch it" } : { k: "good", w: "None" }} fig={`${overH} hrs`} frac={Math.min(1, overH / 80)} sub="over four weeks, across the crew" />
          <Tile label="Worth at our rate" st={rate == null ? none("No rate set") : { k: "none", w: "" }} fig={worth != null ? money(worth) : "—"} frac={worth != null ? Math.min(1, worth / 8000) : null} sub={rate != null ? `${money(rate)} an hour we could have billed` : "set the hourly rate in Pricing & costs › Rates & pricing"} />
        </Grid>
        <Card title="Drive time per van" aside="each person running their own van · longest first · the coloured part is driving">
          {people.map((p) => {
            const st = benchStatus("drive", p.pct, true);
            return (
              <Kv key={p.name} t={<b>{p.name}</b>}
                sub={`${p.driveDay.toFixed(1)} hrs driving · ${p.siteDay.toFixed(1)} hrs on site a day · ${p.visits} visits over ${p.days} days, ${p.timed} with the drive timed`}
                v={`${Math.round(p.pct)}%`}>
                <span className="pk-drive" aria-hidden="true"><i className={st.k} style={{ width: `${p.pct}%` }} /></span>
                <Pill st={st} />
              </Kv>
            );
          })}
        </Card>
        {riders.length > 0 && (
          <Card title="Riding along" aside="no van of their own · not in the crew figures">
            <p className="pk-note" style={{ marginBottom: 6 }}>
              These go where the van they&rsquo;re in goes, so their drive is that van&rsquo;s drive counted again, and it will always read as long or longer.
              Shown for the record; the van they ride in is the one to fix.
            </p>
            {riders.map((p) => (
              <Kv key={p.name} t={<b>{p.name}</b>}
                sub={`${p.driveDay.toFixed(1)} hrs driving · ${p.siteDay.toFixed(1)} hrs on site a day · ${p.visits} visits over ${p.days} days`}
                v={`${Math.round(p.pct)}%`}>
                <span className="pk-drive" aria-hidden="true"><i className="none" style={{ width: `${p.pct}%` }} /></span>
                <Pill st={{ k: "none", w: "Riding along" }} />
              </Kv>
            ))}
          </Card>
        )}
        <Card title="What usually fixes it">
          <Kv t={<b>Group jobs by suburb</b>} sub="Book Cranbourne jobs on Cranbourne days." />
          <Kv t={<b>Stock the van</b>} sub="A trip to the supplier mid-day is an hour. Factory stock and the van’s keep list are there to stop it." />
          <Kv t={<b>Say no to far-away one-offs</b>} sub="A small service an hour away costs more in driving than it earns." />
        </Card>
      </div>
    </PortalShell>
  );
}
