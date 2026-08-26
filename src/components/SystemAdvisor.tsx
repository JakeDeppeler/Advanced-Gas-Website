"use client";

import Link from "next/link";
import { useState } from "react";
import { ADVISORS, resolveAdvice } from "@/lib/advisor";

/**
 * The three-question box inside "Is it right for you".
 *
 * It replaced a right-call / think-twice pair of columns, which said the
 * same thing in the abstract. This asks about the actual house and gives
 * one answer, and it is allowed to send somebody off the page — reading
 * about splits and wanting the whole house done lands on ducted, and a
 * dead tank lands on the hire unit rather than a form.
 *
 * Questions and rules live in lib/advisor.ts, one set per service,
 * because aircon is about rooms and roof space while hot water is about
 * how many people shower. One generic set would be useless on both.
 *
 * Runs in the browser. Nothing recorded, nothing sent.
 */
export function SystemAdvisor({ service }: { service: string }) {
  const cfg = ADVISORS[service];
  const [picked, setPicked] = useState<(string | null)[]>([null, null, null]);
  if (!cfg) return null;

  const answer = resolveAdvice(cfg, picked);
  const choose = (qi: number, id: string) =>
    setPicked((prev) => prev.map((p, i) => (i === qi ? id : p)));

  return (
    <div className="advisor">
      <div className="advisor__head">
        {/* This is the section head now — the page used to put one on the
            sand above the box and then this one inside it. */}
        <span className="advisor__lbl">Narrow it down</span>
        <h2>Which one is right for my&nbsp;home?</h2>
        <p>{cfg.lede} Runs in your browser — nothing recorded, nothing sent.</p>
      </div>

      {cfg.questions.map((q, qi) => (
        <fieldset className="advisor__q" key={q.id}>
          <legend>{q.ask}</legend>
          <div className={`advisor__opts${q.options.some((o) => o.sub) ? "" : " advisor__opts--tight"}`}>
            {q.options.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`advisor__opt${o.sub ? "" : " advisor__opt--sm"}${picked[qi] === o.id ? " is-on" : ""}`}
                aria-pressed={picked[qi] === o.id}
                onClick={() => choose(qi, o.id)}
              >
                <strong>{o.label}</strong>
                {o.sub && <span>{o.sub}</span>}
              </button>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="advisor__out" aria-live="polite">
        {answer ? (
          <div className="advisor__answer" key={answer.heading}>
            <span className="advisor__outlbl">What we&rsquo;d do</span>
            <h4>{answer.heading}</h4>
            <p>{answer.body}</p>
            {answer.note && <p className="advisor__note">{answer.note}</p>}
            <Link href={answer.href} className="ds-btn advisor__cta">
              {answer.cta} →
            </Link>
          </div>
        ) : (
          <p className="advisor__waiting">Answer the three and the answer appears here.</p>
        )}
      </div>
    </div>
  );
}
