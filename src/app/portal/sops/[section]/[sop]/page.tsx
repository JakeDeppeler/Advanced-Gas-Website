import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { SopBlock as Block } from "@/components/portal/SopBlocks";
import { findSection, SOP_CHANGES } from "@/lib/portal/sops";
import { dbConfigured, listStoredSops } from "@/lib/portal/db";
import { mergeSops, splitStep } from "@/lib/portal/sopEdits";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { section: string; sop: string } }) {
  const s = findSection(params.section)?.sops.find((x) => x.slug === params.sop);
  return { title: s ? `${s.code} ${s.title} — Team portal` : "Processes — Team portal" };
}

/** A step's first part as its title — a heading, so no full stop — and the rest under it. */
function stepParts(line: string): { title: string; detail: string } {
  const s = splitStep(line);
  return { title: s.do.replace(/\.$/, ""), detail: s.note };
}

/**
 * One procedure on its own page, to Procedure.dc.html.
 *
 * It used to be one of several stacked on its section's page, which meant a
 * link to "A1" landed on a page about all four. The steps are the page: a
 * numbered list, each step's first sentence as its title, with what the
 * procedure is for and what good looks like underneath.
 */
export default async function SopPage({ params }: { params: { section: string; sop: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const canEdit = can(user, "manage_users");
  const stored = dbConfigured() ? await listStoredSops().catch(() => []) : [];
  const sections = mergeSops(stored, canEdit);
  const section = sections.find((s) => s.slug === params.section) ?? findSection(params.section);
  const sop = section?.sops.find((x) => x.slug === params.sop);
  if (!section || !sop) notFound();

  const change = SOP_CHANGES[0];
  const changed = change?.items.find((c) => c.code === sop.code);
  const steps = sop.blocks.filter((b) => b.kind === "steps");
  const rest = sop.blocks.filter((b) => b.kind !== "steps");
  const isDraft = stored.some((s) => s.code === sop.code && s.status === "draft");

  return (
    <PortalShell user={user}>
      <div className="pt-narrow pt-sopone">
        <PortalBack href={`/portal/sops/${section.slug}`} label={`${section.letter} · ${section.title}`} />

        <div className="pt-sopone__head">
          <span className="pt-sopone__code">{sop.code}</span>
          <h1>{sop.title}</h1>
          {sop.meta.length > 0 && (
            <div className="pt-sopone__chips">
              {sop.meta.map((m) => <span key={m.k}>{m.k}: {m.v}</span>)}
            </div>
          )}
        </div>

        {isDraft && <div className="pt-note pt-note--warn"><strong>Draft — only you can see this.</strong> The crew sees the last published version.</div>}

        {changed && (
          <section className="pt-sopone__changed">
            <strong>Changed in {change.on.replace(/^Version\s*/i, "")}</strong>
            <span>{changed.text}</span>
          </section>
        )}

        {steps.map((b, k) => (
          <section key={k} className="pt-sopone__steps" aria-label={b.title ?? "Steps"}>
            {b.kind === "steps" && b.items.map((item, i) => {
              const s = stepParts(item);
              return (
                <div key={i} className="pt-sopone__step">
                  <span>{i + 1}</span>
                  <span><strong>{s.title}</strong>{s.detail && <em>{s.detail}</em>}</span>
                </div>
              );
            })}
          </section>
        ))}

        {rest.length > 0 && (
          <section className="pt-panel pt-sopone__rest">
            {rest.map((b, i) => <Block key={i} b={b} />)}
          </section>
        )}

        <div className="pt-sopone__acts">
          {sop.doIt && <Link href={sop.doIt.href} className="pt-btn pt-btn--orange pt-sopone__big">{sop.doIt.label}</Link>}
          <Link href="/portal/sops/standards/changing-a-process" className="pt-btn pt-btn--ghost pt-sopone__big">Doesn&rsquo;t work on the job? Suggest a fix (C6)</Link>
        </div>
      </div>
    </PortalShell>
  );
}
