import { clock, type DayBands, type DayShape, type DayShapePerson } from "@/lib/portal/hours/dayShape";

const BANDS: Array<{ k: keyof DayBands; label: string; cls: string }> = [
  { k: "onSite", label: "On site", cls: "on" },
  { k: "drive", label: "Driving, clocked", cls: "drive" },
  { k: "between", label: "Between jobs", cls: "gap" },
  { k: "off", label: "Not on a job", cls: "off" },
];

const h1 = (n: number) => n.toFixed(1);
const dayWords = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

function Bar({ p, max, aim }: { p: DayShapePerson; max: number; aim: number }) {
  const w = (n: number) => `${(n / max) * 100}%`;
  const label = BANDS.map((b) => `${b.label} ${h1(p[b.k])} hrs`).join(", ");
  return (
    <span className="ds-bar" role="img" aria-label={label}>
      {BANDS.map((b) => (p[b.k] > 0.05 ? <i key={b.k} className={`ds-${b.cls}`} style={{ width: w(p[b.k]) }} /> : null))}
      <span className="ds-aim" style={{ left: w(aim) }} aria-hidden="true" />
    </span>
  );
}

/**
 * Hours › Where the day goes: each tech's average weekday cut into on site,
 * driving, between jobs and not on a job, with the first-job time beside it.
 * The bands are a navy family, labelled in the key and in each row's numbers,
 * so nothing rests on telling the colours apart.
 */
export function DayShapeCard({ shape, aim }: { shape: DayShape; aim: number }) {
  const { crew, people } = shape;
  if (!crew || !people.length) {
    return (
      <section className="pk-card ds" aria-labelledby="ds-h">
        <div className="hr-ph"><h2 id="ds-h">Where the day goes</h2></div>
        <p className="hr-note">No weekday clock-ins in the last four weeks to cut up.</p>
      </section>
    );
  }
  const rows = [crew, ...people];
  const max = Math.max(...rows.map((p) => Math.max(p.paidDay, p.onSite + p.drive + p.between + p.off)));
  const short = aim - crew.onSite;
  const late = people.filter((p) => p.start >= 9).sort((a, b) => b.start - a.start);

  return (
    <section className="pk-card ds" aria-labelledby="ds-h">
      <div className="hr-ph">
        <h2 id="ds-h">Where the day goes</h2>
        <span className="hr-dim">weekdays, {dayWords(shape.from)} to {dayWords(shape.to)}</span>
      </div>
      <p className="hr-note">
        Each tech&rsquo;s average weekday. On site is arrived to done; driving is dispatched to arrived; between jobs is the rest of the time from the first dispatch to the last job finished, the yard, the supplier, lunch and any drive nobody clocked; not on a job is the paid day left before the first job and after the last. The mark on each bar is the {aim} hours on site a day we price on.
      </p>
      <div className="ds-key" aria-hidden="true">
        {BANDS.map((b) => <span key={b.k}><i className={`ds-${b.cls}`} />{b.label}</span>)}
        <span><i className="ds-aimkey" />Aim, {aim} hrs on site</span>
      </div>
      <div className="hr-wrap">
        <table className="ds-t">
          <thead>
            <tr><th scope="col">Who</th><th scope="col">First job</th><th scope="col" className="ds-wide">The day</th><th scope="col">On site</th><th scope="col">Driving</th><th scope="col">Between</th><th scope="col">Not on a job</th></tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.name} className={i === 0 ? "ds-crew" : p.start >= 9 ? "ds-late" : undefined}>
                <th scope="row">{p.name}<span>{i === 0 ? `${people.length} techs · ${p.days} days` : `${p.days} days · ${h1(p.visits)} visits a day`}</span></th>
                <td>{clock(p.start)}{p.start >= 9 ? <span className="ds-flag">late start</span> : null}</td>
                <td className="ds-wide"><Bar p={p} max={max} aim={aim} /></td>
                <td><b>{h1(p.onSite)}</b> hrs</td>
                <td>{h1(p.drive)}</td>
                <td>{h1(p.between)}</td>
                <td>{h1(p.off)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {short > 0.25 && (
        <div className="ds-fix">
          <b>How to get the {h1(short)} hours back</b>
          <ol>
            <li>First job by 7:30. The crew&rsquo;s first dispatch is {clock(crew.start)} on average{late.length ? <>, and {late.map((p, j) => <span key={p.name}>{j ? (j === late.length - 1 ? " and " : ", ") : ""}{p.name.split(" ")[0]} {clock(p.start)}</span>)}</> : null}. An hour later to the first job is an hour off every day.</li>
            <li>Load the van and get the parts the afternoon before, or have the supplier deliver to site, so the morning isn&rsquo;t a supplier run.</li>
            <li>Book each tech&rsquo;s day close together: {h1(crew.drive)} hrs a day go on clocked driving and {h1(crew.between)} between jobs.</li>
            <li>Have the techs dispatch themselves when they leave, not when they arrive, so the drive is counted and this page can tell a drive from a wait.</li>
          </ol>
        </div>
      )}
    </section>
  );
}
