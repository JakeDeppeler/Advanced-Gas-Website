import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { BoardSounds } from "@/components/portal/BoardSounds";
import { dbConfigured } from "@/lib/portal/db";
import { readSounds } from "@/lib/board/sounds";
import { DEFAULT_PLAN } from "@/lib/board/soundTypes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sounds — Team portal" };

/**
 * The wall board's sounds: which one each pop-up plays, how loud, and the MP3s
 * uploaded to choose from. The TV hears a change with its remote, within
 * seconds, without being reloaded.
 */
export default async function BoardSoundsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The wall board" forWhom="managers" />;

  const ready = dbConfigured();
  const { plan, files } = ready ? await readSounds().catch(() => ({ plan: DEFAULT_PLAN, files: [] })) : { plan: DEFAULT_PLAN, files: [] };

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/section/board" label="Wall board" />
      <div className="pt-head">
        <h1>Sounds</h1>
        <p>
          What the wall board plays when a quote goes out, a job is finished and a job is sold — and how loud each one is.
          Upload your own MP3s below. The TV picks up a change within about ten seconds.
        </p>
      </div>
      {!ready && <div className="pt-note pt-note--warn"><strong>The database isn&rsquo;t connected,</strong> so nothing can be saved yet.</div>}
      <BoardSounds
        plan={plan}
        files={files.map(({ id, name, bytes, seconds, addedBy, addedAt }) => ({ id, name, bytes, seconds, addedBy, addedAt }))}
      />
    </PortalShell>
  );
}
