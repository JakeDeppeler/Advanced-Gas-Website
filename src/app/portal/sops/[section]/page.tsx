import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { findSection, type SopBlock } from "@/lib/portal/sops";
import { can } from "@/lib/portal/caps";
import { dbConfigured, listStoredSops } from "@/lib/portal/db";
import { mergeSops } from "@/lib/portal/sopEdits";
import { PortalTabs } from "@/components/portal/PortalTabs";

/**
 * Dynamic, not static.
 *
 * This was `force-static` with `generateStaticParams`, which cannot work: the
 * page reads the session cookie to find out who is asking, and a page that
 * reads cookies cannot be prerendered. Next resolved that by answering every
 * request with a 307 carrying no Location — so every procedure's detail page
 * had been a dead link, and the Processes section only ever showed its index.
 */
export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { section: string } }) {
  const s = findSection(params.section);
  return { title: s ? `${s.title} — Team portal` : "Processes — Team portal" };
}

function Block({ b }: { b: SopBlock }) {
  if (b.kind === "steps") {
    return (
      <div className="pt-sop__block">
        {b.title && <h4>{b.title}</h4>}
        <ol className="pt-sop__steps">{b.items.map((i) => <li key={i}>{i}</li>)}</ol>
      </div>
    );
  }
  if (b.kind === "list") {
    return (
      <div className="pt-sop__block">
        {b.title && <h4>{b.title}</h4>}
        <ul className="pt-sop__list">{b.items.map((i) => <li key={i}>{i}</li>)}</ul>
      </div>
    );
  }
  if (b.kind === "table") {
    return (
      <div className="pt-sop__block">
        {b.title && <h4>{b.title}</h4>}
        <div className="pt-sop__tablewrap">
          <table className="pt-sop__table">
            <thead><tr>{b.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{b.rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    );
  }
  return (
    <div className={`pt-sop__note${b.tone === "warn" ? " is-warn" : ""}`}>
      {b.title && <h4>{b.title}</h4>}
      <p>{b.body}</p>
    </div>
  );
}

export default async function SopSectionPage({ params }: { params: { section: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  // What the office has written wins over the manual. A draft is only shown
  // to the people who could have written it, so a half-finished procedure
  // never reaches a van.
  const canEdit = can(user, "manage_users");
  const stored = dbConfigured() ? await listStoredSops().catch(() => []) : [];
  const sections = mergeSops(stored, canEdit);
  const section = sections.find((s) => s.slug === params.section) ?? findSection(params.section);
  if (!section) notFound();
  const statusOf = new Map(stored.map((s) => [s.code, s.status]));

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/sops" label="Processes" />
        <div className="pt-head__eyebrow">Section {section.letter}</div>
        <h1>{section.title}.</h1>
        <p>{section.blurb}</p>
      </div>

      <PortalTabs tabs={sections.map((x) => ({ href: `/portal/sops/${x.slug}`, label: `${x.letter} · ${x.title}` }))} />

      {section.draft && (
        <div className="pt-note pt-note--warn"><strong>Not final.</strong> {section.draft}</div>
      )}

      <nav className="pt-sop__index" aria-label="In this section">
        {section.sops.map((sop) => (
          <a key={sop.slug} href={`#${sop.slug}`}><b>{sop.code}</b> {sop.title}</a>
        ))}
      </nav>

      {section.sops.map((sop) => (
        <section key={sop.slug} id={sop.slug} className="pt-panel pt-sop">
          <div className="pt-sop__head">
            <span className="pt-sop__code">{sop.code}</span>
            <h2 className="pt-panel__h">{sop.title}</h2>
            {/* Said in words, not just a tint: an editor reading their own
                draft has to know the crew can't see it yet. */}
            {statusOf.get(sop.code) === "draft" && <span className="pt-sop__draft">Draft — only you can see this</span>}
            {sop.doIt && <Link href={sop.doIt.href} className="pt-btn pt-btn--navy pt-btn--sm">{sop.doIt.label} →</Link>}
          </div>

          {sop.meta.length > 0 && (
            <dl className="pt-sop__facts">
              {sop.meta.map((m) => (
                <div key={m.k}><dt>{m.k}</dt><dd>{m.v}</dd></div>
              ))}
            </dl>
          )}

          {sop.blocks.map((b, i) => <Block key={i} b={b} />)}
        </section>
      ))}

      <div className="pt-sop__foot">
        <strong>Something here not working on the job?</strong> Say it when you see it and bring the fix with it — see{" "}
        <Link href="/portal/sops/standards#changing-a-process">C6</Link>. It gets raised at the Monday huddle and, if it&rsquo;s right, it goes into every van.
      </div>
    </PortalShell>
  );
}
