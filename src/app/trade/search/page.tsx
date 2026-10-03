import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell, Ic } from "@/components/portal/TradeShell";
import { FAULT_CODES, FAULT_SYSTEM_LABELS } from "@/lib/faultCodes";
import { allSops } from "@/lib/portal/sops";
import { HANDBOOK, INFO_SECTIONS } from "@/lib/portal/content";
import { PB_CATEGORIES } from "@/lib/portal/installPrices";
import { productHref, shelfProducts } from "@/lib/portal/pricebook";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search — Trade portal" };

type Hit = { href: string; title: string; sub: string };

/** One box over everything a tech looks up: codes, procedures, prices, the handbook, the pricebook. */
export default async function TradeSearch({ searchParams }: { searchParams: { q?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const q = (searchParams.q ?? "").trim();
  const n = q.toLowerCase();
  const has = (s: string) => s.toLowerCase().includes(n);
  const groups: { label: string; hits: Hit[] }[] = n ? [
    {
      label: "Fault codes",
      hits: FAULT_CODES.filter((f) => has(`${f.code} ${f.brand} ${f.meaning}`)).slice(0, 8)
        .map((f) => ({ href: `/trade/codes?q=${encodeURIComponent(f.code)}`, title: `${f.code} · ${f.meaning}`, sub: `${f.brand} · ${FAULT_SYSTEM_LABELS[f.system]} · ${f.firstCheck}` })),
    },
    {
      label: "Processes",
      hits: allSops().filter(({ sop }) => has(`${sop.code} ${sop.title}`)).slice(0, 8)
        .map(({ section, sop }) => ({ href: `/trade/processes?sec=${section.slug}&sop=${sop.code}`, title: `${sop.code} · ${sop.title}`, sub: section.title })),
    },
    {
      label: "Prices & info",
      hits: INFO_SECTIONS.flatMap((s) => s.blocks.flatMap((b) => (b.rows ?? []).map((r) => ({ s, r }))))
        .filter(({ r }) => has(`${r.k} ${r.v}`)).slice(0, 8)
        .map(({ s, r }) => ({ href: `/trade/info?section=${s.slug === "pricing" ? "pricing" : s.slug}`, title: r.k, sub: r.v })),
    },
    {
      label: "Pricebook",
      hits: PB_CATEGORIES.flatMap((c) => shelfProducts(c.key)).filter((p) => has(`${p.brand} ${p.name}`)).slice(0, 8)
        .map((p) => ({ href: productHref(p), title: `${p.brand} ${p.name}`, sub: p.priceLabel ?? "Priced on site" })),
    },
    {
      label: "Handbook",
      hits: HANDBOOK.flatMap((s) => s.items.map((t) => ({ s, t }))).filter(({ t }) => has(t.title)).slice(0, 8)
        .map(({ s, t }) => ({ href: `/trade/handbook?shelf=${s.letter}&topic=${encodeURIComponent(t.title)}`, title: t.title, sub: `${s.letter} · ${s.title}` })),
    },
  ].filter((g) => g.hits.length) : [];

  return (
    <TradeShell user={user} active="tools" title="Search" sub={q ? `“${q}”` : "Fault codes, processes, prices"}>
      <form action="/trade/search" className="tr-search">
        <Ic n="search" size={20} />
        <input type="search" name="q" defaultValue={q} placeholder="Search fault codes, processes, prices…" aria-label="Search" autoFocus />
      </form>
      {groups.map((g) => (
        <section key={g.label} className="tr-card">
          <h2 style={{ paddingBottom: 4 }}>{g.label}</h2>
          <div className="tr-rows">
            {g.hits.map((h) => (
              <Link key={h.href + h.title} href={h.href} className="tr-row">
                <span className="tr-row__k"><strong style={{ fontSize: 16.5 }}>{h.title}</strong><span>{h.sub}</span></span>
                <span className="tr-row__go"><Ic n="chevron" size={18} /></span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {n && !groups.length && <p className="tr-card tr-empty">Nothing matches &ldquo;{q}&rdquo;. Try a code like P5, a brand, or a word like ladder.</p>}
    </TradeShell>
  );
}
