import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { TOOLS } from "@/lib/portal/content";

export const metadata = { title: "Tools — Team portal" };

export default async function ToolsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Tools</div>
        <h1>On-the-job tools.</h1>
        <p>The calculators and lookups we use on site and on quote calls, in one place.</p>
      </div>

      <div className="pt-grid">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="pt-card" target={t.external ? "_blank" : undefined} rel={t.external ? "noopener" : undefined}>
            <div className="pt-card__tag">Tool</div>
            <div className="pt-card__title">{t.title}</div>
            <p className="pt-card__desc">{t.description}</p>
            <div className="pt-card__meta">Open {t.external ? "↗" : "→"}</div>
          </Link>
        ))}
      </div>
    </PortalShell>
  );
}
