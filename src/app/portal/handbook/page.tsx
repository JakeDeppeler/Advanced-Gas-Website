import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { HANDBOOK } from "@/lib/portal/content";
import { SOPS } from "@/lib/portal/sops";

export const metadata = { title: "Handbook — Team portal" };

export default async function HandbookPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const all = HANDBOOK.flatMap((s) => s.items);
  const total = all.length;
  // Written or built: both mean the content exists somewhere. What is loaded
  // into the portal is a per-section count, on the section screen, because
  // that one needs the bodies and this page does not read them.
  const have = all.filter((i) => i.status !== "write").length;
  const pct = Math.round((have / total) * 100);

  return (
    <PortalShell user={user}>
      <div className="pt-head pt-head--split">
        <div>
          <PortalBack href="/portal" label="Home" />
          <h1>Handbook</h1>
          <p>
            How we do things here, top to bottom — who we are, every role, how we treat customers, the factory and the
            vans, our systems, safety, and the forms. So the business runs to the same standard whoever is in the chair.
          </p>
        </div>
        {/* How much of the manual is written, said as a number and drawn as a
            bar — the bar alone wouldn't say "18 of 28". */}
        <div className="pt-hbx__progress" aria-label={`${have} of ${total} topics written or built`}>
          <div><strong>{pct}%</strong><span>{have} of {total} written or built</span></div>
          <span className="pt-hbx__bar"><span style={{ width: `${pct}%` }} /></span>
        </div>
      </div>

      <section className="pt-hbx">
        {HANDBOOK.map((shelf) => {
          const ready = shelf.items.filter((i) => i.status !== "write").length;
          const n = shelf.items.length;
          const done = ready === n;
          return (
            <Link key={shelf.letter} href={`/portal/handbook/${shelf.slug}`} className="pt-hbx__card">
              <span className="pt-hbx__letter">{shelf.letter}</span>
              <span className="pt-hbx__txt">
                <strong>{shelf.title}</strong>
                {shelf.blurb && <span className="pt-hbx__blurb">{shelf.blurb}</span>}
                <span className="pt-hbx__row">
                  <span className="pt-hbx__track"><span className={done ? "is-done" : undefined} style={{ width: `${Math.round((ready / n) * 100)}%` }} /></span>
                  <em className={done ? "is-done" : ready === 0 ? "is-none" : undefined}>{ready} of {n} ready</em>
                </span>
              </span>
            </Link>
          );
        })}
        <Link href="/portal/sops" className="pt-hbx__card pt-hbx__card--navy">
          <strong>Processes &amp; procedures is live</strong>
          <span>{SOPS.reduce((k, x) => k + x.sops.length, 0)} procedures from the training day →</span>
        </Link>
      </section>
    </PortalShell>
  );
}
