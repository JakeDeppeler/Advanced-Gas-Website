"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type PickerResult = {
  when: Record<string, string>;
  why: string;
  model: string;
  img: string;
  tier: string;
  price: string | null;
  href: string;
  book: string;
};
type Step = { id: string; q: string; opts: { v: string; l: string }[]; if?: Record<string, string> };

const fits = (want: Record<string, string>, ans: Record<string, string>) => Object.entries(want).every(([k, v]) => ans[k] === v);

/**
 * "Which one is right for you?": one question at a time, then the option
 * it lands on, with links to its page and to a quote for it. The questions
 * and answers live in the brand's `picker` in lib/brands.ts; this only asks
 * them. Every step is a set of buttons, so it works by keyboard and needs
 * no typing.
 */
export function SystemPicker({ brand, steps, results }: { brand: string; steps: Step[]; results: PickerResult[] }) {
  const [ans, setAns] = useState<Record<string, string>>({});
  const asked = steps.filter((s) => !s.if || fits(s.if, ans));
  const next = asked.find((s) => !(s.id in ans));
  const result = next ? null : results.find((r) => fits(r.when, ans)) ?? null;
  const done = asked.filter((s) => s.id in ans).length;

  return (
    <div className="sp">
      <div className="sp__bar" aria-hidden="true"><span style={{ width: `${next ? (done / (done + 2)) * 100 : 100}%` }} /></div>
      {next ? (
        <div className="sp__step" key={next.id}>
          {/* No "of N": how many questions there are depends on the answers. */}
          <span className="sp__count">Question {done + 1}</span>
          <h3 className="sp__q">{next.q}</h3>
          <div className="sp__opts">
            {next.opts.map((o) => (
              <button key={o.v} type="button" className="sp__opt" onClick={() => setAns({ ...ans, [next.id]: o.v })}>
                {o.l}<i aria-hidden="true">→</i>
              </button>
            ))}
          </div>
          {done > 0 && <button type="button" className="sp__back" onClick={() => setAns({})}>Start again</button>}
        </div>
      ) : result ? (
        <div className="sp__res" key={result.model + JSON.stringify(ans)} aria-live="polite">
          <span className="sp__img"><Image src={result.img} alt="" fill sizes="(max-width: 700px) 80vw, 300px" /></span>
          <div className="sp__rtxt">
            <span className="sp__count">We&apos;d fit</span>
            <h3 className="sp__model">{brand} {result.model}</h3>
            <p>{result.why}</p>
            {result.price && <strong className="sp__price">From {result.price} installed</strong>}
            <div className="sp__ctas">
              <Link href={result.book} className="abtn abtn--or abtn--flat">Get a quote for this →</Link>
              <Link href={result.href} className="abtn abtn--ghost">See the {result.model}</Link>
            </div>
            <button type="button" className="sp__back" onClick={() => setAns({})}>Start again</button>
          </div>
        </div>
      ) : (
        <div className="sp__step">
          <h3 className="sp__q">Best talked through on site.</h3>
          <p>Book a free site check and we&apos;ll size it room by room.</p>
          <button type="button" className="sp__back" onClick={() => setAns({})}>Start again</button>
        </div>
      )}
    </div>
  );
}
