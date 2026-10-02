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
    <div className="tr-split" style={{ ["--tr-cols" as string]: "minmax(0, 1fr) 380px" }}>
      <section className="tr-card tr-stack" style={{ gap: 12 }}>
        <h2>The job</h2>
        {PRICED.map((j, i) => (
          <button
            key={j.k} type="button" aria-pressed={i === pick} onClick={() => setPick(i)}
            className={`tr-opt${i === pick ? " is-on" : ""}`}
          >
            <strong>{j.label}</strong>
            <span>${j.min} · {j.hrs} hrs</span>
          </button>
        ))}
        <button
          type="button" aria-pressed={appr} onClick={() => setAppr(!appr)}
          className={`tr-opt tr-opt--add${appr ? " is-on" : ""}`}
          disabled={apprentice == null}
        >
          <strong>{appr ? "Apprentice · on" : "+ Add an apprentice"}</strong>
          <span>
            {apprentice == null
              ? "No apprentice costed yet"
              : `Adds ${money2(apprentice)}/hr to what the job costs${apprenticeRidesAlong ? " — their whole cost, over the van's hours" : ""}`}
          </span>
        </button>
      </section>

      <section className="tr-panel tr-stack" style={{ gap: 12 }}>
        <span className="tr-sub">{job.label}</span>
        <div className="tr-rows">
          <div className="tr-row">
            <span>Price</span>
            <strong className="tr-row__v" style={{ fontSize: 28, fontWeight: 900 }}>${job.min}</strong>
          </div>
          <div className="tr-row">
            <span>Cost of the time</span>
            <strong className="tr-row__v" style={{ fontSize: 28, fontWeight: 900 }}>{cost == null ? "—" : money2(cost)}</strong>
          </div>
        </div>

        {left == null ? (
          <div className="tr-outcome">
            <strong>Not costed yet</strong>
            <span className="tr-foot">
              The office sets the crew&rsquo;s hours and wages on the costs &amp; capacity page. Until that&rsquo;s done
              there is no hourly figure to measure a job against.
            </span>
          </div>
        ) : (
          <div className={`tr-outcome${ok ? "" : " is-bad"}`}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{ok ? "Left in it" : "Losing money on this"}</span>
            <strong>{money2(left)} · {Math.round((left / job.min) * 100)}%</strong>
          </div>
        )}

        {perHr != null && (
          <span className="tr-foot">
            {appr ? "The two of you cost" : "Your time costs"} the business {money2(perHr)} an hour.
            Travel, materials and after-hours aren&rsquo;t in this — the office calculator has those.
          </span>
        )}
      </section>
    </div>
  );
}
