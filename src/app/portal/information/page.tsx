import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { INFO } from "@/lib/portal/content";

export const metadata = { title: "Information — Team portal" };

export default async function InformationPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Information</div>
        <h1>Quick reference.</h1>
        <p>The numbers, licences and contacts we quote from — so everyone gives the same answer.</p>
      </div>

      <div className="pt-info">
        {INFO.map((block) => (
          <div key={block.title} className="pt-info__card">
            <h3>{block.title}</h3>
            {block.rows.map((r) => (
              <div key={r.k} className="pt-info__row">
                <span>{r.k}</span>
                <strong>{r.v}</strong>
              </div>
            ))}
          </div>
        ))}
      </div>
    </PortalShell>
  );
}
