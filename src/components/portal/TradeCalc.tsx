"use client";

import { useState } from "react";
import { JOBS } from "@/components/portal/JobCalculator";
import { money2 } from "@/lib/portal/format";

/** The jobs with a standard price. "Something else" has none, so it has nothing
 *  to compare against and is left to the full calculator in the office. */
const PRICED = JOBS.filter((j) => j.min > 0);

/**
 * Does this job cover the time it takes?
 *
 * The question a tech asks in a driveway, and the only one this answers. The
 * full calculator — travel, materials, markup, after-hours — is in the office
 * portal; putting all of it on an iPad would bury the one figure that decides
 * whether to quote the job.
 *
 * Both rates are the office's own: if the crew has not been costed, this says
 * so instead of inventing an hourly figure, because a tech quoting off a made-up
 * number is exactly how a job gets taken at a loss.
 */
export function TradeCalc({ tradesman, apprentice, apprenticeRidesAlong }: {
  /** What an hour of a tradesman's time costs the business. */
  tradesman: number | null;
  /** What an apprentice adds to the crew for every hour they are on the job. */
  apprentice: number | null;
  apprenticeRidesAlong: boolean;
}) {
  const [pick, setPick] = useState(0);
  const [appr, setAppr] = useState(false);

  const job = PRICED[pick];
  const perHr = tradesman == null ? null : tradesman + (appr && apprentice != null ? apprentice : 0);
  const cost = perHr == null ? null : perHr * job.hrs;
  const left = cost == null ? null : job.min - cost;
  const ok = left != null && left >= 0;

  return (
    <div className="tr-split" style={{ ["--tr-side" as string]: "380px" }}>
      <section className="tr-card tr-stack" style={{ gap: 10 }}>
        <h2>The job</h2>
        {PRICED.map((j, i) => (
          <button
            key={j.k} type="button" aria-pressed={i === pick} onClick={() => setPick(i)}
            className={`tr-choice${i === pick ? " is-on" : ""}`} style={{ justifyContent: "space-between", minHeight: 56 }}
          >
            <span>{j.label}</span>
            <span className="tr-small" style={{ fontWeight: 700 }}>${j.min} · {j.hrs} hrs</span>
          </button>
        ))}
        <button
          type="button" aria-pressed={appr} onClick={() => setAppr(!appr)}
          className={`tr-choice${appr ? " is-on" : ""}`} style={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "center", minHeight: 64, gap: 2 }}
          disabled={apprentice == null}
        >
          <span>{appr ? "Apprentice · on" : "+ Add an apprentice"}</span>
          <span className="tr-small" style={{ fontWeight: 600 }}>
            {apprentice == null
              ? "No apprentice costed yet"
              : `Adds ${money2(apprentice)}/hr to what the job costs${apprenticeRidesAlong ? " — their whole cost, over the van's hours" : ""}`}
          </span>
        </button>
      </section>

      <section className="tr-card tr-stack" style={{ gap: 12 }}>
        <span className="tr-muted" style={{ fontWeight: 700 }}>{job.label}</span>
        <div className="tr-rows">
          <div className="tr-row"><span className="tr-row__k"><strong>Price</strong></span><span className="tr-big" style={{ fontSize: 30 }}>${job.min}</span></div>
          <div className="tr-row"><span className="tr-row__k"><strong>Cost of the time</strong></span><span className="tr-big" style={{ fontSize: 30 }}>{cost == null ? "—" : money2(cost)}</span></div>
        </div>

        {left == null ? (
          <div className="tr-note tr-note--grey">
            <strong style={{ display: "block", fontSize: 17 }}>Not costed yet</strong>
            The office sets the crew&rsquo;s hours and wages on Our numbers. Until that&rsquo;s done
            there is no hourly figure to measure a job against.
          </div>
        ) : (
          <div className={`tr-note ${ok ? "tr-note--good" : "tr-note--warn"}`}>
            <span style={{ display: "block", fontSize: 15 }}>{ok ? "Left in it" : "Losing money on this"}</span>
            <strong style={{ fontFamily: "var(--f-display)", fontSize: 26, fontWeight: 900 }}>{money2(left)} · {Math.round((left / job.min) * 100)}%</strong>
          </div>
        )}

        {perHr != null && (
          <p className="tr-small">
            {appr ? "The two of you cost" : "Your time costs"} the business {money2(perHr)} an hour.
            Travel, materials and after-hours aren&rsquo;t in this — the office calculator has those.
          </p>
        )}
      </section>
    </div>
  );
}
