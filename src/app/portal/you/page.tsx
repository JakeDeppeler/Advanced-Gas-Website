import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { portalNav } from "@/lib/portal/nav";
import { getBusiness } from "@/lib/portal/business";
import { buildSections } from "@/lib/portal/sections";
import { PortalShell } from "@/components/portal/PortalShell";
import { Head } from "@/components/portal/kit/Kit";
import { Icon } from "@/components/portal/shell/Menu";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · Team portal" };

/** What each part of Settings is for, in a line. Keyed by the page or group label in sections.ts. */
const WHAT: Record<string, { icon: string; line: string }> = {
  "My file": { icon: "me", line: "What’s expected of you, your goals, your reviews and your leave." },
  Notifications: { icon: "bell", line: "What needs doing and what’s new, in one list." },
  Records: { icon: "book", line: "Customers, sites and the website and social chats." },
  "The portal": { icon: "cog", line: "How it looks, what it does by itself, what it’s connected to, and the goals." },
  Admin: { icon: "team", line: "Who’s on the team and exactly what each person can see." },
  Ordering: { icon: "box", line: "Suppliers, the pricebook link, and the stock kept in the factory." },
  "Wall board": { icon: "wall", line: "The office TV: what it shows, its targets, sounds and reports." },
};

/**
 * Settings › Overview: every part of Settings on one page, each with what
 * it's for and its pages, so nobody has to open seven tabs to find the one
 * thing. Only what this person can open is shown, the same as the tabs.
 */
export default async function SettingsOverview() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const office = can(user, "overhead") || can(user, "manage_users");
  const sections = buildSections(portalNav(user), await getBusiness(), office);
  const you = sections.find((s) => s.id === "you");
  const parts = (you?.pages ?? []).filter((p) => p.href !== "/portal/you");

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Settings" sub="Your file, customers and sites, what the portal does by itself, the team and the wall board." />
      </div>
      <div className="so">
        {parts.map((p) => {
          const w = WHAT[p.label];
          const pages = p.subs ?? [p];
          return (
            <section key={p.label} className="pk-card so-card" aria-labelledby={`so-${p.label}`}>
              <div className="so-h">
                <span className="so-ic"><Icon name={w?.icon ?? p.icon ?? "cog"} size={17} /></span>
                <span><h2 id={`so-${p.label}`}>{p.label}</h2>{w && <p>{w.line}</p>}</span>
              </div>
              <ul className="so-pages">
                {pages.map((x) => (
                  <li key={x.href}><Link href={x.href}>{x.label}<span aria-hidden="true">›</span></Link></li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </PortalShell>
  );
}
