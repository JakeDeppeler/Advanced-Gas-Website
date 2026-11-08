import { Card, KpiHead, Pill, type Status } from "@/components/portal/kit/Kit";
import { dayLabel, ruleText, TRIGGERS } from "@/lib/weather-triggers/rules";
import type { Report, ReportFlag, ReportZone } from "@/lib/weather-triggers/report";
import type { DayWeather, Severity } from "@/lib/weather-triggers/types";

/**
 * Marketing › Weather targets, the view. Pure props, no fetching, so it can be
 * rendered on its own for a screenshot without a portal session.
 *
 * Every status here is a sign and a word as well as a colour: severity reads
 * "!! Strong" / "! Moderate", a zone with no forecast says "No forecast" and
 * never the "Nothing flagged" a checked, quiet zone shows: those two must not
 * be confusable from across the office.
 */

const SEV: Record<Severity, Status> = {
  strong: { k: "bad", w: "Strong", s: "!!" },
  moderate: { k: "mid", w: "Moderate", s: "!" },
};
const QUIET: Status = { k: "good", w: "Nothing flagged" };
const NO_FORECAST: Status = { k: "none", w: "No forecast", s: "?" };
const STALE: Status = { k: "none", w: "Forecast stale", s: "?" };

const STATUS_HEAD: Record<Report["status"], { st: Status; title: string }> = {
  ok: { st: { k: "good", w: "Forecast in" }, title: "Every zone checked" },
  partial: { st: { k: "mid", w: "Partial", s: "!" }, title: "Some zones have no forecast" },
  stale: { st: { k: "mid", w: "Stale", s: "!" }, title: "The forecast is old" },
  unavailable: { st: { k: "bad", w: "No forecast", s: "✕" }, title: "Couldn't check the weather" },
};

function when(f: ReportFlag): string {
  const span = f.from === f.to ? dayLabel(f.from) : `${dayLabel(f.from)} – ${dayLabel(f.to)}`;
  const lead = f.observed ? "after the storm" : f.leadDays <= 0 ? "now" : f.leadDays === 1 ? "tomorrow" : `in ${f.leadDays} days`;
  return `${span} · ${lead}`;
}

const melb = (iso: string) =>
  new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

function Outlook({ days }: { days: DayWeather[] }) {
  return (
    <ol className="wt-days" aria-label="Forecast, max and min">
      {days.slice(0, 6).map((d) => (
        <li key={d.date}>
          <span>{dayLabel(d.date).split(" ")[0]}</span>
          <b>{d.tmax == null ? "–" : `${Math.round(d.tmax)}°`}</b>
          <small>{d.tmin == null ? "–" : `${Math.round(d.tmin)}°`}</small>
        </li>
      ))}
    </ol>
  );
}

function ZoneCard({ z, flags }: { z: ReportZone; flags: ReportFlag[] }) {
  return (
    <article className="wt-zone">
      <header>
        <b>{z.name}</b>
        <span>{z.suburbs.length} suburbs · {z.radiusKm} km</span>
      </header>
      <div className="wt-chips">
        {z.weather === "unavailable" ? (
          <Pill st={NO_FORECAST} />
        ) : flags.length === 0 ? (
          <Pill st={z.weather === "stale" ? STALE : QUIET} />
        ) : (
          flags.map((f) => (
            <span key={f.id} className={`wt-chip ${f.severity}`}>
              <span aria-hidden="true">{SEV[f.severity].s}</span>
              {f.label}
              <em>{f.severity}</em>
            </span>
          ))
        )}
      </div>
      {z.weather === "unavailable" ? <p className="wt-err">{z.error}</p> : <Outlook days={z.outlook} />}
    </article>
  );
}

export function WeatherTargets({ report, jsonHref, csvHref }: { report: Report; jsonHref: string; csvHref: string }) {
  const usable = report.status === "ok" || report.status === "partial";
  const suburbCount = new Set(report.flags.flatMap((f) => f.suburbs.map((s) => s.slug))).size;
  const zonesOk = report.zones.filter((z) => z.weather === "ok").length;
  const head = STATUS_HEAD[report.status];
  const byZone = new Map<string, ReportFlag[]>();
  for (const f of report.flags) byZone.set(f.zoneId, [...(byZone.get(f.zoneId) ?? []), f]);

  return (
    <>
      <KpiHead
        title={<>Weather<br />targets</>}
        kpis={[
          // An unchecked forecast shows a dash, never a zero it didn't measure.
          { icon: "alert", fig: usable ? String(report.flags.length) : "—", label: "Flags live" },
          { icon: "tag", fig: usable ? String(suburbCount) : "—", label: "Suburbs to target" },
          { icon: "check", fig: `${zonesOk} of ${report.zones.length}`, label: "Zones forecast" },
        ]}
      />

      <div className={`wt-status ${report.status}`} role="status">
        <Pill st={head.st} />
        <div>
          <b>{head.title}</b>
          <span>
            {report.message}
            {report.forecastFetchedAt ? ` Forecast fetched ${melb(report.forecastFetchedAt)}, refreshed hourly.` : ""}
          </span>
        </div>
      </div>

      <p className="pk-note wt-intro">
        When the weather is about to send us work from part of the area, the suburbs are flagged here and the Google Ads Script
        raises bids there, or switches on the matching weather campaign. Flags clear themselves when the weather passes.
      </p>

      <div className="wt-zones">
        {report.zones.map((z) => <ZoneCard key={z.id} z={z} flags={byZone.get(z.id) ?? []} />)}
      </div>

      <Card title="What's flagged" aside={usable ? `${report.flags.length} flag${report.flags.length === 1 ? "" : "s"}` : "Not checked"} flush>
        {!usable ? (
          <p className="wt-empty">Nothing can be said until the forecast comes back. Ads are left as they were.</p>
        ) : report.flags.length === 0 ? (
          <p className="wt-empty">No zone&rsquo;s forecast trips a trigger. The weather campaigns stay paused and bids stay as set.</p>
        ) : (
          <div className="pk-tbl-wrap">
            <table className="pk-tbl wt-tbl">
              <thead>
                <tr><th>Severity</th><th>Push</th><th>Zone</th><th>When</th><th>Why</th><th>Suburbs</th></tr>
              </thead>
              <tbody>
                {report.flags.map((f) => (
                  <tr key={f.id}>
                    <td><Pill st={SEV[f.severity]} /></td>
                    <td><b>{f.service}</b><div className="ks">{f.label}</div></td>
                    <td>{f.zoneName}</td>
                    <td>{when(f)}</td>
                    <td className="wt-why">{f.reason}</td>
                    <td className="wt-subs">{f.suburbs.map((s) => `${s.name} ${s.postcode}`).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Into the ads" aside="No new logins">
        <p className="pk-note">
          The Google Ads Script reads <a href={jsonHref}>the JSON</a> every hour. For Meta, or a one-off in Google Ads,{" "}
          <a href={csvHref}>download the suburbs as a CSV</a> and paste the postcode column into the location&rsquo;s bulk add.
          Setup is in <code>docs/weather-ads/README.md</code>.
        </p>
      </Card>

      <Card title="The rules" aside="Starting thresholds, to tune against bookings" flush>
        <div className="pk-tbl-wrap">
          <table className="pk-tbl wt-tbl">
            <thead><tr><th>Trigger</th><th>Pushes</th><th>Fires when</th><th>Strong when</th></tr></thead>
            <tbody>
              {ruleText().map((r) => (
                <tr key={r.trigger}>
                  <td><b>{TRIGGERS[r.trigger].label}</b></td>
                  <td>{TRIGGERS[r.trigger].service}</td>
                  <td className="wt-why">{r.when}</td>
                  <td className="wt-why">{r.strong}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
