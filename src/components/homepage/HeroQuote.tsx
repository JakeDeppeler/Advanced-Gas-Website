"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FSVC, QB, SIZE_NOTE, PHOTO_TIP, findSystem, answerMap, shownOpts,
  type Answers, type Question,
} from "@/lib/homepage/data";
import { onIntent, sendIntent } from "@/lib/homepage/intent";
import { QuoteDetails, type LeadDraft } from "./QuoteDetails";
import { Svg } from "./Svg";

/**
 * The hero quote form: what it is → which type → install, service or repair
 * → that job's questions → when → whose home → details, with photos
 * optional once it's sent (QuoteDetails).
 *
 * A finder option's quote used to come back up here ("book"); it now stays
 * in Find your system, which has the same details step (Jake, 28 Nov 2026:
 * "it currently jumps back up but it shouldn't do that").
 */

/**
 * `installsToFinder`: the home page's form (Jake, 25 Nov 2026: "if its an
 * instal it moves down to Find your system and all the others stay and use
 * the top one"). A new cooling, heating or hot water system goes to the
 * finder below, opened at that system, where the options sit side by side
 * and the details are taken there too. Services, repairs,
 * and gas or commercial installs (which the finder has no options for) carry
 * on in this form. Other pages have no finder to send to, so they leave it off.
 */
export function HeroQuote({ installsToFinder = false }: { installsToFinder?: boolean } = {}) {
  const [svc, setSvc] = useState<number | null>(null);
  const [type, setType] = useState<number | null>(null);
  const [intent, setIntent] = useState<number | null>(null);
  const [ans, setAns] = useState<Answers>({});
  const [pos, setPos] = useState(0);
  const [sent, setSent] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  const fs = svc == null ? null : FSVC[svc];
  const ft = fs && type != null ? fs.types[type] : null;
  const fi = ft && intent != null ? ft.intents[intent] : null;
  const typeQs: Question[] = fi ? fi.qs : [];
  const asksUrgent = typeQs.some((q) => q.id === "urgent");
  const biz = fi?.biz ?? fs?.biz ?? false;
  // "Is this your home?" was cut (Jake, Nov 2026): it slowed the form and the
  // site check answers it anyway. Businesses still say who they are, since a
  // strata or facility manager changes who we quote.
  const tailQs: Question[] = [...(asksUrgent ? [] : [QB.when]), ...(biz ? [QB.ownBiz] : [])];
  const allQs = [...typeQs, ...tailQs];

  const steps = useMemo(() => {
    let s: string[] = ["svc", ...(fs ? ["type"] : []), ...(ft && ft.intents.length > 1 ? ["intent"] : [])];
    if (fi) s = [...s, ...allQs.map((q) => `q:${q.id}`), "details"];
    return s;
    // allQs is derived from these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fs, ft, fi]);

  const at = Math.min(pos, Math.max(steps.length - 1, 0));
  const cur = steps[at] ?? "svc";
  const curQ = cur.startsWith("q:") ? allQs.find((q) => `q:${q.id}` === cur) ?? null : null;
  const known = !!fi;
  const total = known ? steps.length : 6;

  const label = (q: Question) => (ans[q.id] == null ? null : q.opts[ans[q.id]].label);
  const job = [fs?.t, ft?.label, ft && ft.intents.length > 1 ? fi?.label : null].filter((x): x is string => !!x);
  const chips = [...job, ...allQs.map(label)].filter((x): x is string => !!x);
  const summary = [...job, fi && typeQs[0] ? label(typeQs[0]) : null].filter(Boolean).join(" · ");

  // A card that starts the form at a service. (A finder option's quote is
  // the finder's own now; see the note at the top.)
  useEffect(() => onIntent((i) => {
    if (i.kind === "quote") {
      reset();
      if (i.service != null) { setSvc(i.service); setPos(1); }
      return true;
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  function reset() {
    setSvc(null); setType(null); setIntent(null); setAns({}); setPos(0); setSent(false);
  }

  function go(n: number) {
    setPos(n);
    // On a phone the card is taller than the screen; keep the question in view.
    const el = ref.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  }

  function pickAnswer(q: Question, i: number) {
    setAns((a) => ({ ...a, [q.id]: i }));
    go(at + 1);
  }

  /** Which `service` the lead is filed under. Matches the old form's ids where there is one. */
  function service(): string {
    if (fi?.service) return fi.service;
    const sys = ft?.system ? findSystem(ft.system) : null;
    if (sys) return sys.sys.service;
    return fs?.service ?? "other";
  }

  /** The lead as it stands when they press Send. */
  function draft(): LeadDraft {
    const answers = answerMap(allQs, ans);
    const when = ans.urgent != null ? QB.urgent.opts[ans.urgent].label : ans.when != null ? QB.when.opts[ans.when].label : undefined;
    const own = biz && ans.own != null ? QB.ownBiz.opts[ans.own].label : undefined;
    return {
      service: service(),
      summary: [summary, ...Object.values(answers).filter((v) => !summary.includes(v))].join(" · "),
      details: { answers, job: job.join(" · ") },
      timing: when, propertyType: own,
    };
  }

  const tip = (fs?.cat && PHOTO_TIP[fs.cat]) || "A photo of the unit, its label or the problem helps us price it faster.";

  return (
    <div id="quote" className="qf anim" ref={ref} style={{ animationDelay: ".12s" }}>
      <div className="qf__head">
        {at > 0 && !sent && (
          <button type="button" className="qf__back" onClick={() => go(at - 1)}>← Back</button>
        )}
        <span className="mono qf__count" aria-live="polite">{sent ? "Sent" : known ? `Step ${at + 1} of ${total}` : `Step ${at + 1}`}</span>
      </div>
      <div className="qf__bar" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
        {Array.from({ length: total }, (_, i) => <span key={i} className={i <= at ? "on" : ""} />)}
      </div>

      {cur === "svc" && (
        <div className="qf__step qf__step--first">
          <div>
            <h2 className="qf__h">What can we help with?</h2>
            <p className="qf__sub">A few quick taps, then your details.</p>
          </div>
          {/* The same rows as every later step, so the form reads as one thing from the first tap. */}
          <div className="qf__opts">
            {FSVC.map((x, i) => (
              <button key={x.t} type="button" className={`qf__opt${svc === i ? " qf__opt--on" : ""}`} style={{ animationDelay: `${i * 0.07}s` }}
                onClick={() => { setSvc(i); setType(null); setIntent(null); setAns({}); go(1); }}>
                <span className="qf__ti" style={{ background: x.bg, color: x.fg }}><Svg d={x.icon} size={18} /></span>
                <span className="qf__optt"><strong>{x.t}</strong><small>{x.s}</small></span>
                <span className="qf__go" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {cur === "type" && fs && (
        <div className="qf__step qf__step--fill">
          <div><span className="qf__crumb">{fs.t}</span><h2 className="qf__h">{fs.q}</h2></div>
          <div className={`qf__types${fs.types.length < 4 ? " qf__types--few" : ""}`}>
            {fs.types.map((y, i) => (
              <button key={y.label} type="button" className={`qf__type${type === i ? " qf__type--on" : ""}`} style={{ animationDelay: `${i * 0.07}s` }}
                onClick={() => { setType(i); setIntent(y.intents.length === 1 ? 0 : null); setAns({}); go(2); }}>
                <span className="qf__typeimg">
                  {y.img ? <Image src={y.img} alt="" fill sizes="180px" /> : <Svg d={y.icon ?? ""} size={34} stroke="#0C6F96" width={1.6} />}
                </span>
                <span className="qf__typet">{y.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {cur === "intent" && ft && (
        <div className="qf__step qf__step--fill">
          <div><span className="qf__crumb">{[fs?.t, ft.label].join(" · ")}</span><h2 className="qf__h">What do you need?</h2></div>
          <div className="qf__opts">
            {ft.intents.map((x, i) => {
              // The form stays where it is, so Back up here still offers a service or repair.
              const down = installsToFinder && x.install && !!ft.system;
              return (
                <button key={x.label} type="button" className={`qf__opt qf__opt--big${intent === i ? " qf__opt--on" : ""}`} style={{ animationDelay: `${i * 0.07}s` }}
                  onClick={() => {
                    if (down) { sendIntent({ kind: "find", system: ft.system }, "find"); return; }
                    setIntent(i); setAns({}); go(at + 1);
                  }}>
                  <span className="qf__ti qf__ti--line"><Svg d={x.icon} size={20} /></span>
                  <span className="qf__optt"><strong>{x.label}</strong><small>{down ? "Compare the options side by side, just below" : x.sub}</small></span>
                  <span className="qf__go" aria-hidden="true">{down ? "↓" : "→"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {curQ && (
        <div className="qf__step qf__step--fill" key={cur}>
          <div>
            <span className="qf__crumb">{job.join(" · ")}</span>
            <h2 className="qf__h">{curQ.q}</h2>
          </div>
          <div className="qf__opts">
            {shownOpts(curQ, ans).map(({ o: z, i }, k) => (
              <button key={z.label} type="button" className={`qf__opt${ans[curQ.id] === i ? " qf__opt--on" : ""}`} style={{ animationDelay: `${k * 0.07}s` }} onClick={() => pickAnswer(curQ, i)}>
                {z.n ? (
                  <span className="qf__bars" aria-hidden="true">
                    {[1, 2, 3].map((b) => <i key={b} className={b <= Math.min(z.n ?? 0, 3) ? "on" : ""} />)}
                  </span>
                ) : null}
                <span className="qf__optt"><strong>{z.label}</strong>{z.sub && <small>{z.sub}</small>}</span>
                {z.spec && <span className="qf__spec">{z.spec}</span>}
              </button>
            ))}
          </div>
          {curQ.size && <p className="qf__fine qf__fine--l">{SIZE_NOTE}</p>}
        </div>
      )}

      {/* The card holds one height on every step; on the picking steps this
          sits at its foot, so the space under a short list reads as intended. */}
      {(cur === "svc" || cur === "type" || cur === "intent" || curQ) && (
        <p className="qf__foot">Free quote, no obligation. Usually back within 12 business hours.</p>
      )}

      {cur === "details" && (
        <QuoteDetails lead={draft} chips={chips} about={ft ? `your ${ft.label.toLowerCase()}` : "your enquiry"} tip={tip}
          urgent={ans.urgent === 0} onSent={() => setSent(true)} onRestart={reset} />
      )}
    </div>
  );
}

