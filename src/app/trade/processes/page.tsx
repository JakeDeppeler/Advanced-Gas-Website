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
  "/portal/vehicles": "/trade/monday",
  "/portal/job-calculator": "/trade/calc",
};

/** The procedures the change log names, so the one that moved is marked. */
const CHANGED = new Set(
  SOP_CHANGES.flatMap((c) => c.what.match(/\b[A-G]\d\b/g) ?? []),
);

function Block({ b, at }: { b: SopBlock; at: string }) {
  if (b.kind === "steps") {
    return (
      <div>
        {b.title && <h3>{b.title}</h3>}
        <SopSteps code={at} items={b.items} />
      </div>
    );
  }
  if (b.kind === "list") {
    return (
      <div>
        {b.title && <h3>{b.title}</h3>}
        <ul>{b.items.map((i) => <li key={i}>{i}</li>)}</ul>
      </div>
    );
  }
  if (b.kind === "table") {
    return (
      <div>
        {b.title && <h3>{b.title}</h3>}
        <div className="tr-scroll">
          <table>
            <thead><tr>{b.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{b.rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    );
  }
  return (
    <div className={b.tone === "warn" ? "tr-note tr-note--warn" : "tr-note"}>
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

  return (
    <TradeShell
      user={user} active="/trade/processes"
      title="Processes & procedures"
      sub={`${SOP_VERSION} · how we do it`}
    >
      <div className="tr-md">
        <nav className="tr-md__col tr-md__col--row" aria-label="Sections">
          <span className="tr-md__lbl">Sections</span>
          {SECTIONS.map((s) => (
            <Link key={s.slug} href={href(s.slug)} aria-current={s.slug === section.slug ? "page" : undefined} className={`tr-pick${s.slug === section.slug ? " is-on" : ""}`}>
              <span className="tr-pick__chip">{s.letter}</span>
              <span className="tr-pick__t"><strong>{s.title}</strong></span>
            </Link>
          ))}
        </nav>

        <nav className="tr-md__col" aria-label="Procedures">
          <span className="tr-md__blurb">{section.blurb}</span>
          {section.sops.map((x) => {
            const on = x.code === sop.code;
            const moved = CHANGED.has(x.code);
            return (
              <Link key={x.code} href={href(section.slug, x.code)} aria-current={on ? "page" : undefined} className={`tr-pick${on ? " is-on" : ""}`}>
                <span className={`tr-pick__chip${moved ? " tr-pick__chip--alert" : ""}`}>{x.code}</span>
                <span className="tr-pick__t">
                  <strong>{x.title}</strong>
                  {moved
                    ? <span className="is-tag">Changed in {SOP_VERSION.split(" · ")[0].replace("Version ", "v")}</span>
                    : x.meta[0] && <span>{x.meta[0].v}</span>}
                </span>
              </Link>
            );
          })}
        </nav>

        <section className="tr-card tr-stack" style={{ gap: 16 }}>
          {CHANGED.has(sop.code) && <span className="tr-tag">Changed in {SOP_VERSION}</span>}
          <div>
            <h2 style={{ fontSize: 24, lineHeight: "30px" }}>{sop.code} · {sop.title}</h2>
            {sop.meta.length > 0 && (
              <span className="tr-sub">{sop.meta.map((m) => `${m.k}: ${m.v}`).join(" · ")}</span>
            )}
          </div>

          {sop.doIt && (
            <Link href={TRADE_DO_IT[sop.doIt.href] ?? sop.doIt.href} className="tr-btn tr-btn--go" style={{ alignSelf: "flex-start" }}>
              {sop.doIt.label}
            </Link>
          )}

          <div className="tr-prose">
            {sop.blocks.map((b, i) => <Block key={i} b={b} at={`${sop.code}.${i}`} />)}
          </div>

          {/* Where the procedure is actually carried out, when it is carried
              out in here. C6's "bring the fix with it" has its own procedure
              rather than a button that emails nobody. */}
          <div className="tr-btns" style={{ paddingTop: 6, borderTop: "1px solid var(--pt-tint)" }}>
            <span className="tr-foot">Spotted something that doesn&rsquo;t work on the job? Bring the fix with it.</span>
            <Link href="/trade/processes?sec=standards&sop=C6" className="tr-btn">How to change this — C6</Link>
          </div>
        </section>
      </div>
    </TradeShell>
  );
}
