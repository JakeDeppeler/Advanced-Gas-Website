import { STEPS, type Step, type StepState } from "@/lib/jobflow/types";

const SAY: Record<StepState, string> = { done: "done", now: "stuck here", todo: "to come", skip: "not a step for this job" };

/**
 * A job from booked to paid in one line: the steps it has passed, the one it's
 * stuck at, and what's still to come. Where it's stuck is written out beside
 * the dots in words, so the strip never relies on the dots' shading alone.
 */
export function Track({ track }: { track: Record<Step, StepState> }) {
  const now = STEPS.find((s) => track[s.k] === "now");
  const said = STEPS.filter((s) => track[s.k] !== "skip").map((s) => `${s.label}: ${SAY[track[s.k]]}`).join(", ");
  return (
    <span className="jf-track" role="img" aria-label={said}>
      <span className="jf-track__dots" aria-hidden="true">
        {STEPS.map((s) => <i key={s.k} className={`jf-dot is-${track[s.k]}`} title={`${s.label}: ${SAY[track[s.k]]}`} />)}
      </span>
      {now ? <span className="jf-track__at" aria-hidden="true">at <b>{now.label}</b></span> : null}
    </span>
  );
}
