import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { HANDBOOK } from "@/lib/portal/content";

export const metadata = { title: "Handbook — Team portal" };

export default async function HandbookPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const all = HANDBOOK.flatMap((s) => s.items);
  const total = all.length;
  const have = all.filter((i) => i.status === "have").length;
  const write = total - have;
  const pct = Math.round((have / total) * 100);

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Handbook</div>
        <h1>How we do things here.</h1>
        <p>The company operations manual — everything from who we are to how we quote, run a van and get paid. Pick a shelf to open it.</p>
      </div>

      <div className="pt-hb-summary">
        <div className="pt-hb-summary__bar"><span style={{ width: `${pct}%` }} /></div>
        <div className="pt-hb-summary__legend">
          <span><b>{have}</b> written, ready to load</span>
          <span><b>{write}</b> still to write</span>
          <span className="pt-hb-summary__pct">{pct}% there</span>
        </div>
      </div>

      <div className="pt-hb-cards">
        {HANDBOOK.map((shelf) => {
          const shelfHave = shelf.items.filter((i) => i.status === "have").length;
          return (
            <Link key={shelf.letter} href={`/portal/handbook/${shelf.letter.toLowerCase()}`} className="pt-hb-card">
              <span className="pt-hb-letter">{shelf.letter}</span>
              <span className="pt-hb-card__txt">
                <strong>{shelf.title}</strong>
                <span>{shelf.items.length} topic{shelf.items.length === 1 ? "" : "s"} · {shelfHave} ready</span>
              </span>
              <svg className="pt-hb-card__chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </Link>
          );
        })}
      </div>
    </PortalShell>
  );
}
