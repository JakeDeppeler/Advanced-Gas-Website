import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { DOCS, CATEGORIES } from "@/lib/portal/content";

export const metadata = { title: "Training — Team portal" };

export default async function TrainingPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const used = CATEGORIES.filter((c) => DOCS.some((d) => d.category === c));

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Training</div>
        <h1>Documents &amp; guides.</h1>
        <p>The standards we install to and the paperwork we run. New docs get added to the library as they&rsquo;re written.</p>
      </div>

      <div className="pt-note">
        <strong>Setup note.</strong> Doc titles are in place; upload the actual files (or paste a Google&nbsp;Doc/Drive link) and they go live. Editable in <code>src/lib/portal/content.ts</code> — or we add an in-portal uploader next.
      </div>

      {used.map((cat) => (
        <section key={cat}>
          <h2 className="pt-cathead">{cat}</h2>
          <div className="pt-grid">
            {DOCS.filter((d) => d.category === cat).map((d) => {
              const ready = Boolean(d.href);
              const inner = (
                <>
                  <div className="pt-card__tag">{d.kind ?? "doc"}</div>
                  <div className="pt-card__title">{d.title}</div>
                  <p className="pt-card__desc">{d.description}</p>
                  <div className="pt-card__meta">
                    <span className={`pt-pill ${ready ? "pt-pill--ready" : "pt-pill--soon"}`}>{ready ? "Open" : "Coming soon"}</span>
                  </div>
                </>
              );
              return ready ? (
                <a
                  key={d.title}
                  href={d.href}
                  target={d.kind === "link" ? undefined : "_blank"}
                  rel="noopener"
                  className="pt-card"
                >
                  {inner}
                </a>
              ) : (
                <div key={d.title} className="pt-card">{inner}</div>
              );
            })}
          </div>
        </section>
      ))}
    </PortalShell>
  );
}
