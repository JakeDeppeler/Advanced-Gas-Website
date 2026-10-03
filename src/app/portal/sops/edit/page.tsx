import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { SopEditor, type SectionView } from "@/components/portal/SopEditor";
import { dbConfigured, listStoredSops } from "@/lib/portal/db";
import { mergeSops, type SopStep } from "@/lib/portal/sopEdits";
import { SOPS, SOP_VERSION } from "@/lib/portal/sops";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit processes — Team portal" };

/**
 * The manual's own steps for a procedure, so editing one starts from what the
 * crew reads today rather than from an empty form. A step there is one line;
 * the editor keeps the line and leaves the note blank.
 */
function manualSteps(): Record<string, { title: string; steps: SopStep[]; happens: string }> {
  const out: Record<string, { title: string; steps: SopStep[]; happens: string }> = {};
  for (const sec of SOPS) {
    for (const sop of sec.sops) {
      const block = sop.blocks.find((b) => b.kind === "steps");
      out[sop.code] = {
        title: sop.title,
        steps: block && block.kind === "steps" ? block.items.map((i) => ({ do: i, note: "" })) : [],
        happens: sop.meta.find((m) => m.k === "When")?.v ?? "",
      };
    }
  }
  return out;
}

export default async function EditProcessesPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "manage_users")) redirect("/portal?denied=1");

  const stored = dbConfigured() ? await listStoredSops().catch(() => []) : [];
  // The list on the left is what an editor would see on the page itself,
  // drafts included — otherwise a procedure you saved yesterday isn't there.
  const sections: SectionView[] = mergeSops(stored, true).map((s) => ({
    letter: s.letter,
    title: s.title,
    codes: s.sops.map((x) => ({ code: x.code, title: x.title })),
  }));

  const drafts = stored.filter((s) => s.status === "draft").length;

  return (
    <PortalShell user={user}>
      <div className="pt-head pt-head--split">
        <div>
          <PortalBack href="/portal/sops" label="Processes" />
          <h1>Edit processes &amp; procedures</h1>
          <p>The crew sees a change the moment you publish it. Drafts stay here.</p>
        </div>
        <div className="pt-se__head">
          <span className="pt-se__ver">{SOP_VERSION}</span>
          {drafts > 0 && <span className="pt-se__drafts">{drafts} draft{drafts === 1 ? "" : "s"}</span>}
          <Link href="/trade/processes" className="pt-btn pt-btn--ghost pt-btn--sm" target="_blank" rel="noopener">
            See it on the iPad ↗
          </Link>
        </div>
      </div>

      {!dbConfigured() ? (
        <div className="pt-note pt-note--warn">
          <strong>The database isn&rsquo;t connected.</strong> The manual still reads fine; nothing can be written to it
          from here until it is.
        </div>
      ) : (
        <SopEditor sections={sections} stored={stored} fromManual={manualSteps()} />
      )}
    </PortalShell>
  );
}
