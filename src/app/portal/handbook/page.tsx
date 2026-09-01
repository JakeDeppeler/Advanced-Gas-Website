import { redirect } from "next/navigation";
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
        <p>The company operations manual — everything from who we are to how we quote, run a van and get paid. Grouped into shelves; each item is either written and ready to load, or a gap we still need to fill.</p>
      </div>

      <div className="pt-hb-summary">
        <div className="pt-hb-summary__bar"><span style={{ width: `${pct}%` }} /></div>
        <div className="pt-hb-summary__legend">
          <span><b>{have}</b> written, ready to load</span>
          <span><b>{write}</b> still to write</span>
          <span className="pt-hb-summary__pct">{pct}% there</span>
        </div>
      </div>

      {HANDBOOK.map((shelf) => (
        <section key={shelf.letter} className="pt-hb-shelf">
          <div className="pt-hb-shelf__h">
            <span className="pt-hb-letter">{shelf.letter}</span>
            <h2>{shelf.title}</h2>
          </div>
          <ul className="pt-hb-items">
            {shelf.items.map((it) => (
              <li key={it.title} className="pt-hb-item">
                <span className={`pt-hb-status pt-hb-status--${it.status}`}>
                  {it.status === "have" ? "Have it" : "To write"}
                </span>
                <div className="pt-hb-item__body">
                  <div className="pt-hb-item__title">
                    {it.title}
                    {it.today && <span className="pt-hb-today">ready today</span>}
                  </div>
                  {it.note && <div className="pt-hb-item__note">{it.note}</div>}
                  {it.status === "write" && it.gap && <div className="pt-hb-item__gap">{it.gap}</div>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </PortalShell>
  );
}
