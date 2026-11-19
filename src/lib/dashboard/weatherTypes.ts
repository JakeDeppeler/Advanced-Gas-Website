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

/**
 * How much of the wet-bulb depression a working pad actually delivers.
 *
 * An evaporative cooler cools by evaporating water into the airstream, so the
 * coldest it can theoretically blow is the wet-bulb temperature. A clean,
 * properly wetted pad gets to about 80% of the way there; a tired one less.
 * 0.8 is the conservative end of the manufacturers' 80–90% so the board
 * promises slightly less than the unit should do.
 */
export const PAD_EFFICIENCY = 0.8;

/*
 * The evap thresholds, in degrees of wet-bulb depression (dry bulb minus wet
 * bulb) at the hottest part of the day.
 *
 * Depression is the right yardstick rather than relative humidity, because
 * humidity on its own says nothing: 60% at 22° is a mild morning and 60% at
 * 36° is a day an evap cannot do its job. Depression collapses both into the
 * one number that decides it — how much water the air will still take.
 *
 * At 0.8 pad efficiency these come out as roughly: 11° of depression is a
 * 9° drop, 8° is a 6° drop, 5° is a 4° drop. Four degrees is the point a
 * customer standing under the outlet says "is that it?", which is the thing
 * this page exists to stop.
 */
export const EVAP_GOOD_DEPRESSION = 11;
export const EVAP_FAIR_DEPRESSION = 8;
export const EVAP_POOR_DEPRESSION = 5;

/**
 * Below this, an evap cannot be *demonstrated*, however dry the air is.
 *
 * Not a knock on the unit — a 19° day is a fine day to install one. But the
 * handover is somebody standing under the outlet deciding whether they got
 * what they paid for, and on a mild day they feel a draught rather than
 * cooling. Commission it; book the demonstration for a warm one.
 */
export const EVAP_DEMO_MIN_TEMP = 24;

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

/** Above this, running a ducted heater up to temperature is a miserable call. */
export const HEATER_WARM_C = 30;
/** At or below this, the heater phone starts ringing. */
export const HEATER_COLD_C = 16;

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
export type WxKind = "evap" | "roof" | "heater";

/** One verdict: the rating, the word for it, and why — never the colour alone. */
export type WxCall = {
  kind: WxKind;
  rating: WxRating;
  /** The verdict in one or two words, for reading at four metres. */
  word: string;
  /** The reason, in the figures it was decided on. */
  why: string;
};

/**
 * Wet-bulb temperature from dry bulb and relative humidity — Stull (2011).
 *
 * The forecast carries dew point but not wet bulb, and dew point is the wrong
 * one: it is the temperature air must fall to before it condenses, whereas an
 * evap's floor is the temperature it reaches by *evaporating into* the air.
 * They differ by several degrees in dry heat, which is exactly the condition
 * this page is judging, so taking dew point as a stand-in would misjudge every
 * good evap day as a mediocre one.
 *
 * Stull's fit needs no iteration and no dependency. `npm run check:weather`
 * measures it against a bisection solve of the psychrometric equation over
 * 20–40 °C and 10–90% RH on every run: it agrees to within 0.62 °C where the
 * thresholds below sit, and 0.80 °C at its worst, which is 10% humidity on a
 * 20 °C day.
 *
 * So a day sitting within two-thirds of a degree of a boundary could be called
 * either way. That is smaller than the boundary is arbitrary — 11 °C of
 * depression is a round number chosen below, not a cliff — and after the pad
 * efficiency it is under half a degree on the temperature the board prints.
 */
export function wetBulbC(tempC: number, humidity: number): number {
  const rh = Math.min(100, Math.max(5, humidity));
  return (
    tempC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(tempC + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * rh ** 1.5 * Math.atan(0.023101 * rh) -
    4.686035
  );
}

/** What an evap would blow, given the air going into it. */
export function deliveredC(tempC: number, humidity: number): number {
  return tempC - PAD_EFFICIENCY * (tempC - wetBulbC(tempC, humidity));
}

/** The hours of a day that fall inside the working window. */
export const workHours = (d: WxDay): WxHour[] =>
  d.hours.filter((h) => h.hour >= WORK_FROM_HOUR && h.hour <= WORK_TO_HOUR);

/**
 * The hour an evap is judged on: the hottest working hour.
 *
 * The hottest, not the average, because the hottest is when somebody is
 * standing under the outlet with an opinion. A day that is dry at 9am and
 * muggy at 3pm is a day the handover goes badly.
 */
export function judgedHour(d: WxDay): WxHour | null {
  const hs = workHours(d);
  if (hs.length === 0) return null;
  return hs.reduce((a, b) => (b.tempC > a.tempC ? b : a));
}

const round = (n: number) => Math.round(n);

/**
 * Can an evaporative unit be handed over on this day?
 *
 * This is the commissioning question, not the installation one — whether the
 * thing will show what it does with the customer watching. Whether you can
 * physically get it on the roof is `roofCall`, and an install needs both.
 */
export function evapCall(d: WxDay): WxCall {
  const h = judgedHour(d);
  const kind = "evap" as const;

  /*
   * No working hour left to judge. Two different reasons, and they are not the
   * same news: late on a Tuesday afternoon today's working hours are simply
   * gone, whereas next Tuesday has no hourly forecast yet. Saying "too far
   * out" about today, which the first version did from about four o'clock
   * every afternoon, reads as a broken page.
   *
   * Either way no verdict is given, because a verdict invented from a daily
   * maximum would be a guess wearing a number.
   */
  if (!h) {
    const over = d.hours.length > 0;
    return {
      kind,
      rating: "fair",
      word: over ? "Day’s done" : "Too far out",
      why: over ? "past the working day" : "no hour-by-hour forecast yet",
    };
  }
  if (d.maxC < EVAP_DEMO_MIN_TEMP) {
    return {
      kind,
      rating: "no",
      word: "Can’t show it",
      why: `only ${round(d.maxC)}° — install it, demo it on a warm day`,
    };
  }

  const wet = wetBulbC(h.tempC, h.humidity);
  const depression = h.tempC - wet;
  const out = deliveredC(h.tempC, h.humidity);
  const why = `would blow ${round(out)}° at ${round(h.tempC)}° · ${round(h.humidity)}% humidity`;

  if (depression >= EVAP_GOOD_DEPRESSION) return { kind, rating: "good", word: "Good day", why };
  if (depression >= EVAP_FAIR_DEPRESSION) return { kind, rating: "fair", word: "Fine", why };
  if (depression >= EVAP_POOR_DEPRESSION) return { kind, rating: "poor", word: "Marginal", why };
  return { kind, rating: "no", word: "Don’t", why };
}

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

/** Is it a day to be running a heater up to temperature, or a day they break? */
export function heaterCall(d: WxDay): WxCall {
  const kind = "heater" as const;
  if (d.maxC >= HEATER_WARM_C) {
    return { kind, rating: "poor", word: "Not today", why: `${round(d.maxC)}° — nobody wants it run up to temp` };
  }
  if (d.maxC <= HEATER_COLD_C) {
    return { kind, rating: "good", word: "Expect calls", why: `tops ${round(d.maxC)}° — keep a van loose` };
  }
  return { kind, rating: "fair", word: "Fine", why: `${round(d.maxC)}° — comfortable to test in` };
}

/** All three calls for a day, in the order the office cares about them. */
export const callsFor = (d: WxDay): WxCall[] => [evapCall(d), roofCall(d), heaterCall(d)];

/**
 * The day's headline: the one call that should change somebody's mind.
 *
 * A priority list and not a sort by rating, because the three are not
 * comparable. Sorting worst-first put "nobody wants the heater run up to temp"
 * at the top of a 36° bone-dry day — true, useless, and it buried the best
 * evaporative handover day of the week behind it. A heater verdict is a note
 * about demand; it never outranks a verdict about whether work can be done.
 *
 * So, hardest constraint first:
 *  - the roof says no, and nothing can happen up there at all;
 *  - the air is too humid to hand a unit over;
 *  - the roof is workable but punishing;
 *  - and only then the good news, which on a hot dry day is worth saying.
 *
 * "Too mild to demonstrate" is held out of the ranking. It is true of every
 * day in July and would make winter read as a season of evap problems, when
 * what winter actually is, is heater calls.
 */
export function headlineCall(d: WxDay): WxCall {
  const evap = evapCall(d);
  const roof = roofCall(d);
  const heater = heaterCall(d);
  const tooMild = d.maxC < EVAP_DEMO_MIN_TEMP;

  if (roof.rating === "no") return roof;
  if (!tooMild && (evap.rating === "no" || evap.rating === "poor")) return evap;
  if (roof.rating === "poor") return roof;
  if (evap.rating === "good") return evap;
  if (heater.rating === "good") return heater;
  /*
   * A day with no hourly forecast has no evap verdict, so it must not head
   * with the absence of one. "Too far out" stood as Wednesday's headline
   * directly above two jobs marked good to go — which reads as the page
   * contradicting itself, when in fact rain and temperature are known that
   * far out and only humidity is not. The roof call is the one that can still
   * be made, so it leads.
   */
  if (d.hours.length === 0) return roof;
  return tooMild ? roof : evap;
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
