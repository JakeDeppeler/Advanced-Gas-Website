import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell, VanTabs, Ic } from "@/components/portal/TradeShell";
import { NoVan, Chip } from "@/components/portal/tradeVan";
import { ToolAsk } from "@/components/portal/ToolAsk";
import { dbConfigured, vehicleFor } from "@/lib/portal/db";
import { listTools } from "@/lib/portal/van";
import { TOOL_KINDS, TOOL_REQUEST, monthYear, shortDate, toolChip, toolState, type VanTool, type ToolState } from "@/lib/portal/vanParts";
import { localToday } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tools & gear — Trade portal" };

type Show = "all" | "due" | "old" | "broken";

/**
 * The tools signed to your van: what's due a service or a tag, what's near the
 * end of its life, and asking for something to be done about one.
 */
export default async function TradeVanTools({ searchParams }: { searchParams: { tool?: string; kind?: string; show?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const van = user.id && dbConfigured() ? await vehicleFor(user.id).catch(() => null) : null;
  const tools = van ? await listTools(van.id) : null;
  const today = localToday();

  const head = (
    <TradeShell user={user} active="van" title="Tools & gear" sub="The tools signed to your van · service, tags, age, and asking for a new one">
      <VanTabs on="tools" />
      {!van ? <NoVan /> : tools == null ? (
        <p className="tr-card tr-empty">The tool register can&rsquo;t be read right now.</p>
      ) : tools.length === 0 ? (
        <section className="tr-card tr-stack">
          <h2>Nothing on the register yet</h2>
          <p className="tr-muted">
            The office puts each tool on the van here — what it is, when it was bought, and when it&rsquo;s next due a
            service or a test and tag. Once they&rsquo;re on, you can report one broken or due from this screen.
          </p>
        </section>
      ) : null}
    </TradeShell>
  );
  if (!van || !tools || tools.length === 0) return head;

  const all = tools.map((t) => ({ t, s: toolState(t, today) }));
  const counts = {
    all: all.length,
    due: all.filter(({ s }) => s.due).length,
    old: all.filter(({ s }) => s.old).length,
    broken: all.filter(({ s }) => s.broken).length,
  };
  const show: Show = (["due", "old", "broken"] as const).find((x) => x === searchParams.show) ?? "all";
  const kinds = TOOL_KINDS.filter((k) => all.some(({ t }) => t.kind === k.k));
  const kind = kinds.find((k) => k.k === searchParams.kind)?.k ?? null;
  const shown = all
    .filter(({ s }) => show === "all" || (show === "due" ? s.due : show === "old" ? s.old : s.broken))
    .filter(({ t }) => !kind || t.kind === kind);
  const asked = all.filter(({ t }) => t.request);
  const picked = all.find(({ t }) => t.id === searchParams.tool) ?? asked[0] ?? shown[0] ?? all[0];

  const href = (p: { tool?: string; kind?: string | null; show?: Show }) => {
    const qs = new URLSearchParams();
    const k = p.kind === undefined ? kind : p.kind;
    const sh = p.show ?? show;
    if (sh !== "all") qs.set("show", sh);
    if (k) qs.set("kind", k);
    if (p.tool) qs.set("tool", p.tool);
    const s = qs.toString();
    return `/trade/van/tools${s ? `?${s}` : ""}`;
  };

  const SUM: { k: Show; n: number; t: string; s: string; tone?: "warn" | "bad" }[] = [
    { k: "all", n: counts.all, t: "On the van", s: "Everything signed to you" },
    { k: "due", n: counts.due, t: "Service or tag due", s: "In the next month", tone: "warn" },
    { k: "old", n: counts.old, t: "Getting old", s: "Near or past its life", tone: "warn" },
    { k: "broken", n: counts.broken, t: "Broken", s: "Tell the office", tone: "bad" },
  ];

  return (
    <TradeShell user={user} active="van" title="Tools & gear" sub="The tools signed to your van · service, tags, age, and asking for a new one">
      <VanTabs on="tools" />
      <div className="tr-grid tr-grid--4">
        {SUM.map((x) => (
          <Link key={x.k} href={href({ show: x.k, kind: null })} className={`tr-card tr-sumtile${show === x.k ? " is-on" : ""}`} aria-current={show === x.k ? "true" : undefined}>
            <span className={`tr-sumtile__n${x.tone && x.n ? ` tr-sumtile__n--${x.tone}` : ""}`}>{x.n}</span>
            <span><strong>{x.t}</strong><span>{x.s}</span></span>
          </Link>
        ))}
      </div>

      <div className="tr-split" style={{ ["--tr-side" as string]: "380px" }}>
        <div className="tr-stack">
          {asked.length > 0 && (
            <section className="tr-card">
              <h2 style={{ paddingBottom: 4 }}>With the office</h2>
              <div className="tr-rows">
                {asked.map(({ t, s }) => (
                  <Link key={t.id} href={href({ tool: t.id })} className="tr-row">
                    <span className="tr-row__k">
                      <strong style={{ fontSize: 17 }}>{t.name}</strong>
                      <span>{TOOL_REQUEST.find((r) => r.k === t.request)?.label}{t.requestedAt ? ` · reported ${shortDate(t.requestedAt)}` : ""}</span>
                    </span>
                    <Chip c={toolChip(t, s)} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="tr-card tr-stack" style={{ gap: 12 }}>
            {kinds.length > 1 && (
              <div className="tr-pills">
                <Link href={href({ kind: null })} className={`tr-pill tr-pill--sm${!kind ? " is-on" : ""}`}>All</Link>
                {kinds.map((k) => (
                  <Link key={k.k} href={href({ kind: k.k })} className={`tr-pill tr-pill--sm${kind === k.k ? " is-on" : ""}`}>{k.label}</Link>
                ))}
              </div>
            )}
            <div className="tr-rows">
              {shown.map(({ t, s }) => <ToolRow key={t.id} t={t} s={s} on={t.id === picked.t.id} href={href({ tool: t.id })} />)}
              {shown.length === 0 && <p className="tr-empty" style={{ padding: "10px 0" }}>Nothing in this list.</p>}
            </div>
          </section>
        </div>

        <ToolDetail t={picked.t} s={picked.s} />
      </div>
    </TradeShell>
  );
}

function ToolRow({ t, s, on, href }: { t: VanTool; s: ToolState; on: boolean; href: string }) {
  return (
    <Link href={href} className={`tr-row${on ? " is-on" : ""}`} aria-current={on ? "true" : undefined}>
      <span className="tr-row__k">
        <strong style={{ fontSize: 17 }}>{t.name}</strong>
        <span>{[t.model, s.age, t.requestNote].filter(Boolean).join(" · ") || "No details yet"}</span>
      </span>
      {s.lifePct != null && (
        <span className={`tr-life${s.old ? " is-warn" : ""}`} title={`${Math.round(s.lifePct * 100)}% of its life`}>
          <span style={{ width: `${Math.min(100, s.lifePct * 100)}%` }} />
        </span>
      )}
      <Chip c={toolChip(t, s)} />
      <span className="tr-row__go"><Ic n="chevron" size={16} /></span>
    </Link>
  );
}

function ToolDetail({ t, s }: { t: VanTool; s: ToolState }) {
  const kind = TOOL_KINDS.find((k) => k.k === t.kind)?.label ?? "Other";
  return (
    <aside className="tr-card tr-stack" style={{ gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontSize: 23, fontWeight: 900 }}>{t.name}</h2>
          {t.model && <span className="tr-muted">{t.model}</span>}
        </div>
        <Chip c={toolChip(t, s)} />
      </div>

      {s.lifePct != null && t.lifeYears != null && (
        <div className="tr-stack tr-stack--sm">
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 15 }}>
            <span>{s.age} old</span>
            <span className="tr-muted" style={{ fontWeight: 600 }}>lasts about {t.lifeYears} yrs</span>
          </div>
          <div className="tr-bar tr-bar--thin" aria-hidden="true"><span style={{ width: `${Math.min(100, s.lifePct * 100)}%` }} /></div>
          {s.old && <span style={{ color: "var(--tr-orange-ink)", fontWeight: 800, fontSize: 15 }}>Near the end of its life — worth asking for a new one.</span>}
        </div>
      )}
      {t.request && t.requestNote && <p style={{ color: "var(--tr-orange-ink)", fontWeight: 800 }}>{t.requestNote}</p>}

      <div className="tr-kv">
        <div><span>Bought</span><strong>{t.boughtOn ? monthYear(t.boughtOn) : "Not recorded"}</strong></div>
        <div><span>Kind</span><strong>{kind}</strong></div>
        <div><span>Last done</span><strong>{t.lastDoneOn ? `${t.lastDone || "Done"} ${monthYear(t.lastDoneOn)}` : "Not recorded"}</strong></div>
        <div><span>Next due</span><strong>{t.nextDueOn ? `${t.nextDue || "Due"} ${monthYear(t.nextDueOn)}` : "Nothing set"}</strong></div>
      </div>

      {t.request && (
        <p className="tr-note">
          {t.reply ? `The office: ${t.reply}` : `With the office since ${t.requestedAt ? shortDate(t.requestedAt) : "it was reported"}. The answer shows here.`}
        </p>
      )}

      <ToolAsk toolId={t.id} current={t.request} />
    </aside>
  );
}
