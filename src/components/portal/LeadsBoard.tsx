"use client";

import Link from "next/link";
import { site } from "@/lib/site";
import type { WebLead } from "@/lib/portal/db";
import { classifyLead, CHANNEL_ORDER, type Channel } from "@/lib/portal/leadSource";
import { BANDS, type AreaRow, type Band } from "@/lib/portal/leadArea";
import type { PageReport } from "@/lib/portal/leadPages";

const RANGES = [
  { d: 30, label: "30 days" },
  { d: 90, label: "90 days" },
  { d: 365, label: "12 months" },
];

const day = (iso: string) => iso.slice(0, 10);

function rank<T extends string>(rows: { k: T }[], top = 8): { k: T; n: number; share: number }[] {
  const m = new Map<T, number>();
  for (const r of rows) m.set(r.k, (m.get(r.k) ?? 0) + 1);
  const total = rows.length || 1;
  return [...m.entries()]
    .map(([k, n]) => ({ k, n, share: n / total }))
    .sort((a, b) => b.n - a.n)
    .slice(0, top);
}

/**
 * Melbourne time, not the reader's. Everything in the table is stored in UTC
 * and the only clock that matters is the one in the van.
 */
const MEL = "Australia/Melbourne";
const melParts = (iso: string) => {
  const f = new Intl.DateTimeFormat("en-AU", { timeZone: MEL, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  const parts = f.formatToParts(new Date(iso));
  const wd = parts.find((x) => x.type === "weekday")?.value ?? "";
  const hr = Number(parts.find((x) => x.type === "hour")?.value ?? "0");
  const mi = Number(parts.find((x) => x.type === "minute")?.value ?? "0");
  return { wd, hr, min: hr * 60 + mi };
};
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/**
 * The hours somebody is on the tools, read from site.ts so the site, the job
 * calculator and this report cannot drift apart again.
 *
 * Counted in minutes, not hours. The business closes at 15:30, and bucketing
 * by the hour forces a choice between calling the whole 15:00 hour open (which
 * counted every 15:45 enquiry as in-hours — the bug this replaces) or calling
 * it all closed (which writes off half an hour of real work time). With the
 * timestamp already in hand there is no reason to round at all.
 *
 * The bar chart below still draws in hours, because a chart of 1,440 minutes
 * is not a chart. Its shading marks the hours the business is open for any
 * part of, which is a fair thing for a bar to say and a bad thing for a count
 * to say.
 */
const toMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
const OPEN_MIN = toMins(site.hours[0].open);
const CLOSE_MIN = toMins(site.hours[0].close);
const OPEN_FROM = Math.floor(OPEN_MIN / 60);
const OPEN_TO = Math.ceil(CLOSE_MIN / 60);
const openLabel = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hr}:${String(m).padStart(2, "0")}${suffix}` : `${hr}${suffix}`;
};

export function LeadsBoard({ leads, days, area, pages: pageReport, dbReady }: {
  leads: WebLead[];
  days: number;
  /** False when the database is unreachable — an empty list then means "we
   *  cannot tell", which is a different sentence from "nobody enquired". */
  dbReady: boolean;
  /** Where they came from, worked out on the server. */
  area: { rows: AreaRow[]; byBand: Record<Band, number>; total: number };
  /** Which pages earn and which sit there, worked out on the server: it reads
   *  the sitemap, which pulls in every suburb and brand module. */
  pages: PageReport;
}) {
  const quotes = leads.filter((l) => l.kind === "quote");
  const calls = leads.filter((l) => l.kind === "call");

  // A day at a time, so a quiet fortnight looks like a quiet fortnight.
  const byDay = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) byDay.set(day(new Date(Date.now() - i * 86_400_000).toISOString()), 0);
  for (const l of leads) {
    const k = day(l.createdAt);
    if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }
  const series = [...byDay.entries()];
  const peak = Math.max(1, ...series.map(([, n]) => n));
  const perWeek = leads.length / (days / 7);

  const services = rank(quotes.filter((l) => l.service).map((l) => ({ k: l.service as string })));

  // When they come in, in Melbourne time. Day of the week says which days are
  // worth being reachable on; the open/closed split says whether the after-
  // hours line is carrying real work or just voicemail.
  const clock = leads.map((l) => melParts(l.createdAt));
  const byDow = DOW.map((d) => ({ d, n: clock.filter((c) => c.wd === d).length }));
  const dowPeak = Math.max(1, ...byDow.map((x) => x.n));
  const afterHours = clock.filter((c) => c.min < OPEN_MIN || c.min >= CLOSE_MIN).length;
  const weekend = clock.filter((c) => c.wd === "Sat" || c.wd === "Sun").length;
  const byHour = Array.from({ length: 24 }, (_, h) => ({ h, n: clock.filter((c) => c.hr === h).length }));
  const hourPeak = Math.max(1, ...byHour.map((x) => x.n));

  const earning = pageReport.rows.filter((r) => r.n > 0);
  const topPage = earning[0];

  // Every lead sorted into one channel, and the quote-vs-call split kept for
  // each: a source that only ever produces phone taps is a different kind of
  // source to one that produces filled-in forms.
  const tagged = leads.map((l) => ({ lead: l, src: classifyLead(l.utm) }));
  const byChannel = CHANNEL_ORDER.map((ch) => {
    const rows = tagged.filter((t) => t.src.channel === ch);
    if (!rows.length) return null;
    return {
      ch,
      label: rows[0].src.label.replace(/^Campaign: .*/, "Tagged campaigns").replace(/^Link from .*/, "Links from other sites"),
      n: rows.length,
      share: rows.length / leads.length,
      paid: rows[0].src.paid,
      certain: rows.every((r) => r.src.certain),
      quotes: rows.filter((r) => r.lead.kind === "quote").length,
      calls: rows.filter((r) => r.lead.kind === "call").length,
    };
  }).filter(Boolean) as { ch: Channel; label: string; n: number; share: number; paid: boolean; certain: boolean; quotes: number; calls: number }[];

  const paidN = tagged.filter((t) => t.src.paid).length;
  const fbN = tagged.filter((t) => t.src.channel === "facebook-ad").length;
  const fbAny = tagged.filter((t) => ["facebook-ad", "facebook", "instagram"].includes(t.src.channel)).length;
  const unknownN = tagged.filter((t) => t.src.channel === "direct").length;

  // Campaigns, when the links were tagged with one.
  const campaigns = rank(tagged.filter((t) => t.src.campaign).map((t) => ({ k: t.src.campaign as string })), 6);

  return (
    <div className="pt-fin">
      <div className="pt-ov__tf pt-pl__tf">
        {RANGES.map((r) => (
          <Link key={r.d} href={`/portal/finance/leads?d=${r.d}`} scroll={false} className={`pt-ov__tfbtn${days === r.d ? " is-on" : ""}`}>{r.label}</Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="pt-note">
          {dbReady ? (
            <>
              {/* "Tracking went live just now" was true the week it shipped and
                  gets less true every day after. What matters is the window
                  being read, which is on screen above. */}
              <strong>Nothing in the last {days} days.</strong> Enquiries land here as they come through — widen the
              window above, or give it a few days before reading anything into it.
            </>
          ) : (
            <>
              <strong>Leads can&rsquo;t be read right now.</strong> This is empty because the database is unreachable,
              not because nobody enquired.
            </>
          )}
        </div>
      ) : (
        <>
          <div className="pt-cap__strip">
            <div className="pt-cap__stripcell"><span>Enquiries</span><strong>{leads.length}</strong><small>over {days} days</small></div>
            <div className="pt-cap__stripcell"><span>Quote requests</span><strong>{quotes.length}</strong><small>filled in the form</small></div>
            <div className="pt-cap__stripcell"><span>Phone taps</span><strong>{calls.length}</strong><small>tapped the number</small></div>
            <div className="pt-cap__stripcell"><span>A week</span><strong>{perWeek.toFixed(1)}</strong><small>on average</small></div>
            <div className="pt-cap__stripcell"><span>From paid ads</span><strong>{paidN}</strong><small>{Math.round((paidN / leads.length) * 100)}% of the lot</small></div>
            <div className="pt-cap__stripcell"><span>Facebook ads</span><strong>{fbN}</strong><small>{fbAny - fbN > 0 ? `${fbAny - fbN} more from Facebook, untagged` : "by click ID or tag"}</small></div>
            <div className="pt-cap__stripcell"><span>Source unknown</span><strong>{unknownN}</strong><small>{Math.round((unknownN / leads.length) * 100)}% arrived with nothing on them</small></div>
            <div className="pt-cap__stripcell"><span>Pages earning</span><strong>{pageReport.earningPages}</strong><small>of {pageReport.totalPages} pages on the site</small></div>
            <div className="pt-cap__stripcell"><span>Busiest page</span><strong>{topPage ? topPage.n : 0}</strong><small>{topPage ? topPage.title : "nothing yet"}</small></div>
            <div className="pt-cap__stripcell"><span>Outside 7–4</span><strong>{afterHours}</strong><small>{Math.round((afterHours / leads.length) * 100)}% came in when nobody is on the tools</small></div>
            <div className="pt-cap__stripcell"><span>Over 45 min away</span><strong>{area.byBand.haul}</strong><small>{Math.round((area.byBand.haul / Math.max(1, area.total)) * 100)}% of the lot, before a tool comes out</small></div>
            <div className="pt-cap__stripcell"><span>Half an hour or less</span><strong>{area.byBand.core}</strong><small>the patch, where a callout costs nothing</small></div>
          </div>

          <section className="pt-panel">
            <h2 className="pt-panel__h">Day by day</h2>
            <div className="pt-lead__bars">
              {series.map(([d, n]) => (
                <span key={d} className={`pt-lead__bar${n === 0 ? " is-none" : ""}`} style={{ height: `${(n / peak) * 100}%` }} title={`${d} · ${n}`} />
              ))}
            </div>
            <div className="pt-lead__axis"><span>{series[0]?.[0]}</span><span>{series[series.length - 1]?.[0]}</span></div>
          </section>

          <section className="pt-panel">
            <h2 className="pt-panel__h">Which part of the site earns</h2>
            <p className="pt-panel__sub">
              Every page on the site, sorted into the ten things it could be, against the enquiries that came out of
              it. <strong>Per page</strong> is the column that matters: it is the only one that lets a section of
              seventy-three suburb pages be compared with a section of one, and it is the number that says whether a
              whole programme of pages is pulling its weight.
            </p>
            <div className="pt-tgt__tablewrap">
              <table className="pt-tgt__table pt-lead__chan">
                <thead>
                  <tr><th>Section</th><th>Pages</th><th>Earning</th><th>Enquiries</th><th>Per page</th><th>Form</th><th>Phone</th></tr>
                </thead>
                <tbody>
                  {[...pageReport.sections].sort((a, b) => b.perPage - a.perPage || b.n - a.n).map((sec) => (
                    <tr key={sec.key} className={sec.n === 0 && sec.pages > 3 ? "is-key" : undefined}>
                      <th scope="row">
                        <strong>{sec.label}</strong>
                        <span>{sec.note}</span>
                      </th>
                      <td>{sec.pages}</td>
                      <td>{sec.earning}</td>
                      <td>{sec.n}</td>
                      <td>{sec.perPage ? sec.perPage.toFixed(2) : "—"}</td>
                      <td>{sec.quotes}</td>
                      <td>{sec.calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pt-panel">
            <h2 className="pt-panel__h">The pages that earn</h2>
            <p className="pt-panel__sub">
              The page the enquiry was made on. Expect <strong>Get a quote</strong> near the top and do not read much
              into it: it is the page the form lives on, not the page that convinced anybody. The list under it —
              where the visit started — is the one that says what did the convincing.
            </p>
            {earning.length === 0 ? (
              <div className="pf-empty">No page has produced an enquiry in this window.</div>
            ) : (
              <div className="pt-tgt__tablewrap">
                <table className="pt-tgt__table pt-lead__chan">
                  <thead>
                    <tr><th>Page</th><th>Enquiries</th><th>Share</th><th>Form</th><th>Phone</th></tr>
                  </thead>
                  <tbody>
                    {earning.slice(0, 20).map((r) => (
                      <tr key={r.path}>
                        <th scope="row">
                          <strong>{r.title}</strong>
                          <span>{r.sectionLabel} · {r.path}</span>
                        </th>
                        <td>{r.n}</td>
                        <td>{Math.round(r.share * 100)}%</td>
                        <td>{r.quotes}</td>
                        <td>{r.calls}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {earning.length > 20 && (
              <p className="pt-tgt__note" style={{ marginTop: 12 }}>
                Showing the twenty busiest of {earning.length} pages that produced something.
              </p>
            )}
          </section>

          <section className="pt-panel">
            <h2 className="pt-panel__h">Where the visit started</h2>
            <p className="pt-panel__sub">
              The first page of the visit, for the visits that ended in an enquiry. A guide that never takes an
              enquiry itself but lands a third of the traffic that does is earning its keep, and until this was
              recorded it looked like it was doing nothing at all.
            </p>
            {pageReport.landingsKnown === 0 ? (
              <div className="pf-empty">
                Not recorded yet. Landing pages started being captured on the deploy that added this panel, so this
                fills in from the next enquiry onwards — the older leads in this window have no landing page on them
                and never will.
              </div>
            ) : (
              <>
                <div className="pt-pl__spend" style={{ marginTop: 12 }}>
                  {pageReport.landings.map((x) => (
                    <div key={x.path} className="pt-pl__spendrow">
                      <span className="pt-pl__spendlabel">{x.title}</span>
                      <span className="pt-pl__spendbar" aria-hidden="true"><i style={{ width: `${Math.max(2, x.share * 100)}%` }} /></span>
                      <span className="pt-pl__spendamt">{x.n}</span>
                      <span className="pt-pl__spendpct">{Math.round(x.share * 100)}%</span>
                    </div>
                  ))}
                </div>
                {pageReport.landingsKnown < leads.length && (
                  <p className="pt-tgt__note" style={{ marginTop: 12 }}>
                    {pageReport.landingsKnown} of {leads.length} enquiries in this window have a landing page on them.
                    The rest were recorded before this was captured.
                  </p>
                )}
              </>
            )}
          </section>

          <section className="pt-panel">
            <h2 className="pt-panel__h">The pages that earn nothing</h2>
            <p className="pt-panel__sub">
              {pageReport.silentCount} of {pageReport.totalPages} pages produced no enquiry in this window. Named
              below are the ones where that is worth knowing: services, prices, hot water, commercial, water
              filtration, the calculators. Suburb pages, brand pages, guides and fault codes are counted but not
              listed — there are hundreds of them, and somebody looking up what E5 means is not shopping.
            </p>
            <p className="pt-tgt__warn">
              Read this carefully. It counts enquiries, not visits, so a page with nothing against it is either a page
              nobody read or a page everybody read and nobody acted on — and from here the two look the same. Take a
              name off this list and go and look it up in Vercel Analytics before concluding anything. A page with
              traffic and no enquiries needs rewriting. A page with no traffic needs linking to.
            </p>
            {pageReport.silent.length === 0 ? (
              <div className="pf-empty">Every page in those sections produced at least one enquiry.</div>
            ) : (
              <div className="pt-lead__silent">
                {pageReport.silent.map((x) => (
                  <a key={x.path} href={x.path} target="_blank" rel="noreferrer" className="pt-lead__silentrow">
                    <b>{x.title}</b>
                    <span>{x.sectionLabel}</span>
                    <em>{x.path}</em>
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className="pt-panel">
            <h2 className="pt-panel__h">When they come in</h2>
            <p className="pt-panel__sub">
              Melbourne time. The working day is {openLabel(site.hours[0].open)} to {openLabel(site.hours[0].close)}, so everything outside it is somebody enquiring
              when there is nobody standing next to a phone — {afterHours} of {leads.length} of them, and {weekend} on
              a weekend.
            </p>
            <div className="pt-lead__dow">
              {byDow.map((d) => (
                <div key={d.d} className="pt-lead__dowcell">
                  <span className="pt-lead__dowbar"><i style={{ height: `${(d.n / dowPeak) * 100}%` }} /></span>
                  <strong>{d.n}</strong>
                  <small>{d.d}</small>
                </div>
              ))}
            </div>
            <div className="pt-lead__hours">
              {byHour.map((x) => (
                <span
                  key={x.h}
                  className={`pt-lead__hour${x.h >= OPEN_FROM && x.h < OPEN_TO ? " is-open" : ""}`}
                  title={`${String(x.h).padStart(2, "0")}:00 · ${x.n}`}
                >
                  <i style={{ height: `${(x.n / hourPeak) * 100}%` }} />
                </span>
              ))}
            </div>
            <div className="pt-lead__axis"><span>midnight</span><span>noon</span><span>midnight</span></div>
          </section>

          <div className="pt-fin__cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <section className="pt-panel" style={{ margin: 0 }}>
              <h2 className="pt-panel__h">What they want</h2>
              <div className="pt-pl__spend" style={{ marginTop: 12 }}>
                {services.length === 0 ? <div className="pf-empty">No quote requests yet.</div> : services.map((x) => (
                  <div key={x.k} className="pt-pl__spendrow">
                    <span className="pt-pl__spendlabel">{x.k}</span>
                    <span className="pt-pl__spendbar" aria-hidden="true"><i style={{ width: `${Math.max(2, x.share * 100)}%` }} /></span>
                    <span className="pt-pl__spendamt">{x.n}</span>
                    <span className="pt-pl__spendpct">{Math.round(x.share * 100)}%</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="pt-panel" style={{ margin: 0 }}>
              <h2 className="pt-panel__h">Campaigns</h2>
              <p className="pt-panel__sub">Only the links that were tagged with a campaign name turn up here.</p>
              <div className="pt-pl__spend" style={{ marginTop: 12 }}>
                {campaigns.length === 0 ? (
                  <div className="pf-empty">No tagged campaigns in this window.</div>
                ) : campaigns.map((x) => (
                  <div key={x.k} className="pt-pl__spendrow">
                    <span className="pt-pl__spendlabel">{x.k}</span>
                    <span className="pt-pl__spendbar" aria-hidden="true"><i style={{ width: `${Math.max(2, x.share * 100)}%` }} /></span>
                    <span className="pt-pl__spendamt">{x.n}</span>
                    <span className="pt-pl__spendpct">{Math.round(x.share * 100)}%</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="pt-panel">
            <h2 className="pt-panel__h">Where they came from</h2>
            <p className="pt-panel__sub">
              Read off the click ID the ad platform adds, the tags on the link, then the site that sent them, in that
              order. A click ID is the most reliable of the three because Facebook and Google add it themselves at the
              moment of the click, whether or not the ad was tagged.
            </p>
            <div className="pt-tgt__tablewrap">
              <table className="pt-tgt__table pt-lead__chan">
                <thead>
                  <tr><th>Channel</th><th>Enquiries</th><th>Share</th><th>Form</th><th>Phone</th></tr>
                </thead>
                <tbody>
                  {byChannel.map((c) => (
                    <tr key={c.ch} className={c.paid ? "is-key" : undefined}>
                      <th scope="row">
                        <strong>{c.label}</strong>
                        <span>{c.paid ? "Somebody paid for this click" : c.certain ? "" : "Best guess, nothing on the link to be sure"}</span>
                      </th>
                      <td>{c.n}</td>
                      <td>{Math.round(c.share * 100)}%</td>
                      <td>{c.quotes}</td>
                      <td>{c.calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {unknownN > 0 && (
              <p className="pt-tgt__warn">
                {unknownN} of {leads.length} arrived with nothing on them at all: no tag, no click ID, no referring
                site. Some of that is people typing the address in or coming back to a bookmark. Some of it is a
                browser stripping the referrer. Tag the links in your ads and that number comes down.
              </p>
            )}
          </section>

          <section className="pt-panel">
            <h2 className="pt-panel__h">How far away they are</h2>
            <p className="pt-panel__sub">
              In drive time, not kilometres. A radius is a circle and Melbourne is not: thirty-six kilometres
              south-east is half an hour down the highway, and thirty-six north-west is an hour in traffic. The site
              advertises 75&nbsp;km, which reaches past the city, so this is the honest read of how far the van
              actually goes.
            </p>

            <div className="pt-lead__bands">
              {BANDS.map((b) => {
                const n = area.byBand[b.key];
                return (
                  <div key={b.key} className={`pt-lead__band is-${b.key}`}>
                    <strong>{n}</strong>
                    <span>{b.label}</span>
                    <small>{b.note}</small>
                  </div>
                );
              })}
            </div>

            <div className="pt-tgt__tablewrap" style={{ marginTop: 22 }}>
              <table className="pt-tgt__table pt-lead__chan">
                <thead>
                  <tr><th>Suburb</th><th>Drive</th><th>Distance</th><th>Enquiries</th><th>Form</th><th>Phone</th></tr>
                </thead>
                <tbody>
                  {area.rows.slice(0, 14).map((r) => (
                    <tr key={`${r.name}-${r.band}`} className={r.band === "haul" ? "is-key" : undefined}>
                      <th scope="row">
                        <strong>{r.name}</strong>
                        <span>{r.postcode ?? ""}</span>
                      </th>
                      <td>{r.driveMax != null ? `${r.driveMax} min` : "—"}</td>
                      <td>{r.km != null ? `${r.km} km` : "—"}</td>
                      <td>{r.n}</td>
                      <td>{r.quotes}</td>
                      <td>{r.calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {area.rows.length > 14 && (
              <p className="pt-tgt__note" style={{ marginTop: 12 }}>
                Showing the fourteen busiest of {area.rows.length} places.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
