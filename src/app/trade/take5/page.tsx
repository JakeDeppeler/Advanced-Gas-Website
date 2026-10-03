import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { Take5Form } from "@/components/portal/Take5Form";
import { listTake5 } from "@/lib/portal/people";
import { HAZARDS } from "@/lib/portal/peopleParts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Take 5 — Trade portal" };

export default async function TradeTake5() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const mine = user.id ? await listTake5({ userId: user.id, limit: 5 }) : [];

  return (
    <TradeShell user={user} active="tools" title="Take 5" sub="Before the tools come out">
      <Take5Form />
      {mine.length > 0 && (
        <section className="tr-card">
          <h2 style={{ paddingBottom: 6 }}>Your last few</h2>
          <div className="tr-rows">
            {mine.map((t) => (
              <div key={t.id} className="tr-row" style={{ minHeight: 0 }}>
                <span className="tr-row__k">
                  <strong style={{ fontSize: 16 }}>{t.kind === "incident" ? "Incident reported" : t.job || "Take 5"}</strong>
                  <span>
                    {new Date(t.createdAt).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    {t.hazards.length ? ` · ${t.hazards.map((h) => HAZARDS.find((x) => x.k === h)?.label ?? h).join(", ")}` : ""}
                  </span>
                </span>
                {t.kind === "incident" && <span className={`tr-chip ${t.seenAt ? "tr-chip--good" : "tr-chip--info"}`}>{t.seenAt ? `Read by ${t.seenBy ?? "the office"}` : "With the office"}</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </TradeShell>
  );
}
