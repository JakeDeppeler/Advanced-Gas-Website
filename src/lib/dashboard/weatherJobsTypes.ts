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
  EVAP_DEMO_MIN_TEMP,
  EVAP_POOR_DEPRESSION,
  ROOF_WET_MM,
  ROOF_WIND_KMH,
  deliveredC,
  judgedHour,
  wetBulbC,
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

/** Rain across the overnight window that leaves a roof wet in the morning. */
export const OVERNIGHT_WET_MM = 1;

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
 * Rain across a job's own hours that makes it a stop rather than a warning.
 *
 * Below this it is "showers about": enough that somebody should know before
 * they load the van, not enough to move a booking. The first version put a
 * red "at risk" against an install over 0.2mm of drizzle, which is how a
 * board teaches a room to stop reading it.
 */
export const JOB_RAIN_RISK_MM = 1;

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
  /**
   * A new unit is being handed over today, so the air has to be dry enough
   * for it to show what it does.
   *
   * Installs only, and that distinction matters more than it looks. Evaps get
   * serviced through winter as a matter of course — the first version put
   * "can't demo it" against four spring services on 17° days, which is true,
   * unactionable, and four fifths of the page. A service is judged on whether
   * somebody can get on the roof, and nothing else.
   */
  handover: boolean;
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
    handover: evap && installing,
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

  if (!day) return call("watch", "No forecast", "this far out the forecast has nothing to say");

  const endHour = Math.min(23, job.hour + Math.ceil(job.hours));
  const during = window(hours, job.date, job.hour, job.date, endHour);

  /*
   * Rain while they are on the roof. The first thing asked, because it is the
   * only one that stops the work rather than spoiling it.
   */
  if (needs.roof) {
    const wet = during.filter((h) => h.rainMm >= ROOF_WET_MM);
    if (wet.length > 0) {
      const total = during.reduce((a, h) => a + h.rainMm, 0);
      const when = `between ${clockOf(job.hour)} and ${clockOf(endHour)}`;
      return total >= JOB_RAIN_RISK_MM
        ? call("risk", "Rain on the job", `${mmText(total)} ${when}`)
        : call("watch", "Showers about", `${mmText(total)} ${when} · enough to wet a roof`);
    }
  }

  /*
   * Jake's overnight rule: a wet roof at half past seven. The job does not
   * need rain in it to be in trouble — it needs a roof that has not dried.
   */
  if (needs.roof && job.hour < MORNING_BEFORE_HOUR) {
    const overnight = window(hours, dayBefore(job.date), OVERNIGHT_FROM_HOUR, job.date, job.hour);
    if (overnight.length > 0) {
      const fell = overnight.reduce((a, h) => a + h.rainMm, 0);
      if (fell >= OVERNIGHT_WET_MM) {
        return call(
          "risk",
          "Wet roof",
          `${mmText(fell)} overnight · ${clockOf(job.hour)} start on a roof that hasn’t dried`,
        );
      }
    }
  }

  if (needs.roof && day.windKmh != null && day.windKmh >= ROOF_WIND_KMH) {
    return call("risk", "Too windy", `${round(day.windKmh)} km/h · nobody should be on a roof in it`);
  }

  // Jake's thirty degrees, with the reason that belongs to this kind of work.
  if (needs.heat && day.maxC >= TOO_HOT_C) {
    return needs.heat === "comfort"
      ? call("risk", "Too hot", `${round(day.maxC)}° · nobody wants a heater run up to temp in it`)
      : call("risk", "Too hot", `${round(day.maxC)}° · the roof cavity will be past 50°`);
  }

  /*
   * And the evap handover. A watch rather than a risk: the unit still goes in
   * and the work still gets paid for, but the customer standing under the
   * outlet will not be impressed, so somebody should know before they arrive.
   */
  if (needs.handover) {
    if (day.maxC < EVAP_DEMO_MIN_TEMP) {
      return call("watch", "Can’t demo it", `tops ${round(day.maxC)}° · fit it, show them on a warm day`);
    }
    /*
     * Judged on the day's hottest working hour, not on the job's own window.
     *
     * Two reasons, and the first is the one that bit. A half past seven start
     * is judged against half past seven air, and mornings are humid
     * everywhere — so every early evap install read "too humid" on days that
     * were perfectly good by noon. The handover is at the end of the job, and
     * the customer uses the thing that afternoon.
     *
     * The second is that the Weather page judges the same day the same way.
     * Two pages on the same wall disagreeing about whether Thursday suits an
     * evap is worse than either of them being wrong on its own.
     */
    const judged = judgedHour(day);
    if (judged && judged.tempC - wetBulbC(judged.tempC, judged.humidity) < EVAP_POOR_DEPRESSION) {
      const out = deliveredC(judged.tempC, judged.humidity);
      return call(
        "watch",
        "Too humid",
        `would blow ${round(out)}° at ${round(judged.tempC)}° · ${round(judged.humidity)}% humidity`,
      );
    }
  }

  const why = needs.roof
    ? `dry ${clockOf(job.hour)}–${clockOf(endHour)}${day.maxC >= EVAP_DEMO_MIN_TEMP ? ` · ${round(day.maxC)}°` : ""}`
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
