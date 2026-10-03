import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { CopyValue } from "@/components/portal/CopyValue";
import { INFO_SECTIONS, type InfoContentBlock } from "@/lib/portal/content";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { section: string } }) {
  const s = INFO_SECTIONS.find((x) => x.slug === params.section);
  return { title: s ? `${s.label} — Team portal` : "Information — Team portal" };
}

/** One block, in whichever shape its content is. */
function Block({ b }: { b: InfoContentBlock }) {
  const navy = b.tone === "navy";

  if (b.as === "facts") {
    return (
      <div className="pt-ifacts">
        {(b.rows ?? []).map((r, i) => (
          <div key={r.k} className={`pt-ifact${navy || i === 0 ? " is-feature" : ""}`}>
            <span>{r.k}</span>
            <strong>{r.v}</strong>
            {r.note && <em>{r.note}</em>}
          </div>
        ))}
      </div>
    );
  }

  if (b.as === "copy") {
    return (
      <div className="pt-icopy">
        {(b.rows ?? []).map((r) => (
          <div key={r.k} className="pt-icopy__card">
            <span>{r.k}</span>
            <strong>{r.v}</strong>
            <CopyValue value={r.v} label={r.k} />
          </div>
        ))}
      </div>
    );
  }

  if (b.as === "people") {
    return (
      <div className="pt-ippl">
        {(b.people ?? []).map((p) => (
          <div key={p.name} className="pt-ippl__card">
            <span className="pt-ippl__av" aria-hidden="true">{p.name.slice(0, 1)}</span>
            <div>
              <strong>{p.name}</strong>
              <em>{p.role}</em>
              <span>{p.detail}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className={`pt-icard${navy ? " is-navy" : ""}`}>
      {b.title && <h2 className="pt-icard__h">{b.title}</h2>}

      {b.as === "chips" && (
        <div className="pt-ichips">
          {(b.chips ?? []).map((c) => <span key={c}>{c}</span>)}
        </div>
      )}

      {b.rows && b.rows.length > 0 && (
        <div className={b.as === "price" ? "pt-iprice" : "pt-irows"}>
          {b.rows.map((r) => (
            <div key={r.k} className="pt-irow">
              <span>
                {r.k}
                {r.note && <em>{r.note}</em>}
              </span>
              <strong>{r.v}</strong>
            </div>
          ))}
        </div>
      )}

      {b.list && (
        <ul className="pt-ilist">
          {b.list.map((li) => <li key={li}>{li}</li>)}
        </ul>
      )}

      {b.body?.map((para) => <p key={para} className="pt-ibody">{para}</p>)}
    </section>
  );
}

export default async function InfoSectionPage({ params }: { params: { section: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const section = INFO_SECTIONS.find((s) => s.slug === params.section);
  if (!section) notFound();

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal" label="Home" />
        <h1>{section.title}</h1>
        {section.intro && <p>{section.intro}</p>}
      </div>

      {/* Without these you could reach Pricing and not Licences: the sidebar
          used to carry the siblings and nothing replaced it. */}
      <nav className="pt-tabs pt-tabs--inline" aria-label="Information">
        {INFO_SECTIONS.map((x) => (
          <Link
            key={x.slug}
            href={`/portal/information/${x.slug}`}
            aria-current={x.slug === section.slug ? "page" : undefined}
            className={`pt-tab${x.slug === section.slug ? " is-on" : ""}`}
          >
            {x.label}
          </Link>
        ))}
      </nav>

      {/* Two columns, with a block saying when it needs the width. The grid
          flows, so a section with an odd number of halves doesn't leave a
          stretched card beside a gap. */}
      <div className="pt-info">
        {section.blocks.map((b, i) => (
          <div key={b.title ?? `b${i}`} className={b.span === "full" ? "pt-info__full" : undefined}>
            <Block b={b} />
          </div>
        ))}
      </div>
    </PortalShell>
  );
}
