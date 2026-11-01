import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Icon } from "@/components/portal/shell/Menu";
import { KpiHead } from "@/components/portal/kit/Kit";
import { listIntegrations, type IntegrationState } from "@/lib/portal/integrations";
import { AUTO_KEYS, loadSwitches } from "@/lib/automation/log";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · Team portal" };

type Row = { href: string; icon: string; title: string; line: string; end?: React.ReactNode };

const Card = ({ title, rows }: { title: string; rows: Row[] }) => (
  <section className="pk-card so-card" aria-label={title}>
    <h2 className="so-t">{title}</h2>
    <ul className="so-rows">
      {rows.map((r) => (
        <li key={r.href}>
          <Link href={r.href}>
            <span className="so-ic"><Icon name={r.icon} size={16} /></span>
            <span className="so-tx"><b>{r.title}</b><span>{r.line}</span></span>
            {r.end}
            <span className="so-chev" aria-hidden="true">›</span>
          </Link>
        </li>
      ))}
    </ul>
  </section>
);

const WORD: Record<IntegrationState, string> = { working: "Connected", attention: "Needs a look", off: "Not set up" };
const STATE: Record<IntegrationState, string> = { working: "ok", attention: "warn", off: "none" };

/**
 * Settings › Overview, to the mock: four cards, you and the team, records,
 * the connections with their state, and how the portal runs, with how much
 * runs by itself and how many connections are live over them. The office's
 * parts only for the office; everyone sees their file and notifications.
 */
export default async function SettingsOverview() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const office = can(user, "overhead") || can(user, "manage_users");
  const admin = can(user, "manage_users");
  const [ints, sw] = office ? await Promise.all([listIntegrations().catch(() => []), loadSwitches().catch(() => null)]) : [[], null];
  const pick = (k: string) => ints.find((r) => r.k.toLowerCase().includes(k));
  const conns = [pick("servicetitan"), pick("xero"), pick("google")].filter((x): x is NonNullable<typeof x> => !!x);
  const live = conns.filter((c) => c.state === "working").length;
  const on = sw ? AUTO_KEYS.filter((k) => sw[k]).length : 0;
  const off = sw ? AUTO_KEYS.length - on : 0;

  const you: Row[] = [
    { href: "/portal/me", icon: "me", title: "My file", line: "Your details, licences and what you can see" },
    { href: "/portal/notifications", icon: "bell", title: "Notifications", line: "For you: what needs doing and what’s new" },
    ...(admin ? [{ href: "/portal/admin", icon: "team", title: "People and access", line: "Who can sign in, and what each can see" }] : []),
    ...(office ? [{ href: "/portal/board/remote", icon: "wall", title: "Wall board", line: "The board in the office, and its screen link" }] : []),
  ];
  const records: Row[] = [
    { href: "/portal/customers", icon: "team", title: "Customers", line: "Find one by job, invoice or customer number" },
    { href: "/portal/locations", icon: "home", title: "Sites", line: "Units in villages and blocks" },
    { href: "/portal/chats", icon: "chat", title: "Messages", line: "Website, Messenger and Instagram chats" },
  ];
  const lines: Record<string, string> = { servicetitan: "Jobs, quotes, invoices · every few minutes", xero: "Invoices, bills and the bank", google: "Reviews and the website" };

  return (
    <PortalShell user={user}>
      <div className="pk">
        <KpiHead title="Settings" kpis={office ? [
          { icon: "trend", fig: String(on), label: `Running by itself${off ? ` · ${off} off` : ""}` },
          { icon: "trophy", fig: String(conns.length), label: "Connections", badge: conns.length ? (live === conns.length ? "all live" : `${conns.length - live} not live`) : undefined, tone: live === conns.length ? undefined : "down" },
        ] : []} />
        <p className="so-lede">Signed in as {user.name}{admin ? ", admin" : ""}.{office && conns.length ? ` ${conns.map((c) => `${c.name} ${c.state === "working" ? "is connected" : c.state === "attention" ? "needs a look" : "isn’t set up"}`).join(". ")}.` : ""}</p>
      </div>
      <div className="so">
        <Card title="You and the team" rows={you} />
        <Card title="Records" rows={records} />
        {office && (
          <Card title="Connections" rows={[
            ...conns.map((c) => ({ href: "/portal/integrations", icon: "globe", title: c.name, line: lines[Object.keys(lines).find((k) => c.k.toLowerCase().includes(k)) ?? ""] ?? c.does, end: <span className={`so-st ${STATE[c.state]}`}>{WORD[c.state]}</span> })),
            { href: "/portal/integrations", icon: "cog", title: "All integrations", line: "Reece, email, the wall board and the rest" },
          ]} />
        )}
        {office && (
          <Card title="How it runs" rows={[
            { href: "/portal/automatic", icon: "bolt", title: "Automatic", line: "What the portal does by itself after each sync", end: <span className="so-n">{on} on</span> },
            { href: "/portal/supply", icon: "box", title: "Ordering", line: "Suppliers, accounts and how orders go" },
            { href: "/portal/numbers", icon: "numbers", title: "Goals", line: "The year, month and week targets" },
            { href: "/portal/settings", icon: "cog", title: "Settings", line: "How it looks, where it opens, what the business has" },
          ]} />
        )}
      </div>
    </PortalShell>
  );
}
