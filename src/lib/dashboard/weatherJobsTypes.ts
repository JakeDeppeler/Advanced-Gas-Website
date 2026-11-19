/**
 * The booked work, read against the forecast.
 *
 * The Weather page says what the week is like. This says what that means for
 * the jobs already in the diary — which is the thing somebody can actually act
 * on, because by the time a bad day arrives the booking went out a week ago.
 *
 * Jake, 19 November: "if it raining the night before and we have an evap
 * installation in the morning flags it, as well as any job with roof works
 * like a heater or internal dominator or ducted split, and if it's going to be
 * over 30 then we don't want to be doing heater or ducted split system
 * installation either… maybe have a job status for install and evap service,
 * if they are good to go or look like they may not go ahead."
 *
 * Pure, like weatherTypes beside it: no fetching, no React, so
 * `scripts/check-weatherjobs.ts` can prove every rule.
 */

import {
  ROOF_STOP_MM,
  ROOF_WATCH_MM,
  ROOF_WIND_KMH,
  type Weather,
  type WxDay,
} from "./weatherTypes";

/**
 * A job starting at or before this hour is a morning job, and a morning job on
 * a roof cares what fell overnight.
 *
 * Ten rather than noon: a roof that got wet at four in the morning is dry
 * enough by eleven on most days, and the job this rule exists for is the 7:30
 * evap install that arrives to a wet roof and stands around.
 */
export const MORNING_BEFORE_HOUR = 10;

/**
 * Rain from this hour the evening before counts as overnight rain.
 *
 * Six in the evening, not midnight: a shower at eight leaves a roof wet at
 * seven the next morning just as surely as one at two.
 */
export const OVERNIGHT_FROM_HOUR = 18;

/**
 * Rain across the overnight window that leaves a roof wet in the morning.
 *
 * Five, raised from one. A roof dries, and Jake's own words about a 0.3mm
 * morning are the test: "that is a very very low chance of it not going
 * ahead." One millimetre overnight was flagging mornings that would have been
 * fine by the time the van arrived.
 */
export const OVERNIGHT_WET_MM = 5;

/**
 * Over this, a heater is not worth running up and a roof cavity is dangerous.
 *
 * Jake's number. It governs two different problems that happen to share it —
 * see `HeatReason` — so the board gives each its own words rather than putting
 * "over 30°" against both and leaving the crew to work out which.
 */
export const TOO_HOT_C = 30;

/** How long a job is assumed to take when its type carries no slot. */
export const DEFAULT_JOB_HOURS = 3;

/**
 * What the two colours mean, which is the whole design of this page.
 *
 * Jake, 19 November: "the gold is to flag any chance, and then red if there is
 * a really high chance it won't go ahead."
 *
 * So red is reserved for weather that takes the day off a crew — more than ten
 * millimetres through the working day, or wind nobody should be on a roof in.
 * Everything else that is worth saying at all is gold: a chance, not a
 * verdict. Being over thirty degrees for a heater install is a strong
 * preference and still a choice, so it is gold; it is not the weather stopping
 * anybody.
 */

/**
 * Rain inside a multi-day job's *second* day that is worth planning around.
 *
 * Lower than the thresholds that stop work, because this flag does not stop
 * anything — it asks a crew to get the roof closed on day one. A day that
 * would only be gold on its own is worth knowing about the night before you
 * open somebody's ceiling.
 */
export const NEXT_DAY_RAIN_MM = 3;

/**
 * What a job needs from the weather, worked out from the name of its type.
 *
 * Keywords and not a list of exact type names: the type list changes — a
 * "Dominator" or an "Add-on Cooling" appears the week somebody adds it in
 * ServiceTitan — and a hardcoded list fails silently and in the dangerous
 * direction, by quietly dropping a roof job off the page. Anything matched
 * here is shown on the board with the rule it matched, so a wrong call is
 * visible rather than buried.
 */
export type JobNeeds = {
  /** Somebody is going on the roof: an evap unit, a flue, a roof cavity. */
  roof: boolean;
  /** An evaporative unit of any kind — the thing lives on the roof. */
  evap: boolean;
  /** A hot day is the wrong day for it, and why. */
  heat: HeatReason | null;
};

/**
 * Why a hot day is the wrong day. Two problems, one threshold.
 *
 * `comfort` is a heater: nobody wants a ducted heater run up to temperature to
 * be commissioned in a 32° house, and the customer standing there is the one
 * signing it off.
 *
 * `cavity` is a ducted refrigerated install: twenty hours of it is in the roof
 * space, and a roof cavity on a 32° day is well past 50°. That is a heat-stress
 * problem rather than a comfort one, and it is the crew's problem rather than
 * the customer's, so it does not get the same sentence.
 */
export type HeatReason = "comfort" | "cavity";

const has = (name: string, re: RegExp) => re.test(name);

/** Evaporative anything: the unit is on the roof and it has to be demonstrated. */
const EVAP = /evapora/i;
/**
 * Work with a flue or a roof cavity in it.
 *
 * Gas ducted heaters and space heaters and log fires all take a flue through
 * the roof — which is why an *internal* unit is still roof work, the thing
 * that is easy to get wrong from a job list. Ducted refrigerated is a day in
 * the roof space with an outdoor unit to land.
 */
const FLUE = /gas ducted|ducted heater|space heater|log fire|dominator/i;
const DUCTED_REFRIG = /ducted refrigerated|ducted split/i;
const INSTALL = /^install|^removal/i;

/** What this job type needs from the weather. */
export function needsOf(jobType: string): JobNeeds {
  const evap = has(jobType, EVAP);
  const flue = has(jobType, FLUE);
  const ducted = has(jobType, DUCTED_REFRIG);
  const installing = has(jobType, INSTALL);

  return {
    /*
     * An evap job of any kind is roof work — the unit lives up there, so a
     * service and a repair are as much a roof job as the install. Flue and
     * ducted work is roof work when something is being installed or taken
     * out; a diagnostic on a ducted heater is somebody at the controller.
     */
    roof: evap || ((flue || ducted) && installing),
    evap,
    heat: installing && flue ? "comfort" : installing && ducted ? "cavity" : null,
  };
}

/** True if the weather has any bearing on this job at all. */
export const weatherMatters = (n: JobNeeds): boolean => n.roof || n.evap || n.heat != null;

/** One appointment in the diary, as the board reads it. */
export type BookedJob = {
  jobId: number;
  /** The job number somebody would say out loud. */
  number: string;
  type: string;
  suburb: string | null;
  /** Melbourne date, ISO. */
  date: string;
  /** Melbourne start hour, 0–23. */
  hour: number;
  /** How long the type is booked for, in hours. */
  hours: number;
  /**
   * Booked for longer than a day — a ducted refrigerated install runs to
   * twenty hours. Which day it starts on is not the only day that matters:
   * see the roof-closing flag in callFor.
   */
  multiDay?: boolean;
};

export type JobStatus = "go" | "watch" | "risk";

export type JobCall = BookedJob & {
  needs: JobNeeds;
  status: JobStatus;
  /** Two or three words, for reading across a room. */
  word: string;
  /** The reason, in the figures it was decided on. */
  why: string;
};

/** One hour of the forecast with its date, so a window can cross midnight. */
type FlatHour = { date: string; hour: number; tempC: number; humidity: number; rainMm: number; windKmh: number };

/** Every forecast hour in one sorted list, which is what a job window needs. */
export function flatHours(days: WxDay[]): FlatHour[] {
  const out: FlatHour[] = [];
  for (const d of days) {
    for (const h of d.hours) {
      out.push({ date: d.date, hour: h.hour, tempC: h.tempC, humidity: h.humidity, rainMm: h.rainMm, windKmh: h.windKmh });
    }
  }
  return out.sort((a, b) => (a.date === b.date ? a.hour - b.hour : a.date.localeCompare(b.date)));
}

/** The day before an ISO date. */
export function dayBefore(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * The hours in a window, which may start on the previous day.
 *
 * Returns an empty list where the forecast does not reach, and the callers
 * below all treat empty as "cannot say" rather than as "nothing there" — the
 * difference between a dry morning and an unknown one.
 */
function window(
  hours: FlatHour[],
  fromDate: string,
  fromHour: number,
  toDate: string,
  toHour: number,
): FlatHour[] {
  const key = (d: string, h: number) => `${d}T${String(h).padStart(2, "0")}`;
  const lo = key(fromDate, fromHour);
  const hi = key(toDate, toHour);
  return hours.filter((h) => {
    const k = key(h.date, h.hour);
    return k >= lo && k <= hi;
  });
}

const round = (n: number) => Math.round(n);
const mmText = (n: number) => (n < 1 ? `${n.toFixed(1)}mm` : `${Math.round(n)}mm`);

/** "7am", "4pm", "noon". */
function clockOf(hour24: number): string {
  const h = ((hour24 % 24) + 24) % 24;
  if (h === 12) return "noon";
  if (h === 0) return "midnight";
  return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;
}

/**
 * What the weather says about one booked job.
 *
 * Worst first, and only the things that would move a booking. A job the
 * weather has nothing to say about does not appear on the page at all — see
 * `weatherMatters` — so everything here is already a job somebody would want
 * to know about.
 */
export function callFor(job: BookedJob, w: Weather): JobCall {
  const needs = needsOf(job.type);
  const day = w.days.find((d) => d.date === job.date);
  const hours = flatHours(w.days);
  const call = (status: JobStatus, word: string, why: string): JobCall => ({ ...job, needs, status, word, why });

  if (!day) return call("watch", "No forecast", "too far out to say");

  const endHour = Math.min(23, job.hour + Math.ceil(job.hours));
  const during = window(hours, job.date, job.hour, job.date, endHour);

  /*
   * Rain the roof has on it by the time they finish — not the day's total.
   *
   * Jake, 20 November: "for today it says don't, but the rain doesn't start
   * until 1pm, so if we had an evap at 7am to even 11am we would be fine, as
   * it only takes an hour."
   *
   * Exactly so, and a day figure cannot express it. What decides a roof job is
   * what has fallen by the time they are off it: everything from six the
   * evening before through the job's own hours. Rain that arrives after they
   * have packed up is somebody else's problem.
   *
   * Jake's two numbers still do the judging — see ROOF_WATCH_MM — they are
   * just measured over the window belonging to this job rather than over nine
   * hours of a day it may occupy two of. This also folds in the overnight
   * wet-roof rule, which was a separate branch asking about the same water.
   */
  if (needs.roof) {
    /*
     * Strictly before the start. `window` is inclusive at both ends, so the
     * job's first hour sat in both halves and its rain was counted twice —
     * which pushed a day of exactly five millimetres over a threshold of more
     * than five. The hour a job starts in is during the job.
     */
    const before = window(hours, dayBefore(job.date), OVERNIGHT_FROM_HOUR, job.date, job.hour).filter(
      (h) => !(h.date === job.date && h.hour >= job.hour),
    );
    const beforeMm = before.reduce((a, h) => a + h.rainMm, 0);
    const duringMm = during.reduce((a, h) => a + h.rainMm, 0);
    const byEnd = beforeMm + duringMm;

    if (byEnd > ROOF_WATCH_MM) {
      /*
       * Rain falling while they are up there and rain already on the tiles
       * are both reasons to come down, and they are not the same news to
       * somebody reading a run sheet — so whichever window carries more of it
       * names the verdict.
       */
      const onTheJob = duringMm >= beforeMm;
      return call(
        byEnd > ROOF_STOP_MM ? "risk" : "watch",
        byEnd > ROOF_STOP_MM ? "No roof work" : onTheJob ? "Rain on the job" : "Wet roof",
        onTheJob
          ? `${mmText(duringMm)} between ${clockOf(job.hour)} and ${clockOf(endHour)}`
          : `${mmText(beforeMm)} before they start`,
      );
    }
  }

  if (needs.roof && day.windKmh != null && day.windKmh >= ROOF_WIND_KMH) {
    return call("risk", "Too windy", `${round(day.windKmh)} km/h wind`);
  }

  /*
   * The one flag on this page that is not a warning but a plan.
   *
   * Jake, 19 November: "if a ducted split is on the Monday and it's raining on
   * the Tuesday, we would have opened the roof for the Monday and gotten
   * everything in the roof the first day — so it would more be flagging to get
   * everything in the roof for the first day."
   *
   * A ducted refrigerated install is booked for twenty hours. Monday's weather
   * decides whether it starts; Tuesday's decides whether an open ceiling gets
   * rained into. Nothing else on the board would have said so, because every
   * other rule asks only about the day a job is booked on.
   */
  if (needs.roof && job.multiDay) {
    const next = w.days.find((x) => x.date > job.date);
    if (next && next.workRainMm >= NEXT_DAY_RAIN_MM) {
      return call(
        "watch",
        "Close the roof today",
        `${mmText(next.workRainMm)} tomorrow · close it on day one`,
      );
    }
  }

  // Jake's thirty degrees, with the reason that belongs to this kind of work.
  if (needs.heat && day.maxC >= TOO_HOT_C) {
    return needs.heat === "comfort"
      ? call("risk", "Too hot", `${round(day.maxC)}° · too hot to run a heater up`)
      : call("risk", "Too hot", `${round(day.maxC)}° · the roof cavity will be past 50°`);
  }

  /*
   * There is deliberately no evap-handover verdict here.
   *
   * There was: a new unit on a mild or muggy day was flagged, on the reasoning
   * that a handover is somebody standing under the outlet deciding whether
   * they got what they paid for. Jake asked what "can't demo it" meant and the
   * answer did not survive the question. It flagged jobs that were going ahead
   * regardless — and gold on this page means a chance the job does *not* go
   * ahead, so it was a colour on something that is not a risk. With only one
   * or two flags on a normal week it was also crowding out the ones that
   * matter.
   *
   * The day's own evap verdict stays, on the Weather column above: "is this a
   * good day for evaporative work" was the original question and it is still
   * worth answering. What it is not is a reason to move a booking.
   */

  const why = needs.roof
    ? `dry ${clockOf(job.hour)}–${clockOf(endHour)} · ${round(day.maxC)}°`
    : `${round(day.maxC)}° · nothing in the way`;
  return call("go", "Good to go", why);
}

/** Every booked job the weather has something to say about, worst first. */
export function callsForJobs(jobs: BookedJob[], w: Weather): JobCall[] {
  const rank: Record<JobStatus, number> = { risk: 0, watch: 1, go: 2 };
  return jobs
    .filter((j) => weatherMatters(needsOf(j.type)))
    .map((j) => callFor(j, w))
    .sort(
      (a, b) =>
        // Soonest first inside a status: the page is a to-do list, and what is
        // in trouble on Monday matters more than what is in trouble on Friday.
        rank[a.status] - rank[b.status] ||
        a.date.localeCompare(b.date) ||
        a.hour - b.hour,
    );
}

/** The tally for the head of the page. */
export function tally(calls: JobCall[]): Record<JobStatus, number> {
  return calls.reduce(
    (acc, c) => ({ ...acc, [c.status]: acc[c.status] + 1 }),
    { go: 0, watch: 0, risk: 0 } as Record<JobStatus, number>,
  );
}
