import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The prototype's page parts, as components: every rebuilt page is a title,
 * its own sub-tabs, one sentence that says how it's going, then a main block.
 * Styles are the .pk-* rules in shell.css.
 *
 * Status is colour *and* a sign and a word (✓ On track, ! Close, ▼ Behind), so
 * colour is never the only signal.
 */

export type Tone = "good" | "mid" | "bad" | "none";
/** `s` replaces the tone's sign where the word is a direction: "▲ Up" is bad news for a cost. */
export type Status = { k: Tone; w: string; s?: string };
const SIGN: Record<Tone, string> = { good: "✓", mid: "!", bad: "▼", none: "" };

/**
 * The prototype's status rule. Money and counts go by ratio — at or over goal
 * is good, within 10% is close; percentages by points, within two is close.
 * `lower` is for things that should be small, like overdue or overheads.
 */
export function status(actual: number, goal: number, o: { pts?: boolean; lower?: boolean } = {}): Status {
  let k: Tone;
  if (o.pts) {
    const d = o.lower ? goal - actual : actual - goal;
    k = d >= -0.05 ? "good" : d >= -2.05 ? "mid" : "bad";
  } else {
    const r = o.lower ? (actual ? goal / actual : 1) : goal ? actual / goal : 1;
    k = r >= 1 ? "good" : r >= 0.9 ? "mid" : "bad";
  }
  const ahead = !o.pts && !o.lower && goal > 0 && actual / goal >= 1.1;
  const w = k === "good" ? (ahead ? "Ahead" : "On track") : k === "mid" ? (o.lower ? "Watch it" : "Close") : o.lower ? "Too high" : "Behind";
  return { k, w };
}
export const none = (w = "No goal yet"): Status => ({ k: "none", w });

export function Pill({ st }: { st: Status }) {
  return (
    <span className={`pk-st ${st.k}`}>
      {st.s ?? SIGN[st.k] ? <span aria-hidden="true">{st.s ?? SIGN[st.k]}</span> : <i aria-hidden="true" />}
      {st.w}
    </span>
  );
}

/** The page's title and the line under it; "What does this mean?" opens the plain words. */
export function Head({ title, sub, info }: { title: string; sub?: ReactNode; info?: [string, ReactNode][] }) {
  return (
    <div className="pk-head">
      <div>
        {title && <h1>{title}</h1>}
        {sub && <div className="pk-sub">{sub}</div>}
      </div>
      {info && info.length > 0 && (
        <details className="pk-info">
          <summary><span aria-hidden="true">i</span>What does this mean?</summary>
          <div className="pk-infop">
            {info.map(([t, d]) => <div key={t}><b>{t}</b>{d}</div>)}
          </div>
        </details>
      )}
    </div>
  );
}

export type TabItem = { key: string; label: string; href: string; count?: number; red?: boolean };

/** A page's own sub-tabs, as links so each is an address you can send someone. */
export function Tabs({ items, on, label = "Views" }: { items: TabItem[]; on: string; label?: string }) {
  return (
    <nav className="pk-seg" aria-label={label}>
      {items.map((t) => (
        <Link key={t.key} href={t.href} className={t.key === on ? "on" : undefined} aria-current={t.key === on ? "page" : undefined}>
          {t.label}
          {t.count ? <span className={`c${t.red ? " r" : ""}`}>{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

/** The one sentence. Wrap the bad part in <Bad> and the good in <Good>. */
export const Say = ({ children }: { children: ReactNode }) => <p className="pk-say">{children}</p>;
export const Bad = ({ children }: { children: ReactNode }) => <span className="b">{children}</span>;
export const Good = ({ children }: { children: ReactNode }) => <span className="g">{children}</span>;

const pct = (f: number) => `${Math.max(0, Math.min(1, f)) * 100}%`;

/**
 * A big figure with a bar: the dark one leads the page, the light one sits
 * beside it. Given a status it takes the status's colour — green,
 * gold or red, with the word on it — instead of the plain black or white box.
 */
export function Hero({ label, right, fig, frac, sub, dark, href, st }: { label: string; right?: string; fig: string; frac: number | null; sub?: ReactNode; dark?: boolean; href?: string; st?: Status }) {
  const body = (
    <>
      <div className="pk-hl"><span>{label}{st && st.k !== "none" ? <> <Pill st={st} /></> : null}</span>{right && <span>{right}</span>}</div>
      <div className="pk-hf">{fig}</div>
      <div className="pk-hb" aria-hidden="true"><i style={{ width: frac == null ? 0 : pct(frac) }} /></div>
      {sub && <div className="pk-hs">{sub}</div>}
    </>
  );
  const cls = `pk-hero${dark ? "" : " light"}${st && st.k !== "none" ? ` st-${st.k}` : ""}`;
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

export const Pair = ({ children }: { children: ReactNode }) => <div className="pk-pair">{children}</div>;
export const Grid = ({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 }) => <div className={`pk-grid${cols}`}>{children}</div>;
export const Two = ({ children }: { children: ReactNode }) => <div className="pk-two">{children}</div>;

/**
 * A tile: what it is and how it's going, the figure, a bar, and what it's
 * against. `on` marks the one picked, where a row of tiles chooses what's
 * shown under it.
 */
export function Tile({ label, st, fig, frac, sub, href, on }: { label: string; st: Status; fig: string; frac: number | null; sub?: ReactNode; href?: string; on?: boolean }) {
  const body = (
    <>
      <div className="pk-tl"><span>{label}</span>{st.w ? <Pill st={st} /> : null}</div>
      <div className="pk-fig">{fig}</div>
      <div className={`pk-bar ${st.k}`} aria-hidden="true"><i style={{ width: frac == null ? 0 : pct(Math.max(0.02, frac)) }} /></div>
      {sub && <div className="pk-ks">{sub}</div>}
    </>
  );
  const cls = `pk-card pk-tile${on ? " on" : ""}`;
  return href
    ? <Link href={href} className={`${cls} pk-link`} aria-current={on ? "true" : undefined}>{body}</Link>
    : <div className={cls}>{body}</div>;
}

export function Card({ title, aside, children, flush }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <section className={`pk-card${flush ? "" : " pk-pad"}`}>
      {(title || aside) && <div className="pk-card-h">{title && <b>{title}</b>}{aside && <span>{aside}</span>}</div>}
      {children}
    </section>
  );
}

/** A label over a group of rows. */
export const Lh = ({ children }: { children: ReactNode }) => <div className="pk-lh">{children}</div>;
export const Group = ({ children }: { children: ReactNode }) => <div className="pk-grp">{children}</div>;

/** One row of a grouped list: something in front, a title and a line, something at the end. */
export function Row({ lead, title, sub, end, href }: { lead?: ReactNode; title: ReactNode; sub?: ReactNode; end?: ReactNode; href?: string }) {
  const body = (
    <>
      {lead}
      <span className="t"><b>{title}</b>{sub && <span>{sub}</span>}</span>
      {end}
      {href && <span className="pk-chev" aria-hidden="true">›</span>}
    </>
  );
  return href ? <Link href={href} className="pk-row">{body}</Link> : <div className="pk-row">{body}</div>;
}

/** A label and its value, one line of a card. */
export function Kv({ t, sub, v, children }: { t: ReactNode; sub?: ReactNode; v?: ReactNode; children?: ReactNode }) {
  return (
    <div className="pk-kv">
      <span className="t">{t}{sub && <span>{sub}</span>}</span>
      {children}
      {v != null && <span className="v">{v}</span>}
    </div>
  );
}

export const Av = ({ name }: { name: string }) => <span className="pk-av" aria-hidden="true">{name.trim().slice(0, 1).toUpperCase()}</span>;
export const Empty = ({ children }: { children: ReactNode }) => <div className="pk-empty">{children}</div>;
export const Note = ({ children }: { children: ReactNode }) => <p className="pk-note">{children}</p>;

/** A button-shaped link, dark or quiet. */
export const Btn = ({ href, children, quiet }: { href: string; children: ReactNode; quiet?: boolean }) => (
  <Link href={href} className={`pk-btn${quiet ? " g" : ""}`}>{children}</Link>
);

/**
 * The period filter on the money pages. `href` builds the link for a period,
 * so a page keeps its own other filters (its tab, a category) when the period
 * changes.
 */
export function PeriodTabs({ on, href, items }: { on: string; href: (k: string) => string; items: readonly { k: string; label: string }[] }) {
  return <Tabs on={on} label="Period" items={items.map((p) => ({ key: p.k, label: p.label, href: href(p.k) }))} />;
}

/**
 * One page of a section, summed up on the section's overview: its name and
 * how it's going, the one figure that matters, a line or two under it, and
 * the way in. Every card the same shape, so a row of them reads as a set.
 */
export function Sum({ title, st, fig, figSub, lines, href }: {
  title: string; st: Status; fig: string; figSub?: ReactNode; lines?: [ReactNode, ReactNode][]; href: string;
}) {
  return (
    <Link href={href} className="pk-card pk-sum pk-link">
      <div className="pk-tl"><span>{title}</span><Pill st={st} /></div>
      <div className="pk-fig">{fig}</div>
      {figSub && <div className="pk-ks">{figSub}</div>}
      {lines && lines.length > 0 && <dl>{lines.map(([k, v], i) => <div key={i}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
      <span className="go">Open ›</span>
    </Link>
  );
}

/** Stroke icons for the KPI heads, 24×24. */
const KPI_ICON: Record<string, string> = {
  trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  doc: "M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h6",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2",
  bars: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  check: "M20 6 9 17l-5-5",
  alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  mail: "M3 5h18v14H3zM3 6l9 7 9-7",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0",
  tag: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01",
  plug: "M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4",
  tv: "M3 5h18v12H3zM8 21h8M12 17v4",
  sound: "M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14",
  calendar: "M3 5h18v16H3zM16 3v4M8 3v4M3 10h18",
  bolt: "M13 2 3 14h9l-1 8 10-12h-9z",
};
export type Kpi = { icon: keyof typeof KPI_ICON | string; fig: ReactNode; label: ReactNode; badge?: ReactNode; tone?: "up" | "down" | "gold"; href?: string };

/**
 * A page head the Rapport way: a big title, two lines, and the page's few
 * headline figures beside it, each in a round icon. The badge beside a
 * figure carries its words, so a red one says "3 late", not just red.
 */
export function KpiHead({ title, kpis, hi }: { title: ReactNode; kpis: Kpi[]; hi?: ReactNode }) {
  return (
    <header className="rp-top rp-top--left rp-card" style={{ ["--i" as string]: 0 }}>
      <div className="rp-title">
        {hi && <span className="rp-hi">{hi}</span>}
        <h1>{title}</h1>
      </div>
      <KpiRow kpis={kpis} />
    </header>
  );
}

/** The figures beside a page title, each in a round icon. */
export function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="rp-kpis">
      {kpis.map((k, i) => {
        const body = (
          <>
            <span className="rp-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={KPI_ICON[k.icon] ?? k.icon} /></svg>
            </span>
            <span><b>{k.fig}{k.badge != null && <em className={`rp-badge ${k.tone ?? "gold"}`}>{k.badge}</em>}</b><small>{k.label}</small></span>
          </>
        );
        return k.href ? <Link key={i} href={k.href} className="rp-kpi">{body}</Link> : <div key={i} className="rp-kpi">{body}</div>;
      })}
    </div>
  );
}
