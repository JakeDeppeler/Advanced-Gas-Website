import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { site } from "@/lib/site";
import { ANSWERS, isAnswer } from "@/lib/quotes/answerTypes";
import { answerSigOk, quoteFor, recordAnswer } from "@/lib/quotes/answers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your quote", robots: { index: false, follow: false } };

type Props = { params: { estimate: string; answer: string }; searchParams: { s?: string; done?: string } };

/**
 * Where a one-tap answer in a quote follow-up lands: a plain page with one
 * button. Pressing it records the answer and tells the office (answers.ts);
 * just opening the link doesn't, because mail scanners open every link.
 */
export default async function QuoteAnswerPage({ params, searchParams }: Props) {
  const estimate = Number(params.estimate);
  const a = params.answer;
  const s = searchParams.s ?? "";
  if (!Number.isInteger(estimate) || estimate < 0 || !isAnswer(a) || !answerSigOk(estimate, a, s)) notFound();
  const copy = ANSWERS[a];
  const qt = await quoteFor(estimate);

  async function confirm(form: FormData) {
    "use server";
    if (!isAnswer(a) || !answerSigOk(estimate, a, s)) return;
    const note = String(form.get("note") ?? "").trim() || null;
    await recordAnswer(estimate, a, note);
    redirect(`/q/${estimate}/${a}?s=${s}&done=1`);
  }

  const done = searchParams.done === "1";
  return (
    <section style={{ padding: "96px 0 120px", background: "var(--bg)" }}>
      <div className="wrap" style={{ maxWidth: 560 }}>
        <h1 style={{ fontFamily: "var(--f-display)", fontWeight: 800, fontSize: "clamp(30px, 4vw, 40px)", letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--navy)", textWrap: "balance" }}>
          {done ? (a === "no" ? "All done." : "Thanks!") : qt.first ? `${copy.heading.replace(/\.$/, "")}, ${qt.first}.` : copy.heading}
        </h1>
        <p style={{ marginTop: 14, fontSize: 18, lineHeight: 1.6, color: "var(--ink-2)" }}>{done ? copy.done : copy.ask}</p>
        {!done && (
          <form action={confirm} style={{ marginTop: 24, display: "grid", gap: 14 }}>
            {copy.note && (
              <label style={{ display: "grid", gap: 6, fontSize: 15, color: "var(--ink-2)" }}>
                {copy.note}
                <textarea name="note" rows={3} maxLength={1000} style={{ font: "inherit", fontSize: 16, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line, #ddd)", background: "#fff", color: "var(--navy)" }} />
              </label>
            )}
            <div>
              <button type="submit" className="ds-btn ds-btn--orange ds-btn--lg">{copy.confirm}</button>
            </div>
          </form>
        )}
        <p style={{ marginTop: 28, fontSize: 16, color: "var(--ink-2)" }}>
          Rather talk now? Call us on <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)", fontWeight: 700 }}>{site.phone}</a>.
        </p>
        {estimate === 0 && <p style={{ marginTop: 24, fontSize: 13, color: "var(--ink-3)" }}>This is the preview: nothing is recorded or sent.</p>}
      </div>
    </section>
  );
}
