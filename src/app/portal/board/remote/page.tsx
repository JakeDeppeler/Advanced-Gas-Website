import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PageHead } from "@/components/portal/kit/PageHead";
import { Locked } from "@/components/portal/Locked";
import { BoardPreview } from "@/components/portal/BoardPreview";
import { BoardRemoteControls } from "@/components/portal/BoardRemoteControls";
import { readRemote } from "@/lib/board/remote";
import { EMPTY_REMOTE } from "@/lib/board/remoteTypes";
import { dbConfigured } from "@/lib/portal/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wall board remote · Team portal" };

/**
 * The wall board, and a remote for it: the board itself, live, beside the
 * buttons that drive the TV — a page to show or hold, a demo alert, light or
 * dark, and a reload. The board on the TV has two small buttons and no
 * keyboard; this is where it's driven from.
 */
export default async function BoardRemotePage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The wall board" forWhom="managers" />;

  const ready = dbConfigured();
  const remote = ready ? await readRemote().catch(() => EMPTY_REMOTE) : EMPTY_REMOTE;

  return (
    <PortalShell user={user} variant="wide">
      <div className="sx">
      <PageHead hi="Wall board" title="Wall board" line="What's on the office TV right now, and a remote for it."
        info={<p>Whatever you press here shows on the TV within a few seconds. Somebody at the TV can still skip or hold with its own buttons.</p>}
        action={<a className="qp-btn dark" href="/portal/finance/board/open" target="_blank" rel="noreferrer">Open it full screen ↗</a>} />

      {!ready && <div className="pt-note pt-note--warn"><strong>The database isn&rsquo;t connected,</strong> so the remote can&rsquo;t reach the board.</div>}

      <div className="pt-wb">
        <section className="pt-panel pt-wb__live">
          <div className="pt-wb__gh">
            <h2 className="pt-panel__h">On the wall now</h2>
            <span className="pt-wb__fine">The board itself, live, it follows the remote as the TV does</span>
          </div>
          <BoardPreview />
          <p className="pt-wb__links">
            <Link href="/portal/finance/board">Targets, commission and working days →</Link>
          </p>
        </section>
        <section className="pt-panel">
          <BoardRemoteControls initial={remote} />
        </section>
      </div>
    </div>
    </PortalShell>
  );
}
