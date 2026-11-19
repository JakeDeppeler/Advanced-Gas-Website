/**
 * The weather, as a question about work rather than a question about weather.
 *
 * Nobody on the wall needs a forecast; they can look out of the window. What
 * the board is for is the booking decision: is today, or Thursday, a day to
 * put an evaporative unit in and hand it over, and is it a day to be on a
 * roof. Those two have real answers and the answers are arithmetic, so this
 * module is the arithmetic and nothing else — no fetching, no React — which is
 * what lets `scripts/check-weather.ts` prove it.
 *
 * Pure, like crewTypes and dailyPaceTypes: no `server-only`, so the check
 * script and the board's own client component can both import it.
 */

/** Where the forecast is for. The yard, not the CBD — 60 km and a range apart. */
export const FORECAST_PLACE = "Pakenham";

/*
 * The working window, for the questions asked of a day.
 *
 * Rain at 3am is not a reason to move an install; rain at 11am is. Every
 * day-level verdict below is computed over these hours only, which is why a
 * wet night followed by a clear day reads as a day you can work — because it
 * is one.
 */
export const WORK_FROM_HOUR = 7;
export const WORK_TO_HOUR = 16;



/*
 * What rain across the working day does to roof work. Jake's numbers,
 * 19 November: "the main time I would make it off the roof is if it's more
 * than 5 mil for the day and from 7 to 4, and no roof if it's more than 10 mil
 * for the day."
 *
 * Measured over 7am to 4pm, which is what "for the day" means to a crew.
 *
 * These replaced a pair of thresholds — 0.2mm in any hour, 2mm across the day
 * — that were far too twitchy for the trade. The board put a flag on a
 * Saturday forecast to get 0.3mm from 9am, and Jake's reply is the whole
 * lesson: "that is a very very low chance of it not going ahead; if the job is
 * booked before that they could be done, or later in the day the roof could
 * dry up." A roof dries. The old numbers were measuring whether a roof got
 * wet; these measure whether a day is lost.
 */
export const ROOF_WATCH_MM = 5;
export const ROOF_STOP_MM = 10;

/**
 * Sustained wind that takes you off a roof, km/h.
 *
 * Sustained, not gusts: the global model behind the Australian forecast
 * carries no gust figure, so there is none to show and none to threshold.
 * 35 km/h sustained implies gusts well past 50, which is the real limit.
 */
export const ROOF_WIND_KMH = 35;
/** A roof this hot is a heat-stress problem, not a weather problem. */
export const ROOF_HOT_C = 38;


/*
 * How often to go and look, by the time of day.
 *
 * Jake, 19 November: "can we do a weather check every 30 minutes against jobs,
 * and only do it from 6:30am to 5pm, and check any 4 hours after that."
 *
 * Which is right twice over. The office acts on this page between those hours,
 * so that is when it has to be current; and the forecast comes from a free
 * service of the Norwegian Meteorological Institute that asks clients not to
 * poll harder than the data changes. The old flat half-hour made 48 calls a
 * night that nobody was awake to read. This makes six.
 */
export const CHECK_FROM_MINUTE = 6 * 60 + 30;
export const CHECK_TO_MINUTE = 17 * 60;
export const CHECK_OPEN_SECONDS = 30 * 60;
export const CHECK_SHUT_SECONDS = 4 * 60 * 60;

/**
 * Seconds to hold a forecast for, given the Melbourne minute of the day.
 *
 * Takes the minute rather than a Date so it is pure and the check script can
 * walk the whole day across it — the boundaries are the part worth holding
 * still, and 6:30 exactly is inside the window while 5pm exactly is the last
 * minute of it.
 */
export function checkEverySeconds(minuteOfDay: number): number {
  const m = ((minuteOfDay % 1440) + 1440) % 1440;
  return m >= CHECK_FROM_MINUTE && m <= CHECK_TO_MINUTE ? CHECK_OPEN_SECONDS : CHECK_SHUT_SECONDS;
}

/**
 * What the sky is doing, in the few categories a wall board can draw.
 *
 * MET names about ninety symbol codes — `lightrainshowersandthunder_night` and
 * the like. At four metres the difference between light rain showers and light
 * rain is not a difference, so they collapse to these, and the millimetres
 * beside the icon carry the detail.
 */
export type WxSky = "clear" | "fair" | "partly" | "cloudy" | "fog" | "lightrain" | "rain" | "heavyrain" | "thunder" | "sleet" | "snow";

/**
 * A MET symbol code as one of the above.
 *
 * Order matters: thunder beats rain, and heavy beats light, because a code can
 * say several things at once ("heavyrainandthunder"). Anything unrecognised
 * comes back null rather than guessing at "cloudy" — no icon is honest, and a
 * wrong one on a wall is worse than none.
 */
export function skyFrom(code: string | null | undefined): WxSky | null {
  if (!code) return null;
  const c = code.toLowerCase();
  if (c.includes("thunder")) return "thunder";
  if (c.includes("snow")) return "snow";
  if (c.includes("sleet")) return "sleet";
  if (c.includes("heavyrain")) return "heavyrain";
  if (c.includes("lightrain")) return "lightrain";
  if (c.includes("rain")) return "rain";
  if (c.includes("fog")) return "fog";
  if (c.startsWith("clearsky")) return "clear";
  if (c.startsWith("fair")) return "fair";
  if (c.startsWith("partlycloudy")) return "partly";
  if (c.startsWith("cloudy")) return "cloudy";
  return null;
}

/** How much each sky matters, for picking one to stand for a whole day. */
const SKY_WEIGHT: Record<WxSky, number> = {
  thunder: 9, heavyrain: 8, snow: 7, sleet: 6, rain: 5,
  lightrain: 4, fog: 3, cloudy: 2, partly: 1, fair: 0, clear: 0,
};

/**
 * One sky to stand for a working day: the worst of its hours.
 *
 * The worst rather than the commonest, because a day with one thundery hour in
 * it is a thundery day to anybody planning to be on a roof, and a board that
 * showed the mode would draw a sun over it.
 */
export function worstSky(skies: Array<WxSky | null>): WxSky | null {
  const real = skies.filter((s): s is WxSky => s != null);
  if (real.length === 0) return null;
  return real.reduce((a, b) => (SKY_WEIGHT[b] > SKY_WEIGHT[a] ? b : a));
}

/** One hour of the forecast, in Melbourne local time. */
export type WxHour = {
  /** Melbourne wall-clock hour, 0–23. */
  hour: number;
  tempC: number;
  humidity: number;
  /** Rain falling in this hour, mm. */
  rainMm: number;
  windKmh: number;
  /** What the sky is doing, where the forecast says. */
  sky?: WxSky | null;
};

/**
 * One day of the forecast.
 *
 * `hours` is empty past the hourly horizon. The global model runs hourly for
 * about the first two and a half days and six-hourly after that, so the back
 * half of the week has honest totals and no "what time" — which is why
 * `peakAt` is nullable and the page says "in the afternoon" rather than
 * inventing an hour.
 */
export type WxDay = {
  /** ISO date, Melbourne. */
  date: string;
  minC: number;
  maxC: number;
  /** The hour the day peaks, where the forecast is hourly enough to say. */
  peakAt: number | null;
  /** Rain over the whole day, mm. */
  rainMm: number;
  /** Rain inside the working window, mm — what actually stops work. */
  workRainMm: number;
  /** First and last working hour with rain in it, where known. */
  rainFrom: number | null;
  rainTo: number | null;
  /**
   * The strongest sustained wind inside the working window, km/h, or null
   * where the forecast is too coarse to carry one.
   *
   * Nullable because the alternative was worse: summing nothing gives zero,
   * and the roof verdict printed "dry, 0 km/h" on every day past the hourly
   * horizon — a dead calm presented as a measurement, on days the model had
   * said nothing about wind at all.
   */
  windKmh: number | null;
  /** Hourly where the model gives it, else empty. */
  hours: WxHour[];
  /** The worst sky across the working day, for the icon on the column. */
  sky?: WxSky | null;
};

export type Weather = {
  place: string;
  /** When the forecast was read. */
  at: string;
  /**
   * The Melbourne date this payload is being shown on, stamped fresh on every
   * snapshot rather than when the forecast was fetched.
   *
   * A failed read carries the last forecast forward, which is right — a
   * six-hour-old forecast beats a blank page. But a forecast carried across
   * midnight has yesterday as its first day, and the page would have labelled
   * that column "Today" and drawn its hours as today's. Comparing each day
   * against this instead means a stale payload degrades into a forecast that
   * has run out, which is what it is, rather than one that is quietly wrong.
   */
  today: string;
  /** What the air is doing right now, if a current hour is in range. */
  now: { tempC: number; humidity: number; windKmh: number } | null;
  days: WxDay[];
  /** The attribution the licence requires, carried with the data that needs it. */
  credit: string;
};

export type WxRating = "good" | "fair" | "poor" | "no";
/**
 * What a verdict is about. One thing, now.
 *
 * It was evap, roof and heater — how well a unit would cool, whether anybody
 * could get up there, and whether a heater was worth running up. Jake cut the
 * first and the last on 20 November: "we don't need the won't cool or barely
 * cools, we just need if the install or service is able to go ahead." Which is
 * the roof.
 *
 * The wet-bulb arithmetic that answered the cooling question went with it —
 * about 150 lines of physics and the tests that held it. It was well made and
 * it answered a question nobody had asked; the original "tell if the day is
 * bad to book an evap" meant can the job happen, not will the unit impress.
 */
export type WxKind = "roof";

/** One verdict: the rating, the word for it, and why — never the colour alone. */
export type WxCall = {
  kind: WxKind;
  rating: WxRating;
  /** The verdict in one or two words, for reading at four metres. */
  word: string;
  /** The reason, in the figures it was decided on. */
  why: string;
};

/** The hours of a day that fall inside the working window. */
export const workHours = (d: WxDay): WxHour[] =>
  d.hours.filter((h) => h.hour >= WORK_FROM_HOUR && h.hour <= WORK_TO_HOUR);

const round = (n: number) => Math.round(n);

/**
 * Can anybody be on a roof? Evap units, ducted flues, anything up there.
 *
 * Judged on the hour where there are hours, and on the working day's total
 * where there are not — see ROOF_DAY_MM for why those need different bars.
 */
export function roofCall(d: WxDay): WxCall {
  const kind = "roof" as const;
  const work = workHours(d);
  const when =
    d.rainFrom != null
      ? d.rainFrom === d.rainTo
        ? ` from ${clock(d.rainFrom)}`
        : ` ${clock(d.rainFrom)}–${clock((d.rainTo ?? d.rainFrom) + 1)}`
      : "";
  /*
   * Two tiers, because the two mean different things to the office: amber is
   * "there is a chance this doesn't go ahead", red is "it won't". Anything
   * under five millimetres across the working day is weather a roof dries
   * from, and the board says nothing about it.
   */
  if (d.workRainMm > ROOF_STOP_MM) {
    return { kind, rating: "no", word: "No roof", why: `${mm(d.workRainMm)} in the working day${when}` };
  }
  if (d.workRainMm > ROOF_WATCH_MM) {
    return { kind, rating: "poor", word: "Off the roof", why: `${mm(d.workRainMm)} in the working day${when}` };
  }
  if (d.windKmh != null && d.windKmh >= ROOF_WIND_KMH) {
    // "No roof", like the heavy-rain branch: both are red, and sharing a word
    // with the gold tier below would undo the distinction the colours make.
    return { kind, rating: "no", word: "No roof", why: `${round(d.windKmh)} km/h wind` };
  }
  if (d.maxC >= ROOF_HOT_C) {
    return { kind, rating: "poor", word: "Start early", why: `${round(d.maxC)}° — the roof will be brutal by noon` };
  }
  if (d.rainMm > ROOF_WATCH_MM && d.workRainMm <= ROOF_WATCH_MM) {
    return {
      kind,
      // Enough to mention, not enough to move an install: it falls around the
      // working day rather than through it.
      rating: "fair",
      word: "Clear by day",
      why: `${mm(d.rainMm)} around it, dry ${clock(WORK_FROM_HOUR)}–${clock(WORK_TO_HOUR)}`,
    };
  }
  if (d.rainMm >= 1) {
    /*
     * A shower a roof dries from. Named rather than hidden, so nobody wonders
     * whether the board noticed it — but only once it is a millimetre. "0.1mm
     * about" under a heading reading Clear is a figure doing no work.
     */
    return {
      kind,
      rating: "good",
      word: "Clear",
      why: `${mm(d.rainMm)} about${d.windKmh != null ? ` · ${round(d.windKmh)} km/h` : ""}`,
    };
  }
  // No wind figure past the hourly horizon, so the good-day line does not
  // claim one. "dry, 0 km/h" was a calm nobody forecast.
  return { kind, rating: "good", word: "Clear", why: d.windKmh != null ? `dry, ${round(d.windKmh)} km/h` : "dry" };
}

/** "7am", "4pm", "noon" — a working hour as somebody would say it. */
export function clock(hour24: number): string {
  const h = ((hour24 % 24) + 24) % 24;
  if (h === 12) return "noon";
  if (h === 0) return "midnight";
  return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;
}

/** Rain, at the precision the figure deserves. */
export function mm(n: number): string {
  if (n <= 0) return "none";
  if (n < 1) return `${n.toFixed(1)}mm`;
  return `${Math.round(n)}mm`;
}

/** The temperature, no decimal: a wall is read from four metres. */
export const degrees = (n: number | null | undefined): string => (n == null ? "—" : `${Math.round(n)}°`);
