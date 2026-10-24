import { STEPS, trackFor, type FlowStage } from "@/lib/jobflow/types";

/** Stages whose jobs went through a quote, so Quoted and Sold are steps they have. */
const QUOTING: FlowStage[] = ["toquote", "quoted", "closevisit", "sold"];

/**
 * Where a stage sits in a job's run from booked to paid, drawn once above its
 * list rather than on every row: every job in a stage is stuck at the same
 * step, and thirty copies of the same strip only made the list harder to read.
 * The stuck step is named in words ("stuck here"), never by its shading alone.
 */
export function StageSteps({ stage }: { stage: FlowStage }) {
  const t = trackFor(stage, { quotePath: QUOTING.includes(stage), visited: true });
  const steps = STEPS.filter((s) => t[s.k] !== "skip");
  return (
    <ol className="jf-steps" aria-label="Where these jobs are, from booked to paid">
      {steps.map((s) => (
        <li key={s.k} className={`is-${t[s.k]}`}>
          {t[s.k] === "done" ? <span aria-hidden="true">✓ </span> : null}
          {s.label}
          {t[s.k] === "now" ? <span className="jf-steps__here"> · stuck here</span> : null}
        </li>
      ))}
    </ol>
  );
}
