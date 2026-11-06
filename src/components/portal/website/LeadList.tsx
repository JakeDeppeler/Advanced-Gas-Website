import Link from "next/link";
import type { FormLead, LeadStage } from "@/lib/leads/jobLink";
import { Icon } from "@/components/portal/shell/Menu";
import { LeadButtons, LinkJob, RetryInline } from "./LeadActions";

export type LeadFilter = "all" | "unlinked" | "waiting" | "quoted" | "sold";

const ST_JOB = (id: number) => `https://go.servicetitan.com/#/Job/Index/${id}`;
const when = (iso: string) => {
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  const t = d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
  if (day(d) === day(new Date())) return `Today, ${t}`;
  if (day(d) === day(new Date(Date.now() - 86_400_000))) return `Yesterday, ${t}`;
  return `${d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Melbourne" }).replace(",", "")}, ${t}`;
};

export const inFilter = (f: LeadFilter, s: LeadStage | undefined) =>
  f === "all" ? true
  : f === "unlinked" ? !s?.linked
  : f === "waiting" ? !!s?.linked && !s.quoted
  : f === "quoted" ? !!s?.quoted && !s.sold
  : !!s?.sold;

/**
 * The four steps an enquiry goes through, as a bar of four: in, linked to
 * a job, quoted, sold. Each step is written out with a tick, or a "!" when
 * the quote is late, so the bar never rests on its colour alone.
 */
function Steps({ s }: { s: LeadStage }) {
  const steps: { w: string; on: boolean; late?: boolean }[] = [
    { w: "Form in", on: true },
    { w: "Job linked", on: s.linked },
    { w: s.lateBy != null ? "Quoted: late" : "Quoted", on: s.quoted, late: s.lateBy != null },
    { w: "Sold", on: s.sold },
  ];
  const at = steps.reduce((n, x, i) => (x.on ? i : n), 0);
  return (
    <ol className="wl-steps" aria-label="Where it's up to">
      {steps.map((x, i) => (
        <li key={x.w} className={`${x.on ? "on" : ""}${x.late ? " late" : ""}${i === at ? " at" : ""}`}>
          <i aria-hidden="true" />
          <span>{x.on ? "✓ " : x.late ? "! " : ""}{x.w}</span>
        </li>
      ))}
    </ol>
  );
}

/** What happened when the form and photos went onto the job. */
function UploadLine({ l }: { l: FormLead }) {
  const u = l.upload;
  if (!l.stJobId || !u || u.jobId !== l.stJobId) return null;
  const photos = u.files.filter((f) => /photo/i.test(f)).length;
  if (u.ok) return <span className="wl-said"><span aria-hidden="true">✓</span> The form{photos ? ` and ${photos} ${photos === 1 ? "photo" : "photos"}` : ""} put on job {l.stJobNumber} in ServiceTitan</span>;
  return <><span className="wl-said bad"><Icon name="alert" size={13} /> Didn&rsquo;t all go onto the job: {u.error}</span><RetryInline id={l.id} /></>;
}

function Thumbs({ l, urls, big }: { l: FormLead; urls: Map<string, string>; big?: boolean }) {
  if (!l.photoPaths.length) {
    return <span className="wl-nophoto">{l.photoCount ? `${l.photoCount} ${l.photoCount === 1 ? "photo" : "photos"}, emailed only` : "No photos"}</span>;
  }
  return (
    <span className={`wl-thumbs${big ? " big" : ""}`}>
      {l.photoPaths.map((p, i) => {
        const u = urls.get(p);
        // A plain link to the signed URL: it's private storage, an hour long.
        return u ? (
          <a key={p} href={u} target="_blank" rel="noreferrer" aria-label={`Photo ${i + 1} from ${l.name ?? "the customer"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- an hour-long signed URL to private storage: nothing the image optimiser could cache */}
            <img src={u} alt="" loading="lazy" />
          </a>
        )
          : <span key={p} className="wl-ph" aria-label="Photo couldn't be loaded" />;
      })}
    </span>
  );
}

/**
 * Every quote form, newest first: who and what, when, the photos, and the
 * ServiceTitan job it's linked to or a box to link one. Once linked, the
 * four steps it's gone through, and whether the form and photos made it
 * onto the job. Each opens to the whole form.
 */
export function LeadList({ leads, stages, urls, filter, hrefFor }: {
  leads: FormLead[]; stages: Map<string, LeadStage>; urls: Map<string, string>; filter: LeadFilter;
  hrefFor: (f: LeadFilter) => string;
}) {
  const count = (f: LeadFilter) => leads.filter((l) => inFilter(f, stages.get(l.id))).length;
  const chips: [LeadFilter, string][] = [["all", "All"], ["unlinked", "Not linked"], ["waiting", "Waiting on a quote"], ["quoted", "Quoted"], ["sold", "Sold"]];
  const shown = leads.filter((l) => inFilter(filter, stages.get(l.id)));
  const FIRST = 12;
  const row = (l: FormLead) => {
    const s = stages.get(l.id) ?? { linked: false, quoted: false, sold: false, lateBy: null };
    const form: [string, string | null][] = [
      ["What for", l.headline ?? l.service], ["The detail", l.summary], ["Their message", l.notes],
      ["Phone", l.phone], ["Email", l.email], ["Address", l.address],
      ["Suburb", [l.suburb, l.postcode].filter(Boolean).join(" ") || null],
      ["Came from", [l.cameFrom, l.pagePath].filter(Boolean).join(", ")],
    ];
    return (
      <li key={l.id} className={`wl-li${s.linked ? " linked" : ""}`}>
        <details className="wl-d">
          <summary>
            <span className="wl-who">
              <b>{l.name ?? "No name"}{l.suburb || l.postcode ? ` · ${l.suburb ?? l.postcode}` : ""}</b>
              <span>Quote form: {l.headline ?? l.service ?? "no detail"}</span>
            </span>
            <span className="wl-when">{when(l.createdAt)}</span>
            <Thumbs l={l} urls={urls} />
            {s.linked && (
              <span className="wl-track">
                <Steps s={s} />
                <span className="wl-lines">
                  {s.lateBy != null && <span className="wl-said bad"><Icon name="alert" size={13} /> No quote {s.lateBy} days after the visit</span>}
                  <UploadLine l={l} />
                </span>
              </span>
            )}
          </summary>
          <div className="wl-body">
            <div>
              <h3>The form</h3>
              <dl className="wl-form">
                {form.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
            </div>
            <div>
              <h3>Photos{l.photoPaths.length ? ` · ${l.photoPaths.length}` : ""}</h3>
              <Thumbs l={l} urls={urls} big />
              {!l.photoPaths.length && l.photoCount > 0 && <p className="wl-note">These came in before the portal kept the form&rsquo;s photos: they&rsquo;re in the office inbox, on the email for this enquiry.</p>}
              <span className="wl-acts">
                {l.stJobId && <a className="pk-btn g" href={ST_JOB(l.stJobId)} target="_blank" rel="noreferrer">Job {l.stJobNumber} in ServiceTitan ↗</a>}
                {l.stJobId && <LeadButtons id={l.id} unlink retry={false} />}
              </span>
            </div>
          </div>
        </details>
        <div className="wl-right">
          {l.stJobId
            ? <span className="wl-chip"><Icon name="tag" size={13} />Job {l.stJobNumber}</span>
            : <LinkJob id={l.id} who={l.name ?? "this enquiry"} />}
        </div>
      </li>
    );
  };
  return (
    <section className="wl" aria-label="Every form sent from the website">
      <nav className="wl-chips" aria-label="Show">
        {chips.map(([k, w]) => <Link key={k} href={hrefFor(k)} className={filter === k ? "on" : undefined} aria-current={filter === k ? "true" : undefined}>{w} · {count(k)}</Link>)}
      </nav>
      <div className="pk-card wl-card">
        {shown.length ? (
          <>
            <ul className="wl-list">{shown.slice(0, FIRST).map(row)}</ul>
            {shown.length > FIRST && (
              <details className="wl-more">
                <summary>Show {shown.length - FIRST} more</summary>
                <ul className="wl-list">{shown.slice(FIRST).map(row)}</ul>
              </details>
            )}
          </>
        ) : <p className="wl-empty">{filter === "all" ? "No forms sent from the website in this window." : "None of those in this window."}</p>}
      </div>
    </section>
  );
}
