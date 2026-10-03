import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { SopSteps } from "@/components/portal/SopSteps";
import { SOP_CHANGES, SOP_VERSION, type Sop, type SopBlock } from "@/lib/portal/sops";
import { dbConfigured, listStoredSops } from "@/lib/portal/db";
import { mergeSops } from "@/lib/portal/sopEdits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Processes — Trade portal" };

/**
 * Where a procedure is carried out, for someone on the trade portal.
 *
 * `doIt` in sops.ts points at the office pages, because that is where the
 * office does these. A tech on an iPad does the same work on their own van's
 * screen, so the few that differ are mapped rather than forked — one manual,
 * two front doors.
 */
const TRADE_DO_IT: Record<string, string> = {
  "/portal/job-calculator": "/trade/calc",
};
/** The van procedures each open their own step; A3 is admin's monthly check, done in the office. */
const TRADE_DO_IT_CODE: Record<string, string | null> = {
  A1: "/trade/van/check",
  A3: null,
  A4: "/trade/van/check?step=stock",
};

/** The procedures the change log names, so the one that moved is marked. */
const CHANGED = new Set(
  SOP_CHANGES.flatMap((c) => c.what.match(/\b[A-G]\d\b/g) ?? []),
);

function Block({ b, at }: { b: SopBlock; at: string }) {
  const h = b.title ? <h3 style={{ fontSize: 17, fontWeight: 800, margin: "4px 0 8px" }}>{b.title}</h3> : null;
  if (b.kind === "steps") return <div>{h}<SopSteps code={at} items={b.items} /></div>;
  if (b.kind === "list") {
    return <div>{h}<ul className="tr-prose" style={{ margin: 0, paddingLeft: 22, fontSize: 16 }}>{b.items.map((i) => <li key={i}>{i}</li>)}</ul></div>;
  }
  if (b.kind === "table") {
    return (
      <div>
        {h}
        <div className="tr-scroll">
          <table className="tr-table">
            <thead><tr>{b.head.map((x) => <th key={x}>{x}</th>)}</tr></thead>
            <tbody>{b.rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    );
  }
  return (
    <div className={b.tone === "warn" ? "tr-note tr-note--warn" : "tr-note tr-note--grey"}>
      {b.title && <strong style={{ display: "block" }}>{b.title}</strong>}
      {b.body}
    </div>
  );
}

/**
 * Processes & procedures, on the iPad: pick a section, pick a procedure, work
 * down it.
 *
 * Read through the same merge the office portal reads — the manual in
 * sops.ts with whatever the office has published over it. One manual: a
 * procedure that said one thing on the wall and another in the van would be
 * worse than no portal at all, and sops.ts says as much at the top of itself.
 * Drafts are excluded here and only here, because this is the van.
 *
 * Selection is in the URL rather than component state, so a tech can bookmark
 * C4 — gas leak on site — and land straight on it.
 */
export default async function TradeProcesses({ searchParams }: { searchParams: { sec?: string; sop?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  // Published procedures only. A draft the office is still writing has no
  // business on a screen in a van.
  const stored = dbConfigured() ? await listStoredSops().catch(() => []) : [];
  const SECTIONS = mergeSops(stored, false);

  // A code in the URL wins, because that is what a bookmark and the home
  // screen's "what changed" card both carry.
  const byCode = searchParams.sop
    ? SECTIONS.flatMap((s) => s.sops.map((sop) => ({ s, sop }))).find((x) => x.sop.code === searchParams.sop?.toUpperCase())
    : undefined;
  const section = byCode?.s ?? SECTIONS.find((s) => s.slug === searchParams.sec) ?? SECTIONS[0];
  const sop: Sop = byCode?.sop ?? section.sops[0];

  const href = (sec: string, code?: string) => `/trade/processes?sec=${sec}${code ? `&sop=${code}` : ""}`;

  const version = SOP_VERSION.split(" · ")[0].replace("Version ", "");

  return (
    <TradeShell user={user} active="tools" title="Processes & procedures" sub="Sales, safety, standards, people — how we do it">
      <div className="tr-proc">
        <nav className="tr-card tr-stack" style={{ gap: 4, padding: 8 }} aria-label="Sections">
          {SECTIONS.map((s) => (
            <Link key={s.slug} href={href(s.slug)} aria-current={s.slug === section.slug ? "page" : undefined} className={`tr-pick${s.slug === section.slug ? " is-on" : ""}`}>
              <span className="tr-letter">{s.letter}</span>
              <strong>{s.title}</strong>
            </Link>
          ))}
        </nav>

        <nav className="tr-card tr-stack" style={{ gap: 4, padding: 8, alignSelf: "start" }} aria-label="Procedures">
          <p className="tr-small" style={{ padding: "8px 12px 6px" }}>{section.blurb}</p>
          {section.sops.map((x) => {
            const on = x.code === sop.code;
            const moved = CHANGED.has(x.code);
            return (
              <Link key={x.code} href={href(section.slug, x.code)} aria-current={on ? "page" : undefined} className={`tr-pick${on ? " is-on" : ""}`}>
                <span className="tr-letter" style={{ width: 36 }}>{x.code}</span>
                <span style={{ minWidth: 0 }}>
                  <strong>{x.title}</strong>
                  {moved
                    ? <span className="tr-pick__s is-warn">Changed in {version}</span>
                    : x.meta[0] && <span className="tr-pick__s">{x.meta[0].v}</span>}
                </span>
              </Link>
            );
          })}
        </nav>

        <section className="tr-card tr-stack" style={{ gap: 14 }}>
          {CHANGED.has(sop.code) && <span className="tr-chip tr-chip--warn" style={{ alignSelf: "flex-start" }}>Changed in {version}</span>}
          <div>
            <h2 style={{ fontSize: 24, lineHeight: "30px", fontWeight: 900 }}>{sop.code} · {sop.title}</h2>
            {sop.meta.length > 0 && <p className="tr-muted" style={{ marginTop: 2 }}>{sop.meta.map((m) => m.v).join(" · ")}</p>}
          </div>

          {sop.blocks.map((b, i) => <Block key={i} b={b} at={`${sop.code}.${i}`} />)}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid var(--tr-line)" }}>
            {sop.doIt && TRADE_DO_IT_CODE[sop.code] !== null && (
              <Link href={TRADE_DO_IT_CODE[sop.code] ?? TRADE_DO_IT[sop.doIt.href] ?? sop.doIt.href} className="tr-btn tr-btn--go">{sop.doIt.label}</Link>
            )}
            {/* C6's "bring the fix with it" has its own procedure rather than
                a button that emails nobody. */}
            <Link href="/trade/processes?sec=standards&sop=C6" className="tr-btn">Suggest a change · C6</Link>
          </div>
        </section>
      </div>
    </TradeShell>
  );
}
