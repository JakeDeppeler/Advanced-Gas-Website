"use client";

import { BREAK_HOURS, CREW_SECTORS, DAY_END_HOUR, DAY_START_HOUR, LONGEST_ALLOWED_HOURS, MIN_IDLE_DAYS, MIN_TIMED, MIN_TYPE_TIMED, rollUpTypes, type CrewSector, type JobTypeKpi, type TechKpi } from "@/lib/dashboard/crewTypes";
import {
  WORK_FROM_HOUR,
  WORK_TO_HOUR,
  deliveredC,
  judgedHour,
  type WxHour,
  type WxSky,
} from "@/lib/dashboard/weatherTypes";
import {
  callsForJobs,
  tally,
  type JobCall,
  type JobStatus,
} from "@/lib/dashboard/weatherJobsTypes";
import {
  callsFor,
  clock,
  degrees,
  headlineCall,
  mm,
  type WxDay,
} from "@/lib/dashboard/weatherTypes";
import type { SectorKey, VisitOutcomes } from "@/lib/dashboard/sectors";
import { Fragment, type CSSProperties, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { suburbCoords } from "@/lib/suburbCoords";
import { BoardSuburbMap } from "@/components/BoardSuburbMap";
import type { Metrics, SourceState } from "@/lib/dashboard/metrics";
import type { Step } from "@/lib/dashboard/pace";
import { Gauge, MiniDial, ZONES, ZONE_BAND, ZONE_LABEL, paceIndex, verdictOf, verdictText, type Verdict } from "./screen/Gauge";
import { Alert, previewAlert, type AlertKind } from "./screen/Alert";
import { checkAudio, primeAudio, soundReason, soundState, soundStateOnServer, subscribeAudio } from "./screen/cheer";
import { Ticker, TickerScope } from "./screen/Ticker";
import { alertFrom, leadAlertFrom } from "@/lib/dashboard/alertCopy";
import type { NewLead } from "@/lib/leads/newLeadTypes";
import { useBoardRemote } from "./screen/useBoardRemote";
import { BOARD_PAGES, type BoardRemote } from "@/lib/board/remoteTypes";
import { AR_BANDS, type ArBandKey } from "@/lib/portal/ar";
import { emailAlertLine } from "@/lib/email/eventTypes";

type Snapshot = {
  computedAt: string;
  metrics: Metrics;
  sources: Record<string, { state: SourceState; detail?: string; at?: string }>;
};

// Re-fetches JSON on a timer rather than reloading the page. A kiosk browser
// left on this URL for months would leak memory and flash white on every
// location.reload(); swapping state in place does neither.
const REFRESH_MS = 30_000;
/*
 * How often the board asks whether anybody has enquired.
 *
 * Its own cadence and its own route, because this is the one thing on the
 * board measured in seconds rather than in money. The figures ride a 25-second
 * recompute and a 30-second poll, which would land a new lead on the wall with
 * fifteen seconds of its minute left; fifteen seconds of lag leaves
 * three-quarters of the minute to do something with. The read behind it is one
 * indexed slice of one table — see /api/screen/leads.
 */
const LEADS_MS = 15_000;
// How often the board asks the server to recompute, matching the poll so the
// wall is never more than a minute behind the replica. The endpoint recomputes
// the snapshot on every one of these — cheap, it only reads the replica — but
// pulls from ServiceTitan on its own slower floor, because a tenant does not
// want an export request every thirty seconds all day.
const RESYNC_MS = 30_000;
const PAGE_MS = 30_000;
// The page list lives with the remote, so the portal can name a page to show.
const PAGES = BOARD_PAGES;

/** Each page's vertical proportions. Keyed by name; see the note where it is used. */
const GRID_CLASS: Record<(typeof BOARD_PAGES)[number], string> = {
  Today: "screen__grid--today",
  Pace: "screen__grid--pace",
  Quotes: "screen__grid--quotes",
  Invoices: "screen__grid--invoices",
  "Daily pace": "screen__grid--daily",
  Crew: "screen__grid--crew",
  Team: "screen__grid--team",
  "Job types": "screen__grid--crew",
  Sectors: "screen__grid--sectors",
  Areas: "screen__grid--areas",
  Weather: "screen__grid--weather",
};

/**
 * The line beside each page name: what the figures below it are measuring.
 *
 * Pace names where its targets came from, because "63%" on a wall invites the
 * question and the answer is the whole point of the board.
 */
/*
 * No page carries a *verdict* badge beside its name any more.
 *
 * Performance carried one — the `completed` step of Pace, repeated — and the
 * page that replaced it is about which kind of job takes how long. Nothing
 * sets a target for that, and borrowing Pace's month-completed verdict to sit
 * beside a table of job types would be the board answering a question nobody
 * asked on that page. If a page earns one, it goes back here.
 *
 * What every page does carry is the window it measures, below.
 */

/**
 * The period each page is measuring, in the same place on every page.
 *
 * Jake asked for it (16 Nov: "at the top of each tab have the time frame that
 * it is measuring so it's more clear"), and he asked because he had just been
 * caught out by it: Sectors reads as a year and is in fact clamped to the day
 * ServiceTitan became the ledger, which is two months. Nine pages measuring
 * nine different periods with the period named in the prose of some of them is
 * how a room compares two figures that were never comparable.
 *
 * It says what is true rather than what was asked for. Crew and Job types ask
 * for 365 days and get what exists, which starts the day ServiceTitan did — so
 * the chip reads "22 Jun – today", not "last 365 days". See Crew.firstDay.
 */
const WINDOWS: Record<(typeof PAGES)[number], (m: Metrics) => string | null> = {
  Today: () => "today",
  Pace: () => "this week, month and year",
  Quotes: () => "today, and everything still out",
  Invoices: () => "everything owed, now",
  "Daily pace": () => "today",
  Crew: (m) => since(m.crew?.firstDay ?? m.crew?.from),
  Team: () => "this week and month",
  "Job types": (m) => since(m.crew?.firstDay ?? m.crew?.from),
  Sectors: (m) => since(m.sectors?.from),
  Areas: () => "last 60 days",
  /*
   * The only page on the board that looks forward rather than back — and it
   * counts the days it still has rather than the days it was given, so a
   * forecast carried across midnight does not claim a week it has spent.
   */
  Weather: (m) => {
    const ahead = m.weather ? m.weather.days.filter((d) => d.date >= m.weather!.today).length : 0;
    if (ahead === 0) return "the week ahead";
    return ahead === 1 ? "the rest of today" : `today and the next ${ahead - 1} days`;
  },

};

/**
 * "22 Jun – today · 5 months", from an ISO date.
 *
 * The span is spelled out beside the date because "since 22 Jun" needs a
 * calendar and four metres is too far to do arithmetic. Months once there are
 * two, days before that — "0 months" on a new tenant would be worse than the
 * number it replaced.
 */
function since(from: string | null | undefined): string | null {
  if (!from) return null;
  const start = new Date(`${from}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const days = Math.max(0, Math.round((Date.now() - start.getTime()) / 86_400_000));
  const months = Math.round(days / 30.4);
  const span = days < 60 ? `${days} days` : `${months} months`;
  return `${shortDay(from)} – today · ${span}`;
}

const SUBTITLES: Record<(typeof PAGES)[number], (m: Metrics) => string> = {
  Today: () => "",
  Pace: (m) => {
    const cal = m.paceData?.calendar;
    // Both counts, because the page shows both: a card is behind for the week
    // and on track for the month all the time, and which day of which you are
    // on is the only thing that reconciles them.
    const day = cal
      ? `week day ${Math.min(cal.week.total, cal.week.elapsed + 1)} of ${cal.week.total}` +
        ` · month day ${Math.min(cal.month.total, cal.month.elapsed + 1)} of ${cal.month.total}`
      : "";
    if (!m.pace) return "No goal set for this year";
    const goal = m.pace.profitPct ? `${money(m.pace.goal)} at ${m.pace.profitPct}%` : money(m.pace.goal);
    return `What the ${goal} goal needs of every step${rateNote(m)}${day ? ` · ${day}` : ""}`;
  },
  Quotes: () => "Written today, and what's still out",
  // Says the window and, in the same breath, how much of the clock it is built
  // from: a tech's hours are the visits whose stamps gave a real span, and a
  // page about people has to lead with what it did not measure.
  Crew: (m) => {
    const c = m.crew;
    if (!c) return "Each van";
    const t = c.team.timed;
    return `Each van · ${t.with} of ${t.of} visits have a start and finish clocked${
      c.passengers.length > 0 ? ` · ${c.passengers.length} riding with them` : ""
    }`;
  },
  // Names whose job it is, because the page is a work list rather than a score:
  // everything on it is something one person in the office does next.
  Invoices: () => "Money to bill, money owed to us, and what's overdue · one person's job",
  // Says what each card's targets are a share of. Nothing holds a per-person
  // number, so the share is equal — and an equal share of a team target is an
  // assumption about people, not a fact about them. It goes in the header.
  Team: (m) =>
    m.salesLeaderboard.length > 0
      ? `Against an equal share of the team's week and month${m.salesLeaderboard.length > 6 ? ` \u00b7 top 6 of ${m.salesLeaderboard.length}` : ""}`
      : "Who has sold what",
  // Says which population the page counts, because it was read as jobs twice
  // and it is invoices — a job can carry more than one.
  // Says the window and what the two time figures are, because "4h" against
  // "3.8h" is unreadable until you know which is the booking and which is the
  // work.
  "Job types": (m) =>
    m.crew
      ? "Each sector and the job types under it"
      : "Each sector and the job types under it",
  Sectors: (m) => {
    const s = m.sectors;
    if (!s) return "Maintenance, breakdowns, repairs and installs";
    return "Each kind of work, and what it leads to · jobs billed in the window, before GST";
  },
  Areas: () => "Where the work is, on the corridor",
  Weather: (m) =>
    m.weather
      ? `${m.weather.place} \u00b7 what each day suits, and what is booked into it`
      : "What the week is good for booking",
  // Says what the second line of every cell is, because a page of pairs is
  // unreadable until you know which half is today.
  "Daily pace": (m) => {
    const d = m.crewToday;
    if (!d) return "Each van's day, against its year";
    const t = d.team.timed;
    return `Each figure against the same figure over the year · ${t.with} of ${t.of} visits clocked${
      d.passengers.length > 0 ? ` · ${d.passengers.length} riding with them` : ""
    }`;
  },
};

const money = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n).toLocaleString("en-AU")}`;
};

/** Full digits. Used wherever a figure is read off the wall and acted on. */
const plain = (n: number | null | undefined) =>
  n == null ? "—" : `$${Math.round(n).toLocaleString("en-AU")}`;

const count = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-AU"));

/**
 * A figure for a line that is a shape rather than a sum: thousands from a
 * thousand up, so four of them read as four of the same thing.
 *
 * `money` turns to K only at ten thousand, which is right for a figure on its
 * own and wrong in a row of them — "1–7d $32K · 8–14d $48K · 15–30d $33K ·
 * 30+ $8,175" has one number in a different alphabet to the other three, and
 * the eye stops on the wrong one.
 */
const compact = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n).toLocaleString("en-AU")}`;
};

/**
 * What is late, by band, for a one-line summary — the four overdue bands of
 * the AR report, and nothing for a band with nothing in it.
 *
 * A band at zero is printed as a gap rather than as "$0": on a line this
 * short, four bands where two are empty says less than two bands that are
 * both real.
 */
function lateBands(a: Metrics["receivablesArAging"]): string | null {
  if (!a) return null;
  const parts = AR_BANDS.filter((b) => b.key !== "current")
    .map((b) => ({ b, v: a[b.key] || 0 }))
    .filter(({ v }) => v > 0)
    .map(({ b, v }) => `${b.short} ${compact(v)}`);
  return parts.length ? parts.join(" · ") : "nothing overdue";
}
const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n * 100)}%`);

/**
 * ServiceTitan-derived figures, gated on the source actually being connected.
 *
 * With no connection every one of these computes to 0 — no jobs, no invoices,
 * no estimates — and a zero is indistinguishable from a measurement. The board
 * said "Quotes out $0" to someone who had sent quotes that morning, which is
 * precisely how a wall board loses the room. Unknown reads as "—".
 *
 * `stale` still shows values: those were measured, just not recently, and the
 * footer already says so.
 */
type Live = { st: boolean };

/** One thing waiting for the wall: a snapshot event, or an enquiry just in. */
type QueueItem = { t: "event"; e: Metrics["alertEvents"][number] } | { t: "lead"; lead: NewLead };
const NA = "—";

/**
 * The class for a figure, dash-aware.
 *
 * A dash set at hero size is as wide as a progress bar and gets read as one
 * from across the room, so an unavailable figure drops to caption size
 * wherever it appears rather than only in the cards that remembered to ask.
 */
const vcls = (v: string, extra = "") => `tile__value ${v === NA ? "tile__value--na" : extra}`;

const st = {
  money: (n: number | null | undefined, l: Live) => (l.st ? money(n) : NA),
  plain: (n: number | null | undefined, l: Live) => (l.st ? plain(n) : NA),
  count: (n: number | null | undefined, l: Live) => (l.st ? count(n) : NA),
  pct: (n: number | null | undefined, l: Live) => (l.st ? pct(n) : NA),
  sub: (text: string, l: Live) => (l.st ? text : "ServiceTitan not connected"),
};

export function ScreenBoard({
  initial,
  token,
  theme = "light",
  safe = 0,
  preview,
  remote: initialRemote = null,
}: {
  initial: Snapshot;
  token: string;
  theme?: "dark" | "light";
  /** Percent to inset the whole board by, for a television that overscans. */
  safe?: number;
  /** `?alert=…` — show one alert on a loop, on sample figures. */
  preview?: AlertKind;
  /** The portal's remote as it stood when the page loaded; see useBoardRemote. */
  remote?: BoardRemote | null;
}) {
  const [snap, setSnap] = useState(initial);
  const [now, setNow] = useState(() => new Date());
  const [page, setPage] = useState(0);
  /*
   * What is waiting to take the wall.
   *
   * Two sorts of thing, from two sources at two speeds: the snapshot's own
   * events, which still need the metrics beside them to work out a sale's
   * progress bars, and new enquiries, which arrive already complete from their
   * own poll. Keeping them in one queue is what makes them take turns — a sale
   * and a lead landing together play one after the other rather than one over
   * the top of the other.
   */
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [paused, setPaused] = useState(false);
  // Bumped each time a previewed alert finishes, so it replays rather than
  // showing once and leaving the board behind it.
  const [previewRun, setPreviewRun] = useState(0);

  // The portal's remote: a page to show or hold, a demo alert, the theme.
  const remote = useBoardRemote(token, (snap as Snapshot & { remote?: BoardRemote | null }).remote ?? initialRemote, {
    show: (name, hold) => {
      const i = name ? PAGES.indexOf(name) : -1;
      if (i >= 0) setPage(i);
      setPaused(hold);
    },
  });
  const shownTheme = remote.theme ?? theme;
  const shownPreview = preview ?? remote.demo ?? undefined;

  // Seeded from the first snapshot so the board doesn't open by cheering every
  // sale already on the books.
  const seen = useRef<Set<string>>(new Set(initial.metrics.alertEvents?.map((e) => e.id) ?? []));

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(clock);
  }, []);

  /*
   * Let any button on the remote turn the sound on.
   *
   * A browser refuses to play audio on a page nobody has touched, and nobody
   * ever touches a wall display — so the board asks once whether it is allowed,
   * and takes the first keypress or tap as permission. A television remote
   * sends a keydown for every button on it, so "press anything" is a real
   * instruction somebody can follow from across the room.
   *
   * Not a substitute for --autoplay-policy on a kiosk that reloads itself. It
   * is the difference between a board that is silent and a board that says why.
   */
  useEffect(() => {
    checkAudio();
    const unlock = () => primeAudio();
    const opts = { passive: true } as const;
    window.addEventListener("keydown", unlock, opts);
    window.addEventListener("pointerdown", unlock, opts);
    window.addEventListener("click", unlock, opts);
    return () => {
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("click", unlock);
    };
  }, []);

  /*
   * What the last noise actually was, for the footer's marker.
   *
   * Three outcomes, not two. "Silent" and "made a noise, but the synthesised
   * one" look identical from the room if the board only admits to the first,
   * and telling them apart is the difference between a file to replace and a
   * browser to unblock. Four rounds of fixes went out blind for want of this.
   */
  const sound = useSyncExternalStore(subscribeAudio, soundState, soundStateOnServer);
  // Why, when there is a why. "404" sends somebody to the deploy; "no audio"
  // sends them to the television. Without it the marker says only that
  // something is wrong, which is where the last four rounds started.
  const soundWhy = useSyncExternalStore(subscribeAudio, soundReason, () => "");

  /**
   * The rotation, which stops while the board is held.
   *
   * Separate from the clock above so holding a page does not also freeze the
   * time in the footer — a board that has stopped telling the time looks like a
   * board that has crashed.
   *
   * Polling is untouched either way: hold a page and its figures still update
   * underneath you. What stops is the page turning, which is the only thing
   * anybody holding it wants stopped.
   */
  useEffect(() => {
    if (paused) return;
    const rotate = setInterval(() => setPage((p) => (p + 1) % PAGES.length), PAGE_MS);
    return () => clearInterval(rotate);
  }, [paused]);

  const skip = () => setPage((p) => (p + 1) % PAGES.length);

  // Space holds, the right arrow skips. The guard keeps a press from firing
  // while one of the buttons has focus, which would act twice on one key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const onControl = !!el && (el.tagName === "BUTTON" || el.tagName === "INPUT");
      if (e.code === "Space" || e.key === " ") {
        // Space activates a focused button on its own, so letting it through
        // here as well would toggle twice on one press.
        if (onControl) return;
        e.preventDefault();
        setPaused((v) => !v);
        return;
      }
      if (e.key === "ArrowRight") {
        // No such clash for the arrow: it does nothing to a focused button, so
        // it has to keep working after somebody has clicked Skip once.
        e.preventDefault();
        // Skipping while held moves one page and stays held, which is what
        // somebody stepping through the board by hand wants.
        setPage((p) => (p + 1) % PAGES.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/screen?k=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (!res.ok) return; // keep the last good numbers on screen
        const next = (await res.json()) as Snapshot;
        if (cancelled) return;

        const fresh = (next.metrics.alertEvents ?? []).filter((e) => !seen.current.has(e.id));
        for (const e of fresh) seen.current.add(e.id);
        /*
         * At most a few at a time, newest kept.
         *
         * Each alert holds the wall for seven to eleven seconds, so a batch of
         * twelve — which is what a sync outage and recovery delivers in one
         * poll — is two solid minutes in which the board shows no figures at
         * all. The newest are the ones the room means by "what just happened";
         * the older ones are history by the time they would have played.
         *
         * A fresh load never hits this: `seen` is seeded from the first
         * snapshot, so everything already on the books counts as watched.
         */
        if (fresh.length) setQueue((qd) => [...qd, ...fresh.map((e): QueueItem => ({ t: "event", e }))].slice(-3));

        setSnap(next);
      } catch {
        // Network blip — the board keeps showing the previous snapshot.
      }
    }

    async function resync() {
      try {
        const res = await fetch(`/api/screen/refresh?k=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (!res.ok) return;
        const { refreshed } = (await res.json()) as { refreshed?: boolean };
        if (refreshed && !cancelled) await poll();
      } catch {
        // The board carries on showing the snapshot it has.
      }
    }

    void resync();
    const timer = setInterval(poll, REFRESH_MS);
    const resyncTimer = setInterval(resync, RESYNC_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearInterval(resyncTimer);
    };
  }, [token]);

  /*
   * The enquiry poll.
   *
   * Its own effect and its own clock, so the board's figures and the board's
   * doorbell cannot slow each other down.
   *
   * The watermark is the server's, never this television's. The first call
   * sends no `since` and the route answers with the newest enquiry already on
   * file and nothing to show — which is what stops a panel that reloads itself
   * at three in the morning waking up and announcing the whole of yesterday.
   * After that the board hands back whatever it was given, so a poll that
   * fails changes nothing and the next one asks for the same window again.
   */
  const since = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;

    async function pollLeads() {
      try {
        const qs = since.current ? `&since=${encodeURIComponent(since.current)}` : "";
        const res = await fetch(`/api/screen/leads?k=${encodeURIComponent(token)}${qs}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const { next, leads } = (await res.json()) as { next?: string; leads?: NewLead[] };
        if (cancelled) return;
        if (next) since.current = next;
        // The same seen set as the figures' alerts: a board is not allowed to
        // announce the same thing twice, whichever door it came in by.
        const fresh = (leads ?? []).filter((l) => !seen.current.has(`lead-${l.id}`));
        for (const l of fresh) seen.current.add(`lead-${l.id}`);
        if (fresh.length) setQueue((qd) => [...qd, ...fresh.map((lead): QueueItem => ({ t: "lead", lead }))].slice(-3));
      } catch {
        // A blip. The watermark has not moved, so nothing has been missed.
      }
    }

    void pollLeads();
    const timer = setInterval(pollLeads, LEADS_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token]);

  const m = snap.metrics;
  const celebrating = queue[0];
  const name = PAGES[page];
  // Anything downstream of ServiceTitan is unknown rather than zero until the
  // sync has actually talked to it.
  const live: Live = { st: snap.sources.servicetitan?.state !== "not-configured" };

  const degraded = Object.entries(snap.sources).filter(([, s]) => s.state !== "ok");

  /**
   * The light at the bottom of the wall, which is the only thing anybody checks
   * before believing a figure.
   *
   * Green means the snapshot is current AND every feed answered; amber means one
   * of those is not true, and the words next to it say which. A clock face was
   * there before — "Synced 4 min ago" — which asks the room to do the judging.
   *
   * Two minutes is generous against a thirty-second refresh, so one missed poll
   * on a flaky connection doesn't flick the board to amber.
   */
  const ageMs = now.getTime() - Date.parse(snap.computedAt);
  const fresh = Number.isFinite(ageMs) && ageMs < 2 * 60_000;
  const healthy = fresh && degraded.length === 0;
  const journalAlert = !!m.journals && m.journals.errors > 0;
  /*
   * Email that never arrived. The same footer, the same shape, the same rule:
   * it is on every page, because it needs the office rather than the crew,
   * and it is gone the moment somebody marks it sorted.
   *
   * Both can be up at once — a day where Xero is refusing journals and the
   * mail is bouncing is a day somebody should know about twice.
   */
  const emailAlert = !!m.email && m.email.trouble > 0;

  /*
   * On Pace, one of them at most.
   *
   * That page's footer has to carry the dials' key — the words and dots that
   * are the reason the dials may use red and green at all — and with both
   * banners up as well, the brand and the clock were pushed off the end at
   * 1920x1080. So Pace shows the worse of the two: an email to somebody
   * outside the business beats a journal entry, because one of those is a
   * customer waiting and the other is bookkeeping. The page turns every
   * thirty seconds and the other eight carry both, so nothing is hidden for
   * longer than that.
   */
  const crowded = PAGES[page] === "Pace" && journalAlert && emailAlert;
  const emailWins = Boolean(m.email && m.email.toCustomer);
  const showJournal = journalAlert && !(crowded && emailWins);
  const showEmail = emailAlert && !(crowded && !emailWins);
  /*
   * An alert takes the whole wall, so the page underneath is put away rather
   * than merely covered.
   *
   * It was merely covered, and on Areas the map came out on top of a sale —
   * yellow everywhere and the suburbs drawn straight over it. Leaflet numbers
   * its own panes from 400 and its controls at 1000, against the alert's 20, so
   * the honest fix was a stacking context the map could not climb out of.
   *
   * That is in the stylesheet too, but it is not what this is. I could not
   * reproduce the overlay outside the real page, and a fix for a cause you have
   * not seen is a guess. Hiding the grid cannot fail whatever the cause: there
   * is nothing left to paint over the top.
   */
  const alertUp = Boolean(shownPreview || celebrating);

  return (
    <div
      className={`screen ${shownTheme === "dark" ? "screen--dark" : ""}${alertUp ? " screen--alerting" : ""}`}
      style={{ "--page-ms": `${PAGE_MS}ms`, "--safe": safe } as CSSProperties}
    >
      {shownPreview ? (
        <Alert key={`${shownPreview}-${previewRun}`} alert={previewAlert(shownPreview)} onDone={() => setPreviewRun((n) => n + 1)} />
      ) : (
        celebrating && (
          <Alert
            key={celebrating.t === "lead" ? `lead-${celebrating.lead.id}` : celebrating.e.id}
            alert={celebrating.t === "lead" ? leadAlertFrom(celebrating.lead) : alertFrom(celebrating.e, m)}
            onDone={() => setQueue((qd) => qd.slice(1))}
          />
        )
      )}

      <div className="screen__bar">
        {/* Keyed so the entrance replays with the page, like the tiles below.
            The subtitle is not: on Today it carries a clock that ticks every
            thirty seconds, and re-running the animation for a changed minute
            would make the header twitch on its own. */}
        <span className="screen__title" key={name}>{name}</span>
        {/* The period this page measures, in the same place on every page, so
            two pages are never silently compared over different ones. */}
        {WINDOWS[name](m) && <span className="screen__when">{WINDOWS[name](m)}</span>}
        <span className="screen__subtitle">
          {name === "Today"
            ? `${now.toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "Australia/Melbourne",
              })} · ${now.toLocaleTimeString("en-AU", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "Australia/Melbourne",
              })}`
            : SUBTITLES[name](m)}
        </span>

        {/* Six dashes and a line of words, in place of the tab strip the board
            used to carry.
            
            The strip spelled out all six page names at every moment, which is
            six things to read to answer one question — where are we up to. The
            dashes answer it without reading, and the line underneath names only
            the page that matters next. It also matches the portal, which is the
            point of the exercise. */}
        <nav className="screen__pager" aria-label="Board pages">
          {/* The strip is told how many pages it is drawing, so it can keep
              its own width as pages are added. Adding the eleventh widened it
              by two units and started ellipsing the Daily pace subtitle. */}
          <span
            className="screen__dashes"
            aria-hidden="true"
            style={{ "--page-n": PAGES.length } as CSSProperties}
          >
            {PAGES.map((p, i) => (
              <span key={p} className={`screen__dash ${i === page ? "is-on" : ""}`} />
            ))}
          </span>
          <span className="screen__pagertxt">
            {paused ? `${page + 1} of ${PAGES.length} · held` : `${page + 1} of ${PAGES.length} · next: ${PAGES[(page + 1) % PAGES.length]}`}
          </span>
        </nav>
        {/* Deliberately quiet: this sits on a wall all day and a control nobody
            is touching should not be competing with the figures. It only comes
            forward once it is holding something, because at that point the room
            needs to know the board stopped on purpose. */}
        <button
          type="button"
          className="screen__ctl screen__skip"
          onClick={skip}
          title="Next page (right arrow)"
        >
          <span className="screen__holdicon" aria-hidden>
            <svg viewBox="0 0 12 14" width="100%" height="100%">
              <path d="M1 1l8 6-8 6z" fill="currentColor" />
              <rect x="9.5" y="1" width="2" height="12" fill="currentColor" />
            </svg>
          </span>
          Skip
        </button>
        <button
          type="button"
          className={`screen__ctl screen__hold ${paused ? "is-on" : ""}`}
          onClick={() => setPaused((v) => !v)}
          aria-pressed={paused}
          title={paused ? "Resume (space)" : "Hold this page (space)"}
        >
          <span className="screen__holdicon" aria-hidden>
            {paused ? (
              <svg viewBox="0 0 12 14" width="100%" height="100%"><path d="M1 1l10 6-10 6z" fill="currentColor" /></svg>
            ) : (
              <svg viewBox="0 0 12 14" width="100%" height="100%"><rect x="1" y="1" width="3.5" height="12" fill="currentColor" /><rect x="7.5" y="1" width="3.5" height="12" fill="currentColor" /></svg>
            )}
          </span>
          {paused ? "Held" : "Hold"}
        </button>
      </div>

      {/* The rule under the header is the clock for THIS page.
      
          It swept a sixth of the width per page, so it measured the cycle: a
          full bar meant the board was about to return to Today, which is not
          what anybody in the room wants to know. It now empties and refills over
          each page's thirty seconds, so the question it answers is "how long
          have I got on this one".

          A CSS animation restarted by the page key, not a ticking state — the
          board runs for months on a kiosk, and re-rendering the tree once a
          second to advance a bar is what degrades a display nobody reloads. */}
      <div className={`screen__rule ${paused ? "is-held" : ""}`} aria-hidden="true">
        <span key={page} />
      </div>

      {/* Keyed on the page so React replaces the subtree rather than patching
          it: the entrance animation below is on the tiles themselves, and it
          only replays on a fresh mount. */}
      <div
        key={page}
        /* By name, for the reason the page switch below is: this was an array
           indexed by page number, so inserting a page silently gave every page
           after it the wrong row proportions — and gave the new one somebody
           else's. Nothing typechecks that. */
        className={`screen__grid ${GRID_CLASS[name]}`}
        /* Team is the one page whose column count is the data: one card a
           person, however many that is. The twelve-column grid the other pages
           share gave each card a twelfth of the width. */
        style={name === "Team" ? ({ "--team-n": Math.min(6, m.salesLeaderboard.length) || 1 } as CSSProperties) : undefined}
      >
        <TickerScope.Provider value={name}>
        {/* Keyed by name, not by index. It was `page === 4 && <TeamPage/>`, which
            means inserting a page silently renders the wrong one under the
            right heading — the sort of thing that typechecks, builds, and is
            only caught by somebody looking at the wall. */}
        {name === "Today" && <TodayPage m={m} live={live} />}
        {name === "Pace" && <PacePage m={m} live={live} now={now} />}
        {name === "Quotes" && <QuotesPage m={m} live={live} />}
        {name === "Invoices" && <InvoicesPage m={m} live={live} />}
        {name === "Daily pace" && <DailyPacePage m={m} live={live} />}
        {name === "Crew" && <CrewPage m={m} live={live} />}
        {name === "Team" && <TeamPage m={m} live={live} />}
        {name === "Job types" && <JobTypesPage m={m} live={live} />}
        {name === "Sectors" && <SectorsPage m={m} live={live} />}
        {name === "Areas" && <AreasPage m={m} live={live} />}
        {name === "Weather" && <WeatherPage m={m} live={live} />}
        </TickerScope.Provider>
      </div>

      <div className={`screen__foot${showJournal || showEmail ? " has-alert" : ""}`}>
        <span className="screen__feed">
          <span className={`screen__dot ${healthy ? "" : "screen__dot--stale"}`} aria-hidden />
          <b>{healthy ? "Live" : "Catching up"}</b>
        </span>
        {/* A journal entry ServiceTitan couldn't post to Xero. On every page,
            because it's the one thing on the board that needs the office
            rather than the crew — and gone the run after it's fixed. */}
        {showJournal && m.journals && <JournalAlert j={m.journals} short={name === "Pace"} />}
        {/* An email that was refused on the way out, or bounced on the way in.
            Nobody was told either way until this: a send failure went to a
            serverless log and a bounce went nowhere at all. */}
        {showEmail && m.email && <EmailAlert h={m.email} short={name === "Pace"} />}
        {/* With the alert up and every feed fine, the green Live dot says what
            this line would, and the Pace page's key needs the room. */}
        {!((showJournal || showEmail) && healthy) && !ratesSetByHand(m) && <span>
          {degraded.length === 0
            ? fresh
              ? "All feeds connected"
              : "Waiting on a refresh"
            : degraded.map(([n, sc]) => `${n} ${sc.state}${sc.detail ? ` — ${sc.detail}` : ""}`).join(" · ")}
        </span>}
        {/* The dials' key, on the page that has dials. The words and dots are
            what let somebody who has never been told read the colours — and
            they are the reason the dials may use red and green at all. The
            bands beside them are what says how close Close is: the two rows
            quote their shortfall in different units, so neither of those
            numbers answers it. */}
        {name === "Pace" && (
          <span className="screen__legend">
            {/* A rate somebody typed, said where it cannot be missed.
                The plan stops following the business the moment one is set and
                nothing on the wall used to say so — `set` was carried on every
                rate and never shown. In the status palette's warning colour and
                written out, because a colour never carries a meaning alone. */}
            {ratesSetByHand(m) && <b className="lg__set">⚠ {ratesSetByHand(m)} set by hand</b>}
            <b className="lg__head">Done of what the goal needs by now</b>
            {ZONES.map((z) => (
              <span key={z.k} className="lg">
                <i className={`lg__dot is-${z.k}`} aria-hidden />
                {ZONE_LABEL[z.k]} <em>{ZONE_BAND[z.k]}</em>
              </span>
            ))}
          </span>
        )}
        {/* Said in words, not a crossed-out speaker: the board's rule is that a
            colour or a glyph never carries a meaning on its own, and this one
            has to be read from four metres by somebody who has never seen it
            before. Gone the moment a button is pressed. */}
        {sound === "off" && (
          <span className="screen__mute" title="Press any button on the remote to allow sound">
            <i aria-hidden>♪</i> Sound off · press any button
          </span>
        )}
        {sound === "notes" && (
          <span className="screen__mute" title="The alert sound file would not play, so the board used its built-in notes">
            <i aria-hidden>♪</i> Beeps only · {soundWhy || "clip did not load"}
          </span>
        )}
        <span className="screen__right">
          <span className="screen__brand">
            Advanced <em>Gas &amp; Aircon</em>
          </span>
          <span>
            {now.toLocaleTimeString("en-AU", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: "Australia/Melbourne",
            })}
          </span>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ /01 Today */
/**
 * Today: three figures, then three more with their context.
 *
 * Eleven tiles became six. The page had grown a tile per available number —
 * leads, jobs booked, jobs completed, quotes out, overdue, service mix, three
 * rates — and at that density nothing on it was bigger than anything else,
 * which is the one thing a wall read from four metres needs. The design cuts
 * it to two rows of three, and the figures that left are not lost: jobs
 * completed is the line under Invoiced, the lead count is the line under Jobs
 * booked, quotes out has a page of its own, and the service mix is the job-type
 * table on Performance.
 *
 * Booking rate and cancel rate went with them, and did not come back. Nothing
 * syncs the calls behind a booking rate (ServiceTitan's Telecom scope) and
 * nothing pulls cancellations at all, so both cards had sat there reading "—"
 * for months. A tile that has never once shown a number is not holding a place,
 * it is taking one. See DASHBOARD.md.
 */
function TodayPage({ m, live }: { m: Metrics; live: Live }) {
  const soldJobs = live.st ? m.soldCountToday : null;
  /*
   * Sold beside quoted, on one line.
   *
   * "3 jobs sold" on its own is a number the room can't place: three out of
   * three is a day, three out of twenty is a different one. The quotes written
   * today are the denominator everybody actually has in their head.
   */
  /*
   * What today's figure is, when it is not just today's sales.
   *
   * A quote sold a fortnight ago and edited this morning puts the difference
   * on this morning — that is the rule the sales ledger was built to (0058),
   * and it is right. What it is not is readable: on 22 October this card read
   * $656 over "3 jobs sold", because three sales worth $4,616 had $3,960
   * taken off an earlier one netted against them, and nothing on the wall
   * said so. The figure is untouched; the line under it now accounts for it.
   */
  const changed = m.soldTodayChanged;
  const changedFoot =
    !changed || changed.value === 0
      ? ""
      : ` · ${changed.value < 0 ? "less" : "plus"} ${plain(Math.abs(changed.value))} ${
          changed.value < 0 ? "off" : "on"
        } ${changed.count === 1 ? "an earlier sale" : `${count(changed.count)} earlier sales`}`;

  const soldFoot =
    soldJobs == null
      ? undefined
      : `${count(soldJobs)} ${soldJobs === 1 ? "job" : "jobs"} sold` +
        (m.quotesCreatedTodayCount > 0
          ? ` · ${count(m.quotesCreatedTodayCount)} ${m.quotesCreatedTodayCount === 1 ? "quote" : "quotes"} written`
          : "") +
        changedFoot;

  const today = m.pace?.standing.today;
  /*
   * Sold is the one of these with no money figure to be measured against.
   *
   * The `sold` step in `standing` counts jobs, so its byNow is in jobs — the
   * same unit trap that put 529,611% on a Team card. The day's sold *value*
   * target is on the plan, and how much of the day has gone is on the
   * calendar, so the by-now for money is the two multiplied.
   */
  /*
   * The day's ask, not a verdict on it. See askedOfToday: the pace chip that
   * used to sit here divided today's figure by the fraction of the working day
   * that had gone, which on a lumpy day is noise wearing a percentage.
   *
   * `sold` in `standing` counts jobs, so the money target comes off the day
   * plan's value rather than that step's need.
   */
  const soldTarget = m.pace?.day.sold.value ?? null;

  return (
    <>
      {/* Sold today, on the left where the eye starts. */}
      <HeroCard
        navy
        label="Sold today"
        value={st.plain(m.soldToday, live)}
        goals={live.st ? goalMarks(m, m.soldToday, soldTarget) : undefined}
        foot={live.st ? footWithTarget(soldTarget, soldFoot) : soldFoot}
      />

      {/* Everything billed today, whenever the job was done — the office
          catching up on Thursday's jobs on a Monday is Monday's invoicing. The
          line ages what went out by how long each job had been waiting, because
          "2 done on an earlier day" said there was a lag and nothing about its
          size, and the size is the whole point: two jobs billed a day late is
          keeping up, two billed a fortnight late is money that sat there. The
          four buckets always show, zeroes included, so the line is in the same
          shape every day and the room reads position rather than words. */}
      <SideCard
        label="Invoiced today"
        value={st.plain(m.revenueToday, live)}
        goals={live.st ? keepUpMarks(m, m.revenueToday) : undefined}
        rows={
          !live.st || m.jobsInvoicedToday === 0
            ? undefined
            : [
                { k: "Done today", v: count(m.jobsInvoicedTodayAge.sameDay) },
                { k: "1–3 days", v: count(m.jobsInvoicedTodayAge.days1to3) },
                { k: "4–7 days", v: count(m.jobsInvoicedTodayAge.days4to7) },
                { k: "Over a week", v: count(m.jobsInvoicedTodayAge.older) },
              ]
        }
        foot={
          !live.st
            ? undefined
            : [
                keepUpFoot(m),
                m.jobsInvoicedToday === 0
                  ? "nothing billed yet today"
                  : `${count(m.jobsInvoicedToday)} ${m.jobsInvoicedToday === 1 ? "job" : "jobs"} billed, by how long each waited`,
              ].filter(Boolean).join(" · ")
        }
      />

      {/* Quoted today completes the money row: written, billed, closed. The
          three figures the day is actually judged on sit on one line, and the
          counts move down to the row underneath. */}
      <SideCard
        label="Quoted today"
        value={st.plain(m.quotesCreatedTodayValue, live)}
        goals={live.st ? goalMarks(m, m.quotesCreatedTodayValue, m.pace?.day.quoted.value) : undefined}
        rows={
          !live.st || m.quotesCreatedTodayCount === 0
            ? undefined
            : [
                { k: "Jobs", v: count(m.quotesCreatedTodayCount) },
                { k: "Options", v: count(m.quotesCreatedTodayOptions) },
                { k: "Each", v: avgOptions(m.quotesCreatedTodayOptions, m.quotesCreatedTodayCount) },
                { k: "Already closed", v: count(m.quotesCreatedTodaySold) },
              ]
        }
        foot={
          !live.st
            ? undefined
            : [
                quotingAskedOfToday(m),
                m.quotesCreatedTodayCount === 0
                  ? "nothing quoted yet today"
                  : `${count(m.quotesCreatedTodayCount)} priced today`,
              ]
                .filter(Boolean)
                .join(" · ") || undefined
        }
      />

      {/* Booked and completed as two halves of one card: what came in today
          against what went out. They are the same unit and the same day, and
          side by side the gap between them is the thing worth seeing — a day
          that books eight and finishes two is a different day from one that
          books two and finishes eight. The job types stay, in the foot. */}
      <SplitRateCard
        label="Jobs today"
        halves={[
          {
            name: "Booked",
            value: st.count(m.bookingsToday, live),
            sub:
              footWithTarget(
                today?.booked.need,
                `from ${count(m.leadsToday)} ${m.leadsToday === 1 ? "lead" : "leads"}` +
                  (m.jobsScheduledNext7 != null ? ` · ${count(m.jobsScheduledNext7)} in the next 7 days` : ""),
                "count",
              ) ?? "",
          },
          {
            name: "Completed",
            value: st.count(m.jobsCompletedToday, live),
            sub: footWithTarget(today?.completed.need, `${count(m.jobsCompletedWeek)} this week`, "count") ?? "",
          },
        ]}
        /* Each type and its count held together, because this line wraps and a
           type name is long enough to push its own number onto the next row —
           "Service - Gas Ducted Heater" over a line with a lone "3" under it,
           which reads as a figure belonging to nothing. */
        foot={
          !live.st || m.bookingsTodayTypes.length === 0
            ? undefined
            : m.bookingsTodayTypes.slice(0, 3).map((t, i) => (
                <span key={t.jobType} style={{ whiteSpace: "nowrap" }}>
                  {i > 0 ? " · " : ""}
                  {t.jobType} {count(t.count)}
                </span>
              ))
        }
      />

      {/* Two halves rather than a figure with three lines under it: an agent
          deciding on behalf of a landlord is a different sell from a
          householder spending their own money, and the only reason to split
          the rate is so the two can be read against each other.

          The foot keeps what a job was priced at and how many ways — per job
          over the same thirty days as the rates above it, because an average
          counted per option under a rate counted per job would be one sentence
          disagreeing with itself. */}
      <SplitRateCard
        label="Close rate"
        note={live.st ? `last ${m.outstandingDays ?? 30} days` : undefined}
        halves={
          live.st && m.closeRateByUnit.length
            ? m.closeRateByUnit.map((u) => ({
                name: u.group,
                value: u.quoted > 0 ? pct(u.rate) : NA,
                sub: u.quoted > 0 ? `${count(u.won)} of ${count(u.quoted)} jobs` : "none quoted",
              }))
            : [
                { name: "Domestic", value: NA, sub: "ServiceTitan not connected" },
                { name: "Real Estate", value: NA, sub: "" },
              ]
        }
        foot={
          live.st
            ? `avg quote ${plain(m.avgQuote30d)}${
                m.closeRate30dQuotes > 0
                  ? ` · ${(m.closeRate30dOptions / m.closeRate30dQuotes).toFixed(1)} options per job`
                  : ""
              }`
            : undefined
        }
      />
      {/* What's out, and how late. The office asked for this card to be about
          the money still to come in rather than the day's banking: how many
          invoices are open, what they add up to, and the overdue part by how
          late — the same bands as the Invoices page, so a tall 30+ is the
          thing that sticks out. Today's payments keep the end of the foot. */}
      <SplitRateCard
        label="Money owed"
        halves={[
          {
            name: "Out",
            value: m.receivablesTotal == null ? NA : money(m.receivablesTotal),
            sub:
              m.receivablesCount == null
                ? "not read from Xero yet"
                : `${count(m.receivablesCount)} open ${m.receivablesCount === 1 ? "invoice" : "invoices"}`,
          },
          {
            name: "Overdue",
            value: m.overdueTotal == null ? NA : money(m.overdueTotal),
            // "56 invoices" under "Overdue", directly under "108 open
            // invoices", reads as a second count of the same thing. It is the
            // part of the first that is late, and saying so costs a word.
            sub:
              m.overdueCount == null
                ? "not read from Xero yet"
                : m.receivablesCount != null
                  ? `${count(m.overdueCount)} of the ${count(m.receivablesCount)} are late`
                  : `${count(m.overdueCount)} ${m.overdueCount === 1 ? "invoice" : "invoices"} late`,
          },
        ]}
        foot={
          [
            /*
             * The overdue money in the same bands the Money page and the AR
             * report use, and only the overdue: "Out" and "Overdue" are the
             * two figures above it, so a Current band here would be the third
             * way of saying one of them. It was the board's own fortnight cut
             * — 1–7d, 8–14d — which is a different question asked of the same
             * money, and two cuts of it on two pages thirty seconds apart is
             * how a room starts checking the board against itself.
             */
            lateBands(m.receivablesArAging),
            m.paidToday != null && m.paidToday > 0 ? `paid today ${compact(m.paidToday)}` : null,
          ].filter(Boolean).join(" · ") || undefined
        }
      />
    </>
  );
}

/**
 * Pace: is the year on, and is this week doing what the year needs?
 *
 * The year comes first because it is the question — on for the $3.2M or not,
 * better or worse than yesterday and last week, and what a week has to bring
 * from here to make up the gap. Under it, the six steps the money moves
 * through, each against what the goal needs of it this week and this month:
 * leads, booked, quoted, sold, completed, invoiced.
 *
 * Every need comes from pace.ts, the same arithmetic the portal's Pace page
 * runs, off the same snapshot. Leads carry their count but no verdict: phone
 * calls aren't recorded anywhere the board can read, so "behind" would be a
 * statement about the data rather than the phones.
 */
/**
 * The funnel across the page, one card a column.
 *
 * Leads came off. Nothing counts the phone calls behind a lead — ServiceTitan's
 * Telecom scope is a separate grant — so the card drew no verdict, said "calls
 * not counted" underneath, and took a sixth of the row to do it. In its place
 * is what the quoting was worth, which is the figure the quoting step is
 * actually judged on and the one anybody can act on before lunch.
 */
const STEP_KEYS: Array<{ k: Step; label: string }> = [
  { k: "booked", label: "Booked" },
  { k: "quoted", label: "Quoted" },
  { k: "quotedValue", label: "Quote value" },
  { k: "sold", label: "Sold" },
  { k: "completed", label: "Completed" },
  { k: "invoiced", label: "Invoiced" },
];

/** Which of the plan's two settable rates have been overridden, in words. */
function ratesSetByHand(m: Metrics): string {
  const r = m.pace?.rates;
  if (!r) return "";
  // Short: this shares the footer with the feed state, the zone key and the
  // brand, and the wording that named both rates ran straight under its
  // neighbours. Which rate it is matters less than that one was typed at all —
  // the subtitle above carries the figures.
  if (r.closeRate.set && r.avgSale.set) return "Rates";
  if (r.closeRate.set) return "Close rate";
  if (r.avgSale.set) return "Average sale";
  return "";
}

/**
 * The rates the plan was worked back through, said on the page.
 *
 * Every figure on Pace is the year's goal divided by what this business
 * actually does — the close rate and the average sale it is measuring, not an
 * assumption. That was asked about, which is reason enough to put it on the
 * page: a target nobody can trace the arithmetic of is one they argue with
 * instead of working to.
 *
 * **The override marker is the part that matters.** The portal can force a
 * close rate or an average sale, and until now the board gave no sign — the
 * plan would quietly stop following the business and nothing on the wall would
 * say so. `set` has always been carried on each rate and never shown. A rate
 * somebody typed is named as typed.
 */
function rateNote(m: Metrics): string {
  const r = m.pace?.rates;
  if (!r) return "";
  const bits: string[] = [];
  if (r.closeRate.value != null) bits.push(`${pct(r.closeRate.value)} close rate`);
  // `money`, not `plain`: it abbreviates past $10K, which bounds how long this
  // sentence can get. With full digits a $120,500 average sale pushed the
  // header 11px past its width — measured, not guessed. The goal in the same
  // line is written the same way.
  /*
   * The average option, not the average sale.
   *
   * Two rates fit here and there are three. The close rate and the average
   * option are the pair that turn the goal into the one number the room acts
   * on each morning — quote this much, which is this many quotes — and the
   * average option is the half of it that nothing else on the board names. The
   * average sale has a column of its own on the Team page.
   *
   * Three was measured, not guessed: "21% close rate, $4,510 sale, $4,603
   * quote" ran the subtitle 66px past its width, and "a quote" 5px past it.
   */
  if (r.avgQuote.value != null) bits.push(`${money(r.avgQuote.value)} quote`);
  if (bits.length === 0) return "";
  /*
   * Short on purpose, and the override marker is deliberately not in here.
   *
   * The first draft read "worked back through our own 21% close rate and
   * $4,510 a sale" and overflowed the header by 160px. Measured, the subtitle
   * has 1160px and this phrase can have about 46 characters of it — enough for
   * the rates, not enough to also carry "set by hand", which spilled every
   * variant including the short ones.
   *
   * That is the right answer anyway. A rate somebody typed is an exceptional
   * state and the thing most worth noticing, so it gets a marker of its own in
   * the legend rather than four words trailing a sentence nobody reads to the
   * end. "our" drops when any of it is not ours.
   */
  const typed = r.closeRate.set || r.avgSale.set;
  return ` · at ${typed ? "" : "our "}${bits.join(" and ")}`;
}

function PacePage({ m, live, now }: { m: Metrics; live: Live; now: Date }) {
  const p = m.pace;
  if (!live.st) return <NotConnected what="what each step has done against the goal" />;
  if (!p) {
    return (
      <div className="tile screen__notice c12">
        <span className="tile__value">{NA}</span>
        <span className="tile__sub tile__sub--body">
          No goal is set for this year, so there is nothing to pace against. Set it on the portal&apos;s Pace page
          and this page fills in from the next refresh.
        </span>
      </div>
    );
  }
  const y = p.yearView;
  const cal = m.paceData?.calendar;
  // Working days of the month gone, counting today's hours as they pass —
  // the same "by now" the step cards and the portal use.
  const monthProgress = cal && cal.month.total > 0 ? (cal.month.elapsed + (cal.todayWorking ? cal.dayFraction : 0)) / cal.month.total : 0;
  return (
    <>
      {/* The week first, the month under it, the year at the foot. Nearest
          first: the week is the one anybody can still change. */}
      {/* One card per step, the week above the month, under a single name.
          The step is the thing — "Booked" is one column of the funnel read at
          two lengths — so repeating the heading on a second row of cards made
          twelve charts out of six and invited the eye to read across a row
          rather than down a step. The band labels on the left still say which
          half is which. */}
      <span className="band band--week">This week</span>
      <span className="band band--month">This month</span>
      {STEP_KEYS.map(({ k, label }) => (
        <StepColumn
          key={k}
          label={label}
          stage={k}
          week={p.standing.week[k]}
          month={p.standing.month[k]}
          last={lastWeekOf(p.lastWeek, k)}
          progress={monthProgress}
        />
      ))}

      <span className="band band--year">This year</span>
      {/* The year's margin, not the month's. This row is headed "This year" and
          carries a year of revenue; borrowing the month's figure put seven jobs
          next to $390K and invited the room to read one as the margin on the
          other. Snapshots taken before the year window existed fall back to the
          month rather than blanking the cell. */}
      <YearPace
        y={y}
        margin={(m.jobProfitRecent ?? m.jobProfitYear ?? m.jobProfitMonth)?.margin ?? null}
        costed={(m.jobProfitRecent ?? m.jobProfitYear ?? m.jobProfitMonth)?.costed ?? 0}
        goalPct={p.profitPct}
      />
    </>
  );
}

/** Last week's figure for a step. Quote value is the one the counts don't hold. */
const lastWeekOf = (c: NonNullable<Metrics["pace"]>["lastWeek"], k: Step): number | null =>
  k === "quotedValue" ? c.quotedValue : c[k];

type StepStanding = NonNullable<Metrics["pace"]>["standing"]["week"]["leads"];

/** Whole jobs from ten up, a tenth under it; money in thousands. */
/**
 * What a panel says when Xero has not answered.
 *
 * Not a dash. A dash in a figure is read as "nothing to report", and on a panel
 * where the thing being reported is money owing that is the one reading it must
 * not invite. The footer's light says how old the last reading is; this says
 * which panel is standing on it.
 */
const WAITING = "Waiting on Xero";

/**
 * A band's weight on the page. Reserved for age, like every other use of the
 * status palette — and every band says its days in words beside the colour.
 */
const BAND_CLASS: Record<ArBandKey, string> = {
  // Light to dark to amber to red, in band order, so the bars climb rather
  // than just differ. Current was the darkest of the five at first, which put
  // the heaviest mark on the page against the money nobody has to chase.
  current: "is-soft",
  d1_30: "",
  d31_60: "is-warn",
  d61_90: "is-bad",
  d90: "is-bad",
};

const isMoneyStep = (stage: string) => stage === "invoiced" || stage === "quotedValue";
const stepFig = (stage: string, n: number | null | undefined) => {
  if (n == null) return NA;
  if (isMoneyStep(stage)) return money(n);
  return n >= 10 ? Math.round(n).toLocaleString("en-AU") : (Math.round(n * 10) / 10).toLocaleString("en-AU");
};

/**
 * One step of the funnel, over a week or over a month.
 *
 * Both rows are the same card: what has been done of what the period needs, in
 * the middle of the dial, and the verdict with its percentage underneath. The
 * two differ only in the line at the foot — the week says what a day has to
 * bring to catch up, the month says where it lands at this rate — because the
 * week is still steerable and the month is mostly a forecast.
 *
 * The percentage beside the verdict is done ÷ by now, the same scale the zones
 * and the footer's key are in. It used to be the week's shortfall in jobs and
 * the month's in points of the month, which meant three numbers on one page in
 * three units and no way to tell which band any of them was in.
 */
function StepColumn({
  label,
  stage,
  week,
  month,
  last,
  progress,
}: {
  label: string;
  stage: string;
  week: StepStanding;
  month: StepStanding;
  last: number | null;
  progress: number;
}) {
  return (
    <div className="tile step">
      <span className="step__head">{label}</span>
      <div className="step__half">
        <StepDial label={label} stage={stage} s={week} last={last} bare />
      </div>
      <div className="step__half step__half--month">
        <StepDial label={label} stage={stage} s={month} progress={progress} bare />
      </div>
    </div>
  );
}

function StepDial({
  label,
  stage,
  s,
  last,
  progress,
  bare = false,
}: {
  label: string;
  stage: string;
  s: StepStanding;
  /** The week's card: what the same step did last week. */
  last?: number | null;
  /** The month's card: how much of it has gone, for the run-rate line. */
  progress?: number;
  /** Inside a StepColumn, which already carries the name and the card. */
  bare?: boolean;
}) {
  const index = paceIndex(s.done, s.byNow);
  const verdict = s.need == null ? null : verdictOf(index);
  const over = (s.gap ?? 0) >= 0;

  // Where the month lands if the rest of it looks like the part so far.
  // Rounded before formatting: a projected job count of 64.308 is arithmetic
  // leaking onto the wall.
  const landing =
    progress != null && progress > 0 && s.done != null && s.need != null ? Math.round(s.done / progress) : null;

  return (
    <Gauge
      label={label}
      bare={bare}
      index={index}
      verdict={verdict}
      figure={stepFig(stage, s.done)}
      of={s.need == null ? "no target yet" : `of ${stepFig(stage, s.need)}`}
      status={verdictText(index, verdict)}
      foot={
        landing != null
          ? `Heading for ${stepFig(stage, landing)}`
          : !over && s.perDayLeft != null
            ? `${stepFig(stage, s.perDayLeft)} a day to catch up`
            : last != null
              ? `Last week ${stepFig(stage, last)}`
              : undefined
      }
    />
  );
}

/**
 * The year, as one navy strip: how far off the goal's line we are, whether
 * that got better or worse since yesterday and since last week, what a week
 * has to bring from here, and whether the jobs are keeping the margin.
 */
function YearPace({ y, margin, costed, goalPct }: {
  y: NonNullable<Metrics["pace"]>["yearView"];
  margin: number | null;
  costed: number;
  goalPct: number | null;
}) {
  if (!y) {
    return (
      <div className="year">
        <span className="year__none">The year&apos;s running total starts from the next refresh.</span>
      </div>
    );
  }
  const behind = y.gap < 0;
  const drift = (then: number | null) => {
    if (then == null) return { text: NA, cls: "" };
    const d = y.gap - then;
    if (Math.abs(d) < 1) return { text: "● No change", cls: "" };
    return d > 0 ? { text: `▲ ${money(d)} better`, cls: "is-up" } : { text: `▼ ${money(-d)} worse`, cls: "is-down" };
  };
  const wk = drift(y.gapLastWeek);
  /** This year to date against the same date last year. */
  const lastYear = (() => {
    const d = y.ytd - y.lastYearToDate;
    if (y.lastYearToDate <= 0) return { text: NA, cls: "" };
    if (Math.abs(d) < y.lastYearToDate * 0.01) return { text: "● Level", cls: "" };
    return d > 0 ? { text: `▲ ${money(d)} up`, cls: "is-up" } : { text: `▼ ${money(-d)} down`, cls: "is-down" };
  })();

  const pc = (n: number) => `${Math.min(100, Math.max(0, (n / y.goal) * 100))}%`;
  // Where the run rate lands, drawn as a dashed continuation of the bar rather
  // than as another figure: the gap between where the solid stops and where the
  // dashes stop is the whole argument of this strip.
  const landing = y.landing == null ? null : Math.max(y.ytd, y.landing);

  const marginVerdict =
    margin == null || goalPct == null ? null : margin >= goalPct / 100 ? "ahead" : margin >= goalPct / 100 - 0.02 ? "close" : "behind";

  return (
    <div className="year year--pace">
      <div className="year__main">
        {/* Where we are is the big figure and the gap is the note beside it.
            It was the other way round, which made the headline of the strip a
            number nobody banked — and on a wall the biggest thing on a card is
            read as the thing it is about. */}
        <span className="year__nums">
          <b className="year__gap">{money(y.ytd)}</b>
          <em className={`year__vs ${behind ? "is-behind" : "is-ahead"}`}>
            {Math.abs(y.gap) < y.goal * 0.005 ? "on pace" : behind ? `${money(-y.gap)} behind` : `${money(y.gap)} ahead`}
          </em>
        </span>
        <span className="year__track">
          {landing != null && (
            <span className="year__run" style={{ left: pc(y.ytd), width: `calc(${pc(landing)} - ${pc(y.ytd)})` }} />
          )}
          <span className="year__fill" style={{ width: pc(y.ytd) }} />
          {/* The line the goal says we should be on. */}
          <span className="year__mark" style={{ left: pc(y.byNow) }} />
        </span>
      </div>
      <div className="year__side">
        <span className="year__k">Tracking to · {endLabel(y.endsOn)}</span>
        <span className="year__v">
          {y.landing == null ? NA : money(y.landing)}
          <em> of {money(y.goal)}</em>
        </span>
      </div>
      {/* Where this year stands against the one before it, which is the goal
          the room actually feels: $1.9M was last year, and beating it is a
          different question from landing a $3.2M stretch. The pair reads as
          one sentence — up this much at this date, heading for that much by
          June — and the two can disagree, because a flat run rate off the last
          four weeks has no idea last year was back-loaded.

          It replaced "Since yesterday". A day's drift on a year-to-date figure
          is $1,346 of noise; "Since last week" beside it carries the same
          signal with a week of smoothing, and this is the number somebody
          repeats in the van. */}
      <div className="year__side">
        <span className="year__k">Last year · {money(y.lastYear)}</span>
        <span className={`year__v year__v--drift ${lastYear.cls}`}>{lastYear.text}</span>
      </div>
      <div className="year__side">
        <span className="year__k">Since last week</span>
        <span className={`year__v year__v--drift ${wk.cls}`}>{wk.text}</span>
      </div>
      <div className="year__side">
        <span className="year__k">{behind ? "To catch up" : "To stay on"}</span>
        <span className="year__v">
          {y.weekNeeded == null ? NA : money(y.weekNeeded)}
          <em> a week</em>
        </span>
      </div>
      <div className="year__side">
        {/* The sample size sits in the key line, and on this cell it is the whole
            caveat: ServiceTitan carries a cost on about a sixth of the year's
            revenue, so this is thirty jobs' margin, not the year's. Saying how
            many is the difference between a figure and a claim. */}
        <span className="year__k">Job margin · {costed > 0 ? `${costed} ${costed === 1 ? "job" : "jobs"}, 30d` : "30 days"}</span>
        <span className={`year__v ${marginVerdict ? `is-${marginVerdict}` : ""}`}>
          {margin == null ? NA : pct(margin)}
          {margin != null && goalPct != null ? (
            <em>
              {" "}
              of {goalPct}%{marginVerdict ? ` · ${marginVerdict}` : ""}
            </em>
          ) : null}
        </span>
      </div>
    </div>
  );
}

/** "30 June" — the day the goal's year runs to. */
const endLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "long", timeZone: "UTC" });

/** The month the board is pacing, named rather than numbered. */
const monthName = (now: Date) =>
  now.toLocaleDateString("en-AU", { month: "long", timeZone: "Australia/Melbourne" });

/**
 * Invoices: money to bill, money owed, and what is overdue.
 *
 * The only page on the board that is a work list rather than a score. Every
 * figure on it is something one person in the office does next, which is why
 * the subtitle says so — the crew can skip this one.
 *
 * Two things the design asked for are not here, and deliberately:
 *
 * - **VEU rebates to come.** Nothing in this database knows about a VEU
 *   lodgement. There is no table, no column and no field on the job; the
 *   figure would have had to be invented. Paid today takes the fourth tile
 *   instead, which is real and belongs on a money page.
 * - **The paperwork each job needs** ("Plumbing cert + VEU form"). That is a
 *   rule about job type that nobody has written down anywhere this code can
 *   read. A chip guessed from a job-type string would be wrong on the job that
 *   matters, which is worse than no chip.
 */
function InvoicesPage({ m, live }: { m: Metrics; live: Live }) {
  /*
   * The same bands as the Money page, and as the AR report the office opens.
   *
   * This panel aged the money over a fortnight — 1–7, 8–14, 15–30, 30+ — on
   * the argument that its question was whether anything was slipping *this
   * week*, which was a fair argument for one page in isolation. It stopped
   * being one when the same money appeared in thirties on Money and on
   * Today's Money owed tile: three pages, thirty seconds apart, cutting one
   * figure three ways. A room that has to reconcile the board against itself
   * stops reading it. One cut, everywhere, and it is the accountant's.
   *
   * A band the snapshot does not carry counts as zero, because
   * `receivablesArAging` is carried forward when a Xero read fails or is
   * skipped, and a snapshot written before it has none of these keys.
   */
  const a = m.receivablesArAging;
  const num = (v: number | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const aging = a ? (Object.fromEntries(AR_BANDS.map((b) => [b.key, num(a[b.key])])) as Record<ArBandKey, number>) : null;
  const owed = m.receivablesTotal ?? 0;
  /* The ageing bars are shares of what is owed, not of the biggest bucket: the
     question is how much of the money is late, and scaling to the largest row
     makes a tidy ledger look like a bad one. */
  const bar = (v: number) => (owed > 0 && Number.isFinite(v) ? Math.max(0.02, v / owed) : 0);

  return (
    <>
      <HeroCard
        navy
        label="To bill"
        value={live.st ? count(m.toBillCount) : NA}
        foot={
          !live.st
            ? undefined
            : m.toBillCount === 0
              ? "everything finished is billed"
              : `${m.toBillCount === 1 ? "job" : "jobs"} done, not billed yet` +
                /* The age of the oldest, not the value of the lot. Most service
                   work is priced after the visit, so the queue has no value
                   until somebody puts one on it — and "96 days" is the thing
                   that gets someone out of their chair, where "$13,910 of it
                   already sold" reads as a tenth of the problem. */
                (m.toBillOldestDays != null ? ` · oldest ${m.toBillOldestDays} days` : "")
        }
      />
      <HeroCard
        label="Owed to us"
        value={xeroFig(m.receivablesTotal)}
        foot={
          m.paidToday != null && m.paidToday > 0
            ? `invoiced, not paid yet · paid today ${plain(m.paidToday)}`
            : "invoiced, not paid yet"
        }
      />
      <HeroCard
        label="Overdue"
        value={xeroFig(m.overdueTotal)}
        foot={
          m.overdueCount == null
            ? undefined
            : `${count(m.overdueCount)} ${m.overdueCount === 1 ? "invoice" : "invoices"} past their due date`
        }
      />
      <HeroCard
        label="Paid today"
        value={live.st ? plain(m.paidToday ?? 0) : NA}
        foot={
          m.paymentsToday == null
            ? undefined
            : m.paymentsToday === 0
              ? "nothing in yet today"
              : /* Taken in ServiceTitan, where payments have lived since 17 September;
                 Xero only sees them once the money clears through the bank feed,
                 so this reads ahead of Xero and isn't meant to match it. The
                 tile is "Paid today", so the count reads as payments without
                 the word, and the line stays on one row at 1920. */
                // The deposit / part / final split moved here from Today's money
                // card when that card became what's owed.
                paidKindLine(m.paidKinds) ?? `${count(m.paymentsToday)} in ServiceTitan · ${plain(m.paidMonth ?? 0)} this month`
        }
      />

      {/* The work list, oldest first — the order they get chased in. It used to
          be newest first over a fortnight, which showed the tidy-up and hid the
          backlog: 39 jobs against the year's 146, of which 51 are more than
          sixty days old. */}
      <div className="tile inv__list">
        <div className="tile__head">
          <span className="tile__title">To bill · oldest first</span>
          <span className="tile__sub">do the paperwork, then bill it</span>
        </div>
        {!live.st || m.toBill.length === 0 ? (
          <span className="tile__sub">{live.st ? "Nothing waiting to be billed" : NA}</span>
        ) : (
          <div className="quotes">
            {m.toBill.map((j) => (
              <div className="quote inv__row" key={j.id}>
                <span className="quote__label">
                  {/* The kind of work is wrapped so it, and not the job number,
                      is what gives way when the row is too narrow. */}
                  <span className="quote__what">
                    {j.jobType ?? "Job"}
                    {j.suburb ? <span className="inv__where"> · {j.suburb}</span> : null}
                  </span>
                  {j.jobNumber ? <span className="quote__job">#{j.jobNumber}</span> : null}
                </span>
                <span className="quote__at">{waitedFor(j.at)}</span>
                <span className="quote__value">{j.value != null && j.value > 0 ? plain(j.value) : <span className="inv__unpriced">to price</span>}</span>
              </div>
            ))}
          </div>
        )}
        {live.st && m.toBillAges && m.toBillCount > m.toBill.length ? (
          /* The six on the list are the oldest six of many. Without this the
             tile reads as six jobs to bill while the card above it says 146,
             and the two look like they are describing different things. */
          <span className="tile__sub inv__backlog">
            {count(m.toBillAges.d0_14)} under a fortnight · {count(m.toBillAges.d15_30)} to a month ·{" "}
            {count(m.toBillAges.d31_60)} to two · <b>{count(m.toBillAges.d60plus)} older</b>
          </span>
        ) : null}
      </div>

      {/* Oldest first, because that is the order they get rung in. No customer
          names: this is a wall in a room the public walks through. */}
      <div className="tile inv__chase">
        <div className="tile__head">
          <span className="tile__title">Overdue · chase these</span>
          <span className="tile__sub">
            {m.overdueCount != null ? `${count(m.overdueCount)} · ${plain(m.overdueTotal ?? 0)}` : NA}
          </span>
        </div>
        {m.overdueList.length === 0 ? (
          <span className="tile__sub">Nothing overdue</span>
        ) : (
          <div className="quotes">
            {m.overdueList.map((o) => (
              <div className="quote inv__row" key={o.number}>
                <span className="quote__label inv__who">
                  <span className="inv__name">{o.name ?? "Invoice"}</span>
                  <span className="inv__num">{o.number}</span>
                </span>
                <span className={`inv__age ${o.days > 30 ? "is-bad" : o.days > 14 ? "is-warn" : ""}`}>{o.days} days</span>
                <span className="quote__value">{plain(o.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tile inv__age-panel">
        <div className="tile__head">
          <span className="tile__title">Owed to us · by age</span>
        </div>
        {!aging ? (
          <span className="tile__sub">{NA}</span>
        ) : (
          <div className="inv__bars">
            {AR_BANDS.map((b) => ({ k: b.label, v: aging[b.key], cls: BAND_CLASS[b.key] })).map((r) => (
              <span className="inv__bar" key={r.k}>
                <span className="inv__barlabel">{r.k}</span>
                <span className="inv__track">
                  <span className={`inv__fill ${r.cls}`} style={{ width: `${(bar(r.v) * 100).toFixed(1)}%` }} />
                </span>
                <b className={`inv__barval ${r.cls}`}>{plain(r.v)}</b>
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * A Xero figure: blank when Xero has never answered, rather than $0.
 *
 * Not gated on the ServiceTitan light — Xero is its own source with its own dot
 * in the footer, and a ServiceTitan outage says nothing about what we are owed.
 */
const xeroFig = (n: number | null | undefined) => (n == null ? NA : plain(n));

/**
 * How long a job has been waiting — "Today", "Yesterday", "96 days".
 *
 * The To bill list showed a weekday and a time, which is right for work finished
 * in the last
 * few days and actively wrong beyond that: it renders a job completed on 2 July
 * as "Thu 9:33 am", which reads as last Thursday. Now the list runs oldest
 * first over the whole year, the days waited *is* the fact being presented —
 * the same unit the overdue list beside it uses.
 */
function waitedFor(iso: string): string {
  const day = (d: Date) => Date.parse(d.toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" }));
  const days = Math.max(0, Math.round((day(new Date()) - day(new Date(iso))) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days`;
}

/**
 * Options per job, to one decimal unless it lands square.
 *
 * "3 each" when it is exactly three, "3.2 each" when it is not — a flat "3"
 * for 3.2 overstates a number the room is being asked to act on, and "3.0"
 * for three is arithmetic showing through.
 */
function avgOptions(options: number, jobs: number): string {
  const a = options / jobs;
  return Number.isInteger(a) ? String(a) : a.toFixed(1);
}



function QuotesPage({ m, live }: { m: Metrics; live: Live }) {
  if (!live.st) return <NotConnected what="quotes written, still out, or closed" />;

  // The same two measures as the Today page's money row, and said the same way:
  // what the day asks for, not a verdict on a fraction of it. See askedOfToday.
  // `sold` in `standing` counts jobs, so its money target comes off the day
  // plan's value rather than that step's need.
  const today = m.pace?.standing.today;
  const soldTarget = m.pace?.day.sold.value ?? null;

  return (
    <>
      <div className="tile tile--head" style={{ gridColumn: "1 / span 4", gridRow: 1 }}>
        <span className="tile__labelrow">
          <span className="tile__label">Quoted today</span>
        </span>
        <span className={vcls(plain(m.quotesCreatedTodayValue))}><Ticker id="Quoted today" text={plain(m.quotesCreatedTodayValue)} /></span>
        <GoalMarks marks={goalMarks(m, m.quotesCreatedTodayValue, m.pace?.day.quoted.value)} />
        {/* How many options each job was given, not just how many were written
            in total. The count on its own answers "how busy"; the average
            answers "how well" — three options a job is a quote, one is a price,
            and it is the first thing that slips on a flat-out day. */}
        <span className="tile__foot">
          {[
            quotingAskedOfToday(m),
            `${count(m.quotesCreatedTodayCount)} ${m.quotesCreatedTodayCount === 1 ? "job" : "jobs"}` +
              (m.quotesCreatedTodayCount > 0 && m.quotesCreatedTodayOptions > 0
                ? ` · ${avgOptions(m.quotesCreatedTodayOptions, m.quotesCreatedTodayCount)} options each`
                : ""),
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>

      <div className="tile tile--navy tile--head" style={{ gridColumn: "5 / span 4", gridRow: 1 }}>
        <span className="tile__labelrow">
          <span className="tile__label">Sold today</span>
        </span>
        <span className={vcls(plain(m.soldToday))}><Ticker id="Sold today" text={plain(m.soldToday)} /></span>
        <GoalMarks marks={goalMarks(m, m.soldToday, soldTarget)} />
        <span className="tile__foot">
          {footWithTarget(
            soldTarget,
            `${count(m.quotesCreatedTodaySold)} of ${count(m.quotesCreatedTodayCount)} jobs quoted today`,
          )}
        </span>
      </div>

      {/* The average option rather than a close rate: a rate off ten quotes is
          mostly noise, and the size of what is being written is the thing a
          slow day actually shows up in first. */}
      <div className="tile tile--head" style={{ gridColumn: "9 / span 4", gridRow: 1 }}>
        <span className="tile__label">Average option</span>
        <span className={vcls(plain(m.avgQuoteToday))}><Ticker id="Average option" text={plain(m.avgQuoteToday)} /></span>
        <span className="tile__foot">
          {m.avgQuoteMonth != null ? `${money(m.avgQuoteMonth)} this month` : "today"}
        </span>
      </div>

      <div className="tile" style={{ gridColumn: "1 / span 7", gridRow: "2 / span 2" }}>
        <div className="tile__head">
          <span className="tile__title">Written today</span>
          <span className="screen__feed tile__sub">
            <span className="screen__dot" aria-hidden />
            Newest first
          </span>
        </div>
        {m.quotesToday.length === 0 ? (
          <span className="tile__sub">No quotes written today yet</span>
        ) : (
          <div className="quotes">
            {m.quotesToday.map((qr) => (
              <div className="quote" key={qr.id}>
                <span className="quote__at">
                  {new Date(qr.at).toLocaleTimeString("en-AU", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Australia/Melbourne",
                  })}
                </span>
                <span className="quote__label">
                  {qr.label}
                  {/* ServiceTitan's own number, so a figure on the wall can be
                      looked up without hunting for it by customer and time. */}
                  {qr.jobNumber ? <span className="quote__job">#{qr.jobNumber}</span> : null}
                  {qr.who ? <span className="quote__who">{qr.who}</span> : null}
                </span>
                <span className="quote__value">
                  {plain(qr.value)}
                  {qr.options > 1 ? <span className="quote__basis">avg of {qr.options}</span> : null}
                </span>
                <span className={`quote__state ${qr.sold ? "status status--ahead" : "status status--quiet"}`}>
                  {qr.sold ? "Sold" : "Open"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tile" style={{ gridColumn: "8 / span 5", gridRow: "2 / span 2" }}>
        <div className="tile__head">
          <span className="tile__title">Still out</span>
          <span className="tile__sub">
            {count(m.estimatesOpenCount)} · {money(m.estimatesOpenValue)} · last {m.outstandingDays ?? 30} days
            {m.estimatesStaleCount > 0 && <> · {count(m.estimatesStaleCount)} older, to close off</>}
          </span>
        </div>
        {m.quotesOutstanding.length === 0 ? (
          <span className="tile__sub">Nothing outstanding</span>
        ) : (
          <div className="quotes">
            {m.quotesOutstanding.map((qr) => (
              <div className="quote quote--stack" key={qr.id}>
                <span className="quote__label">
                  {qr.label}
                  {qr.jobNumber ? <span className="quote__job">#{qr.jobNumber}</span> : null}
                </span>
                <span className="quote__value">{plain(qr.value)}</span>
                <span className={`quote__age ${qr.ageDays >= 7 ? "quote__age--late" : ""}`}>
                  {qr.ageDays === 0
                    ? "Today"
                    : `${qr.ageDays} ${qr.ageDays === 1 ? "day" : "days"}${qr.ageDays >= 7 ? " · follow up" : ""}`}
                </span>
                {/* Good, better and best are one quote and at most one of them
                    sells, so the figure is the average of the options rather
                    than their sum. It says so: an unlabelled average of three
                    prices reads as a total and understates the top option. */}
                <span className="quote__basis">{qr.options > 1 ? `avg of ${qr.options}` : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Team: what each person sold, out of what they wrote.
 *
 * Sold is the headline and quoted is the line under it. It used to be the other
 * way round, on the grounds that too little closed work carried a seller for a
 * sold column to be anything but zeroes — but the bonus-tier bar beside it was
 * always measured on sold, so the page showed one figure big and ranked on
 * another. Attribution is thin rather than absent (a quarter of this month's
 * closed work names who closed it), so the honest fix is to lead with sold and
 * say on the page how much of the month it accounts for.
 *
 * The calls column has gone. It needs ServiceTitan's Telecom scope, which is
 * not granted, so it had shown a dash for every person since the day it was
 * added. See DASHBOARD.md.
 */
/**
 * Team: one card a person, each read against what the week and the month need.
 *
 * It was a table. A table is the right shape for comparing a column, and the
 * wrong one for the question this page is actually asked from across the room,
 * which is "who is behind". Every row looked the same until you read it.
 *
 * **The targets are an equal share of the team's.** Nothing anywhere holds a
 * per-person number — no setting, no column — so each person's week is the
 * team's week divided by the people on the board. That is an assumption, and
 * it is written on the card ("of $12.1K this week") rather than left implied,
 * because an equal share is not true of an apprentice and a lead hand and the
 * room should be able to see the denominator it is being judged against.
 */
/**
 * Today, in the Crew page's shape, with the year beside it (Jake, 15 Nov:
 * "unless we make it like the crew style but just track it daily vs over the
 * year").
 *
 * It replaced five gauge cards per tech. Those read well for one day and could
 * not be read against anything: a dial at 96% told the room nothing about
 * whether 96% was this man's normal. Every figure here carries the same figure
 * over the year underneath it, which is the comparison the page is for — and
 * it is the same arithmetic over a different window, from the same function,
 * so the two pages cannot mean different things by "in the time sold".
 *
 * Nothing is status-coloured, for the reason the Crew page isn't: no target is
 * set for any of it, and a green figure would be the board inventing one.
 */
function DailyPacePage({ m, live }: { m: Metrics; live: Live }) {
  const d = m.crewToday;
  const year = m.crew;
  if (!live.st || !d || d.techs.length === 0) {
    return (
      <div className="tile c12" style={{ gridRow: "1 / span 2" }}>
        <span className="tile__title">Nobody on the tools yet</span>
        <span className="tile__sub">
          {live.st ? "The first job of the day fills this page." : "Waiting on ServiceTitan."}
        </span>
      </div>
    );
  }
  const t = d.team;
  const y = year?.team ?? null;
  /** The year's figure per day worked, which is what a day can be read against. */
  const perDay = (total: number | undefined, days: number | undefined) =>
    total != null && days != null && days > 0 ? total / days : null;
  const dayLabel = (n: number | null) => (n != null ? `${hrs(n)} on a usual day` : "no year to compare");
  const yearTech = new Map((year?.techs ?? []).map((p) => [p.tech, p]));

  return (
    <>
      <HeadCard
        label="Time on the tools"
        value={hrs(t.hours)}
        foot={`${count(t.jobs)} jobs · ${t.timed.with} of ${t.timed.of} clocked${
          y ? ` · ${dayLabel(perDay(y.hours, y.daysWorked))}` : ""
        }`}
      />
      <HeadCard
        label="Not billable"
        value={t.idle.share != null ? hrs(t.idle.hours) : NA}
        // Short: at 2560x1440 a longer line wrapped out of the card. The van
        // count has to stay — "0h" off one van of four reads as nobody idle.
        foot={`${
          t.idle.share != null
            ? `${pct(t.idle.share)} of the day · ${t.idle.days} of ${t.daysWorked} vans`
            : "no van fully stamped yet"
        }${y?.idle.share != null ? ` · ${pct(y.idle.share)} this year` : ""}`}
      />
      {/* The day's driving added up, with the per-job average under it (Jake,
          16 Nov). The total is the figure a day is read by — four hours in the
          van is four hours — and the average is what makes two days of
          different length comparable, so both are here and the total leads. */}
      <HeadCard
        label="Drive time"
        value={hrs(t.drive.hours)}
        foot={`${
          t.drive.avgMins != null ? `${Math.round(t.drive.avgMins)} min a job` : "none recorded"
        } · ${t.drive.jobs} of ${t.drive.of} jobs${
          y?.drive.avgMins != null ? ` · ${Math.round(y.drive.avgMins)} min usually` : ""
        }`}
      />
      {/* Against the slot the office booked, not against the invoice: nothing
          is sold until after the day is over, so a day page built on sold
          hours is mostly empty on the day somebody reads it. Jake, 16 Nov. */}
      <HeadCard
        navy
        label="In the time allowed"
        value={t.allow.of > 0 ? `${t.allow.within} of ${t.allow.of}` : NA}
        foot={`${
          t.allow.of > 0
            ? `${hrs(t.allow.allowed)} booked · ${hrs(t.allow.taken)} used`
            : "no job today is booked by the hour"
        }${y?.inAllowedRate != null ? ` · ${pct(y.inAllowedRate)} usually` : ""}`}
      />

      <div className="tile c12" style={{ gridRow: 2 }}>
        <div className="tile__head">
          <span className="tile__title">Today</span>
          <span className="tile__sub">each figure against the same figure over the year · judged on the slot each job is booked for</span>
          <span className="crew__legend">
            {CREW_SECTORS.map((k) => (
              <span className="crew__key" key={k}>
                <i className={`mix--${k}`} aria-hidden="true" />
                {SECTOR_WORD[k]}
              </span>
            ))}
          </span>
        </div>
        {/* Seven columns, not the Crew page's eight: Billed came off. Nothing
            is invoiced until the office has been through the day, so the
            column read "$0 · nothing billed yet" on every row until late
            afternoon — a measurement of the office's paperwork wearing a
            tech's name. Jake, 16 Nov. */}
        <div className="crew crew--day">
          <div className="crew__head">
            <span>Tech</span>
            <span>Work</span>
            <span>On the tools</span>
            <span>Not billable</span>
            <span>Drive</span>
            <span>In the time allowed</span>
            <span>Work found on a visit</span>
          </div>
          {d.techs.map((p) => (
            <DayRow key={p.tech} p={p} year={yearTech.get(p.tech) ?? null} />
          ))}
        </div>
      </div>
    </>
  );
}

/** One tech's day, with their year under each figure. */
function DayRow({ p, year }: { p: TechKpi; year: TechKpi | null }) {
  const mix = CREW_SECTORS.filter((k) => p.mix[k] > 0);
  const usualDay = year && year.daysWorked > 0 ? year.hours / year.daysWorked : null;
  return (
    <div className="crew__row">
      <span className="crew__name">
        {p.tech}
        <em>
          {count(p.jobs)} {p.jobs === 1 ? "job" : "jobs"}
        </em>
      </span>

      <span className="crew__mix">
        <span className="crew__bar" aria-hidden="true">
          {mix.map((k) => (
            <span key={k} className={`crew__seg mix--${k}`} style={{ flexGrow: p.mix[k] }} />
          ))}
        </span>
        <span className="crew__mixnums">
          {mix.length > 0 ? mix.map((k) => `${p.mix[k]} ${SECTOR_SHORT[k]}`).join(" · ") : "nothing yet"}
        </span>
      </span>

      <span className="crew__fig">
        <b>{hrs(p.hours)}</b>
        <span>{usualDay != null ? `${hrs(usualDay)} on a usual day` : "no year to compare"}</span>
      </span>

      <span className="crew__fig">
        <b>{p.idle.share != null ? hrs(p.idle.hours) : NA}</b>
        <span>
          {p.idle.share != null ? `${pct(p.idle.share)} of the day` : "a job not stamped"}
          {year?.idle.share != null ? ` · ${pct(year.idle.share)} usually` : ""}
        </span>
      </span>

      {/* The day's driving added up, the average per job under it. */}
      <span className="crew__fig">
        <b>{hrs(p.drive.hours)}</b>
        <span>
          {p.drive.avgMins != null
            ? `${Math.round(p.drive.avgMins)} min a job`
            : `none of ${p.drive.of} recorded`}
          {year?.drive.avgMins != null ? ` · ${Math.round(year.drive.avgMins)} min usually` : ""}
        </span>
      </span>

      {/* The slot, not the invoice — see the head card above. */}
      <span className="crew__fig">
        <b>{p.allow.of > 0 ? `${p.allow.within} of ${p.allow.of}` : NA}</b>
        <span>
          {p.allow.of === 0
            ? "none booked by the hour"
            : `${hrs(p.allow.allowed)} booked · ${hrs(p.allow.taken)} used`}
        </span>
      </span>

      <span className="crew__fig">
        <b>
          {count(p.found.quoted)} {p.found.quoted === 1 ? "quote" : "quotes"}
        </b>
        <span>
          {p.found.visits > 0
            ? `off ${p.found.visits} service ${p.found.visits === 1 ? "call" : "calls"}`
            : "no service calls today"}
        </span>
      </span>
    </div>
  );
}


function TeamPage({ m, live }: { m: Metrics; live: Live }) {
  if (!live.st) return <NotConnected what="who has sold what" />;

  // Connected, but nothing sold has a seller on it. Saying "not connected" here
  // sent somebody to check the integration, which was fine.
  if (m.salesLeaderboard.length === 0) {
    return (
      <div className="tile c12 screen__notice">
        <span className="tile__sub tile__sub--body">
          No sales this month carry a seller yet. ServiceTitan records who sold a
          quote on the estimate, so the leaderboard fills as quotes are closed
          against a named employee.
        </span>
      </div>
    );
  }

  const people = m.salesLeaderboard;
  const heads = people.length;
  const share = (team: number | null | undefined) =>
    team != null && heads > 0 ? team / heads : null;

  const weekSoldTarget = share(m.pace?.week.sold.value);
  const monthSoldTarget = share(m.pace?.month.sold.value);
  const weekQuotedTarget = share(m.pace?.week.quoted.value);

  /*
   * By-now is the target times how much of the period has gone.
   *
   * It cannot come from `standing`, which is where the first version took it:
   * the `sold` step there is a count of jobs, and dividing a person's dollars
   * by a share of a job count put 529,611% on the wall. The steps that are
   * money (quotedValue, invoiced) and the steps that are jobs (sold, booked,
   * completed) share a shape and not a unit, which is exactly the trap.
   */
  const cal = m.paceData?.calendar;
  const gone = (p: { total: number; elapsed: number } | undefined) =>
    cal && p && p.total > 0 ? Math.min(1, (p.elapsed + (cal.todayWorking ? cal.dayFraction : 0)) / p.total) : null;
  const weekGone = gone(cal?.week);
  const monthGone = gone(cal?.month);
  const byNow = (target: number | null, progress: number | null) =>
    target != null && progress != null ? target * progress : null;

  const weekSoldByNow = byNow(weekSoldTarget, weekGone);
  const monthSoldByNow = byNow(monthSoldTarget, monthGone);
  const weekQuotedByNow = byNow(weekQuotedTarget, weekGone);

  /*
   * Ordered by the thing the band says, best first.
   *
   * The leaderboard arrives sorted by what has been quoted, which put the
   * biggest quoter at number 1 under a red BEHIND band — a rank and a verdict
   * disagreeing on the same card. The card's headline is the month against
   * target, so that is what the order has to be, and then the number beside
   * the name means what the band above it means.
   */
  const TEAM_CARDS = 6;
  const ranked = [...people]
    .sort((a, b) => (paceIndex(b.sold, monthSoldByNow) ?? -1) - (paceIndex(a.sold, monthSoldByNow) ?? -1))
    .slice(0, TEAM_CARDS);

  /*
   * The team's own row is read off the board's figures, not summed from the
   * cards above it.
   *
   * A sum of per-person rows is the same number by a longer route only while
   * every row is a clean slice of the whole, and these are not: seven jobs
   * this month were priced by two people, so they appear on two cards. Summed,
   * the team read $841,965 over 179 quotes where the Quotes page — the same
   * month, the same rule — said $818,896 over 175, and the close rate read
   * 50 of 222 against 47 of 209. Two numbers for one thing on a wall is worse
   * than either of them being slightly off.
   *
   * So the foot shows what the rest of the board shows and the cards stay the
   * per-person cut. They will not add up to it, and that is correct: a job two
   * people quoted is one quote and two people's work.
   */
  const teamSold = m.soldMtd;
  const teamQuoted = m.quotesCreatedMonthValue;
  /*
   * Two windows on this strip, and every ratio has to stay inside one of them.
   *
   * The money is month to date; the close rate is a rolling thirty days,
   * because a quote written on the 2nd has had a chance to close and one
   * written yesterday has not. Both are right. Dividing across them is not,
   * and the strip was doing it twice: the average quote was this month's
   * $841,965 over the last thirty days' 222 jobs, which read $3,793 for a
   * month that actually averaged $4,704, and the average ticket was the
   * month's sold money over a thirty-day win count.
   *
   * So the month's money divides by the month's counts, the close rate keeps
   * its own pair, and it now says which pair underneath itself — because the
   * figures sit side by side and the first thing anybody does is multiply one
   * by the other. $841,965 at 23% is $194K against $220,427 actually sold, and
   * the gap is not an error in either: the rate counts jobs rather than money,
   * and $59,782 of this month's sales came off quotes written before October.
   */
  const teamSoldJobs = m.soldCountMonth;
  const teamQuotes = m.quotesCreatedMonthCount;
  const teamWon30d = m.closeRate30dSold;
  const teamQuotedJobs = m.closeRate30dQuotes;
  const teamMonthTarget = m.pace?.month.sold.value ?? null;
  /*
   * Where the team as a whole stands, on the same scale as the cards above it.
   *
   * The team's by-now is the team's target times the month gone — not the sum
   * of the per-person by-nows, which is the same number by a longer route only
   * while every head is counted, and silently is not once the board shows the
   * top six of a larger team.
   */
  const teamByNow = byNow(teamMonthTarget, monthGone);
  const teamVerdict = headVerdictOf(teamSold, teamByNow);
  const sm = m.soldMargin ?? null;

  return (
    <>
      {ranked.map((r, i) => (
        <TeamCard
          key={r.name}
          rank={i + 1}
          r={r}
          weekQuoted={{ target: weekQuotedTarget, byNow: weekQuotedByNow }}
          weekSold={{ target: weekSoldTarget, byNow: weekSoldByNow }}
          monthSold={{ target: monthSoldTarget, byNow: monthSoldByNow }}
        />
      ))}

      <div className="tile tile--navy teamfoot">
        <span className="teamfoot__lead">
          <span className="teamfoot__label">Team</span>
          <b className="teamfoot__fig"><Ticker id="Team sold" text={plain(teamSold)} /> sold</b>
          <span className="teamfoot__of">
            {teamMonthTarget ? `of ${money(teamMonthTarget)} this month` : "this month"} ·{" "}
            {count(teamSoldJobs)} {teamSoldJobs === 1 ? "job" : "jobs"}
          </span>
          {/* The same verdict scale the cards above use, so "behind" on the
              foot and "behind" on a card mean the same distance. */}
          {teamVerdict ? (
            <span className={`teamfoot__verdict status status--${teamVerdict.verdict}`}>{teamVerdict.text}</span>
          ) : null}
        </span>
        <span className="teamfoot__stats">
          <span className="teamfoot__stat">
            <span className="teamfoot__k">Quoted · this month</span>
            <b>{plain(teamQuoted)}</b>
            <span className="teamfoot__sub">{count(teamQuotes)} quotes</span>
          </span>
          <span className="teamfoot__stat">
            <span className="teamfoot__k">Close rate</span>
            <b>{m.closeRate30d != null ? pct(m.closeRate30d) : NA}</b>
            {/* Jobs, not money, and over its own window — said out loud because
                the figure beside it is dollars and the two do not multiply. */}
            <span className="teamfoot__sub">
              {teamQuotedJobs > 0 ? `${count(teamWon30d)} of ${count(teamQuotedJobs)} jobs · 30 days` : ""}
            </span>
          </span>
          <span className="teamfoot__stat">
            <span className="teamfoot__k">Avg ticket</span>
            <b>{teamSoldJobs > 0 ? plain(teamSold / teamSoldJobs) : NA}</b>
            <span className="teamfoot__sub">{count(teamSoldJobs)} sold this month</span>
          </span>
          <span className="teamfoot__stat">
            <span className="teamfoot__k">Avg quote</span>
            <b>{m.avgQuoteMonth != null ? plain(m.avgQuoteMonth) : NA}</b>
          </span>
          {/*
            * What the month's sales were sold at, from the estimates themselves.
            *
            * Deliberately not the Job margin from the Performance page and
            * labelled so: that one is what finished work actually made, weeks
            * later, after labour. This is the margin the quote was written at,
            * known the day it closed. It will read higher, and the sub line says
            * which jobs it covers so the difference is never a mystery.
            */}
          <span className="teamfoot__stat">
            <span className="teamfoot__k">Margin · sold</span>
            <b>{sm?.marginPct != null ? `${Math.round(sm.marginPct)}%` : NA}</b>
            <span className="teamfoot__sub">{soldMarginNote(sm)}</span>
          </span>
        </span>
      </div>
    </>
  );
}

/**
 * What the sold margin covers, in the few words a wall can carry.
 *
 * Three things can be true at once and only the most important is said: that
 * some of the month's sales had no costed lines, and that VEU jobs are in there
 * without their rebate. A VEU job is sold cheap because the rebate pays the
 * rest, so counting it without the rebate drags the figure down for work that
 * is fine — that is the caveat worth the space, and it disappears the moment
 * somebody sets the rebate in the portal.
 */
function soldMarginNote(sm: Metrics["soldMargin"]): string {
  if (!sm || sm.marginPct == null) return "nothing costed yet";
  const jobs = `${sm.jobs} ${sm.jobs === 1 ? "job" : "jobs"}`;
  // Older snapshots predate veuUncounted; for them every VEU job was uncounted without a figure.
  const notCounted = sm.veuUncounted ?? (sm.rebatePerJob == null ? sm.veuJobs : 0);
  if (notCounted > 0) return `${jobs} · ${notCounted} VEU, rebate not counted`;
  if (sm.uncosted > 0) return `${jobs} · ${sm.uncosted} not costed`;
  return `${jobs} sold this month`;
}

type Against = { target: number | null; byNow: number | null };

/** One person: three measures, each against what their share should be by now. */
function TeamCard({
  rank,
  r,
  weekQuoted,
  weekSold,
  monthSold,
}: {
  rank: number;
  r: Metrics["salesLeaderboard"][number];
  weekQuoted: Against;
  weekSold: Against;
  monthSold: Against;
}) {
  // The card's own headline is the month, which is what a bonus and a review
  // are actually settled on; the two week rows say whether it is recoverable.
  const index = paceIndex(r.sold, monthSold.byNow);
  const verdict = verdictOf(index);

  return (
    <div className={`tile teamcard ${verdict ? `teamcard--${verdict}` : ""}`}>
      <span className={`teamcard__band ${verdict ? `is-${verdict}` : ""}`}>
        <b>{verdict ? ZONE_LABEL[verdict].toUpperCase() : "NO TARGET"}</b>
        <span>{index != null ? `${Math.round(index * 100)}%` : NA}</span>
      </span>

      <span className="teamcard__who">
        <span className="teamcard__rank">{rank}</span>
        <b>{r.name}</b>
      </span>

      <TeamRow id={`${r.name}/Quoted this week`} label="Quoted this week" value={r.quotedWeek} a={weekQuoted} unit="this week" extra={`${money(r.quoted)} this month`} />
      <TeamRow id={`${r.name}/Sold this week`} label="Sold this week" value={r.soldWeek} a={weekSold} unit="this week" extra={weekSold.byNow != null ? `by today ${plain(weekSold.byNow)}` : undefined} />
      <TeamRow id={`${r.name}/Sold this month`} label="Sold this month" value={r.sold} a={monthSold} unit="this month" extra={monthSold.byNow != null ? `by today ${plain(monthSold.byNow)}` : undefined} />

      <span className="teamcard__stats">
        <span className="teamcard__stat">
          <span className="teamcard__k">Quoted</span>
          <b>{plain(r.quoted)}</b>
          {/* The month's quotes, not the thirty-day job count that used to sit
              here: the figure above is this month's, and a count from a wider
              window under it made the two refuse to divide into the average
              quote two tiles along. */}
          <span className="teamcard__sub">{count(r.quotes)} quotes</span>
        </span>
        <span className="teamcard__stat">
          <span className="teamcard__k">Close rate</span>
          <b>{r.closeRate != null ? pct(r.closeRate) : NA}</b>
          <span className="teamcard__sub">{count(r.soldJobs)} won</span>
        </span>
        <span className="teamcard__stat">
          <span className="teamcard__k">Avg ticket</span>
          <b>{r.avgTicket != null ? plain(r.avgTicket) : NA}</b>
        </span>
        <span className="teamcard__stat">
          <span className="teamcard__k">Avg quote</span>
          <b>{r.avgQuote != null ? plain(r.avgQuote) : NA}</b>
          <span className="teamcard__sub">{r.avgOptions != null ? `${r.avgOptions.toFixed(1)} options` : ""}</span>
        </span>
        {/* Which window the three columns to the right of Quoted run on.
            The money is this month and they are a rolling thirty days, because
            a quote written on the 2nd has had a chance to close and one written
            yesterday has not. Both are right and they do not divide into each
            other, which is a trap worth one line rather than three labels. */}
        <span className="teamcard__window">Close rate &amp; averages &middot; last 30 days</span>
      </span>
    </div>
  );
}

/** One measure on a person's card: the figure, the dial, and what it is of. */
function TeamRow({
  id,
  label,
  value,
  a,
  unit,
  extra,
}: {
  /** Person and row, so each card's figures are remembered as that person's. */
  id: string;
  label: string;
  value: number;
  a: Against;
  unit: string;
  extra?: string;
}) {
  const index = paceIndex(value, a.byNow);
  const verdict = verdictOf(index);
  return (
    <span className="teamrow">
      <span className="teamrow__label">{label}</span>
      <span className="teamrow__body">
        <MiniDial index={index} verdict={verdict} />
        <span className="teamrow__text">
          <b className="teamrow__fig"><Ticker id={id} text={plain(value)} /></b>
          <span className={`status status--${verdict ?? "quiet"} teamrow__status`}>{verdictText(index, verdict)}</span>
          <span className="teamrow__of">{a.target != null ? `of ${money(a.target)} ${unit}` : `no ${unit} target`}</span>
          {extra ? <span className="teamrow__of">{extra}</span> : null}
        </span>
      </span>
    </span>
  );
}

/**
 * How far along the run to the next tier somebody is, as one bar.
 *
 * Three segments before, which read as three separate things to fill rather
 * than one run with milestones on it — and the middle one was drawn 45% full
 * whatever the actual figure, which is a bar that means nothing.
 */
function tierProgress(r: Metrics["salesLeaderboard"][number]): number {
  // Nothing left to reach means the run is done. The caller only draws a bar
  // at all when tiers exist, so this is genuinely "at the top".
  if (r.toNextTier == null || r.toNextTier <= 0) return 100;
  const next = r.sold + r.toNextTier;
  return next > 0 ? Math.max(2, Math.min(100, (r.sold / next) * 100)) : 0;
}


/* ------------------------------------------------------------- /05 Job types */
/**
 * Job types: the row underneath Sectors.
 *
 * Sectors answers the four kinds of work. This answers the question Jake asked
 * next (16 Nov): "if it is an install what type and if it a maintenance is a
 * split or a ducted ect" — because "installs take 3.8 hours" has averaged a
 * four-hour split system with a twenty-hour ducted job and said nothing about
 * either.
 *
 * It replaced the Performance page, which had become three things that live
 * better elsewhere: jobs booked is the Today page's own figure, time on the
 * tools is the Crew page's, and the month's invoiced and paid totals are on
 * Today and Pace. What was left was a job-type table ranked by a month of
 * invoices, with a margin column off `st_invoices.cost` that has never once
 * been populated.
 *
 * **Booked for** is the slot ServiceTitan books the type into — the width of
 * the block on the dispatch board. **Takes** is time on site: first arrival to
 * last done, over everyone who went. Not man-hours: the slot is the same four
 * hours whether one turns up or two, so man-hours would read every two-man job
 * as twice over. See the note on CrewVisit in crewTypes.ts.
 */

/**
 * The four sectors, each with its own job types under it, and what each kind of
 * work turns into (Jake, 16 Nov): "service then a list below of all of the job
 * types, so service split — how many we have done, how much we bill and how
 * much work that turn into... like how many problem turn into a repair, install
 * or just a problem".
 *
 * So the page is five columns rather than one ranked table. A ranked table put
 * Service - Split System next to Installation - Ducted Refrigerated and invited
 * the room to read one against the other; grouped, every row's neighbours are
 * the rows it is actually comparable to.
 *
 * The columns run the long way across the panel rather than two by two (Jake,
 * 16 Nov). Each is narrow, so a row stacks instead of spreading: the name and
 * the count on top, then the money, then the slot, then what it turned into.
 * Two by two gave wider rows but put Repairs below the fold on a 768-high
 * panel, and the eye had to travel back up the page to compare two sectors.
 */
const PANEL_SECTORS: Array<[CrewSector, string]> = [
  ["maintenance", "Service"],
  ["breakdown", "Breakdowns"],
  ["install", "Installs"],
  ["repair", "Repairs"],
  /*
   * The fifth panel, added once the figures argued for it (Jake, 16 Nov).
   * ServiceTitan's job types put quote visits, warranty calls, site
   * assessments and return visits in none of the four sectors, so they were
   * counted in the head cards and named there — until the live snapshot showed
   * those 78 visits led to 13 installs worth $90K, which is more follow-on
   * money than breakdowns and service put together. The biggest source of work
   * on the page is not something to leave off it.
   *
   * Named for what is mostly in it and honest about the rest: 60 of the 78 are
   * quote visits, and the panel's own rows show what the others are.
   */
  ["other", "Quotes & other"],
];

/**
 * Types with a row of their own in a column, before the tail is folded into
 * one. Six since the head cards came off and the columns took the whole tile:
 * at four, the install column was folding Installation - Evaporative Cooler
 * and Installation - Split Heat Pump into "12 other kinds".
 */
const TYPES_PER_SECTOR = 6;

/**
 * The job type without the sector already written above it: "Service - Split
 * System" under a panel headed Service is three words of which two are noise,
 * and the noise is the two the eye reads first.
 */
function shortType(name: string): string {
  const cut = name.replace(
    /^(service|diagnostics|installation|repair|quotation|commercial\s*[–-]\s*\w+)\s*[–-]\s*/i,
    "",
  );
  return cut.trim() || name;
}

/**
 * The time half of a row's one muted line: what it takes against what it is
 * booked for, or why neither can be said.
 *
 * "— of 1h · none clocked" was two ways of saying the same absence, so a type
 * nobody has clocked leads with the slot instead.
 */
function slotLine(t: JobTypeKpi, folded?: boolean): string {
  if (t.allowed == null) return folded ? "several slots" : unjudged(t);
  if (t.avgTaken == null) return `booked for ${hrs(t.allowed)} · none clocked`;
  return `${hrs(t.avgTaken)} of ${hrs(t.allowed)}`;
}

/** Why a type carries no verdict, in the words that say which problem it is. */
function unjudged(t: JobTypeKpi): string {
  if (t.timed === 0) return "none clocked";
  if (t.allowed == null) return "no slot set";
  if (t.allowed > LONGEST_ALLOWED_HOURS) return "booked across days";
  return `${MIN_TYPE_TIMED} to rate`;
}

function JobTypesPage({ m, live }: { m: Metrics; live: Live }) {
  const c = m.crew;
  const all = c?.jobTypes ?? [];
  if (!live.st || all.length === 0) {
    return (
      <div className="tile c12" style={{ gridRow: "1 / span 2" }}>
        <span className="tile__title">Every kind of work</span>
        <span className="tile__sub">
          {!live.st
            ? "ServiceTitan isn’t connected."
            : c
              ? "No job in the window has anybody timesheeted against it."
              : "Worked out on the next sync."}
        </span>
      </div>
    );
  }

  const total = rollUpTypes(all, "All work");
  const panels = PANEL_SECTORS.map(([key, label]) => {
    const rows = all.filter((t) => t.sector === key);
    const head = rollUpTypes(rows, label, key);
    const shown = rows.slice(0, TYPES_PER_SECTOR);
    const tail = rows.slice(TYPES_PER_SECTOR);
    return {
      key,
      label,
      head,
      shown,
      // Folded rather than dropped: the tail of a sector is a dozen job types
      // with a handful of jobs each, and a panel that leaves them out is a
      // panel whose rows do not add up to its own heading.
      rest: tail.length > 0 ? rollUpTypes(tail, `${tail.length} other kinds`, key) : null,
    };
  });
  const ledJobs = total.led.install + total.led.repair;

  /*
   * No head cards: the five columns get the whole tile (Jake, 16 Nov).
   *
   * Every figure the cards carried is already in the page — each column heads
   * with its own jobs, money and share turned into work — so four cards of
   * totals were buying a fifth of the height to repeat the sum of what was
   * underneath them. The page totals go on one line in the tile's head
   * instead, which is where the room went: four job types a column became six,
   * and the install column stopped folding its fifth-biggest type away.
   *
   * It is the one page on the board with no navy card. Nothing here is
   * measured against a target anybody set, so the navy was carrying emphasis
   * rather than meaning, and what the room actually compares is the five
   * sector headings against each other.
   */
  return (
    <>
      <div className="tile c12" style={{ gridRow: "1 / span 2" }}>
        <div className="tile__head">
          <span className="tile__title">Each kind of work</span>
          {/* What the four head cards used to say, on one line. */}
          <span className="tile__sub">
            {`${count(total.jobs)} jobs · ${compact(total.billed)} · ${count(ledJobs)} turned into work`}
            {total.rate != null ? ` · ${pct(total.rate)} in the time allowed` : ""}
          </span>
          <span className="crew__legend">
            {/* The rule, in front of the three keys it qualifies — it was the
                page subtitle until the subtitle ran past the panel edge at
                1920, and it belongs next to the bar it describes anyway. */}
            <span className="crew__key">within {c?.followDays ?? 60} days:</span>
            <span className="crew__key">
              <i className="mix--install" aria-hidden="true" />
              led to an install
            </span>
            <span className="crew__key">
              <i className="mix--repair" aria-hidden="true" />
              led to a repair
            </span>
            <span className="crew__key">
              <i className="jtp__none" aria-hidden="true" />
              just the job
            </span>
          </span>
        </div>
        <div className="jtp">
          {panels.map(({ key, ...p }) => (
            <SectorPanel key={key} {...p} />
          ))}
        </div>
      </div>
    </>
  );
}

function SectorPanel({
  label,
  head,
  shown,
  rest,
}: {
  label: string;
  head: JobTypeKpi;
  shown: JobTypeKpi[];
  rest: JobTypeKpi | null;
}) {
  const led = head.led.install + head.led.repair;
  return (
    <div className="jtp__sec">
      <div className="jtp__head">
        <span className="jtp__name">{label}</span>
        <span className="jtp__tot">
          {count(head.jobs)} jobs · {compact(head.billed)}
        </span>
        {/* The sector's own answer to the page's question, on its own line so
            it is the second thing read in the column rather than the fourth. */}
        <span className="jtp__led1">
          {head.jobs > 0 ? `${pct(led / head.jobs)} turned into work` : "nothing yet"}
        </span>
        {/* And how often this sector comes in on its slot. It was a fourth line
            on every row — "36 of 42 on it" — which is a column of denominators
            nobody reads across. Once per sector is where it belongs; the row
            still shows its own "1.1h of 1.5h", which says over or under at a
            glance without arithmetic. */}
        <span className="jtp__tot">
          {head.rate != null
            ? `${pct(head.rate)} in the time allowed`
            : head.inTime.of > 0
              ? `${count(head.inTime.within)} of ${count(head.inTime.of)} in the time allowed`
              : "none booked by the hour"}
        </span>
      </div>
      {head.jobs === 0 ? (
        <span className="jtp__empty">Nothing of this kind in the window.</span>
      ) : (
        <div className="jtp__rows">
          {shown.map((t) => (
            <TypeRow key={t.type} t={t} />
          ))}
          {rest && <TypeRow t={rest} folded />}
        </div>
      )}
    </div>
  );
}

/** One job type inside its sector's panel, or the folded tail of them. */
function TypeRow({ t, folded }: { t: JobTypeKpi; folded?: boolean }) {
  const led = t.led.install + t.led.repair;
  return (
    <div className="jtp__row">
      <span className="jtp__top">
        <span className="jtp__type">{folded ? t.type : shortType(t.type)}</span>
        <b className="jtp__jobs">{count(t.jobs)}</b>
      </span>

      {/* Money and time on one line. They were two, and four lines of muted
          grey under every name is what made a column hard to read from across
          the room. */}
      <span className="jtp__meta">
        {t.avgBilled != null ? `${compact(t.billed)} · ${money(t.avgBilled)} each` : "nothing billed"}
        {` · ${slotLine(t, folded)}`}
      </span>

      {/* Three segments that add to the row, so the bar is a whole bar. The
          words are under it: these are three shades and nobody reads a shade
          from four metres. */}
      <span className="jtp__bar" aria-hidden="true">
        <span className="mix--install" style={{ flexGrow: t.led.install }} />
        <span className="mix--repair" style={{ flexGrow: t.led.repair }} />
        <span className="jtp__none" style={{ flexGrow: t.led.none }} />
      </span>
      <span className="jtp__ledwords">
        {led === 0
          ? "just the job"
          : [
              t.led.install > 0 ? `${t.led.install} install` : null,
              t.led.repair > 0 ? `${t.led.repair} repair` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
        {t.led.billed > 0 ? ` · ${compact(t.led.billed)}` : ""}
      </span>
    </div>
  );
}

/**
 * Where the work actually is, on the corridor.
 *
 * This was a grid of tiles, then blobs on a blank rectangle, and neither was a
 * map: the first ranked suburbs without saying where they are, and the second
 * put them in the right relative positions with nothing underneath to read
 * them against. Real tiles now, from `BoardSuburbMap`.
 *
 * A suburb with no coordinate on file is named under the map rather than
 * dropped, because its jobs happened whether or not we know where.
 */
/* ── Weather ──────────────────────────────────────────────────────────────
 *
 * The week across the top, and under each day the work booked into it.
 *
 * It was two pages — one for the forecast and one for the diary read against
 * it — and Jake merged them (19 Nov): "have the weather across the top for 7
 * days and then a list going down, and then the jobs on those days with the
 * job number and the title and if it's good or not."
 *
 * He is right that they were one page. Reading "Monday: off the roof" on one
 * screen and "Monday 7am, evap install, Narre Warren" thirty seconds later on
 * another asks the room to hold a week of weather in its head and join it up.
 * A column per day does the joining.
 *
 * The hour-by-hour strip for today came off when they merged and went back on
 * an hour later: with one tile the seven columns filled barely half the wall
 * in a quiet November week, and half an empty page reads as something having
 * failed to load. It also answers the question Jake asked first — "what time
 * and how hot is it going to be" — which the day columns only half carry.
 *
 * The arithmetic is all in weatherTypes.ts and weatherJobsTypes.ts, where
 * check:weather and check:weatherjobs can get at it.
 */

/**
 * What the sky is doing, drawn rather than fetched.
 *
 * Inline SVG and not MET's own icon set: the set is a hundred PNGs for the
 * eleven shapes a wall board can tell apart at four metres, and this page
 * already carries its meaning in words and figures — the icon is there to be
 * recognised in a glance, not read. `currentColor` throughout, so it inherits
 * the column's ink and needs nothing from the dark theme.
 */
function SkyIcon({ sky }: { sky: WxSky | null | undefined }) {
  if (!sky) return null;
  const sun = <circle cx="8" cy="8" r="4.1" />;
  const cloud = <path d="M6.4 18.5h9.8a3.4 3.4 0 0 0 .35-6.78 5 5 0 0 0-9.6-.9 3.35 3.35 0 0 0-.55 7.68Z" />;
  const drops = (n: number) => (
    <g>
      {[0, 1, 2].slice(0, n).map((i) => (
        <line key={i} x1={7.2 + i * 3.6} y1="19.6" x2={6.1 + i * 3.6} y2="22.6" />
      ))}
    </g>
  );
  const body = {
    clear: <g className="sky--sun">{sun}<g className="sky__rays"><line x1="8" y1="1" x2="8" y2="2.6" /><line x1="8" y1="13.4" x2="8" y2="15" /><line x1="1" y1="8" x2="2.6" y2="8" /><line x1="13.4" y1="8" x2="15" y2="8" /><line x1="3" y1="3" x2="4.2" y2="4.2" /><line x1="11.8" y1="11.8" x2="13" y2="13" /><line x1="13" y1="3" x2="11.8" y2="4.2" /><line x1="4.2" y1="11.8" x2="3" y2="13" /></g></g>,
    fair: <g><g className="sky--sun">{sun}</g><g className="sky--cloud">{cloud}</g></g>,
    partly: <g><g className="sky--sun">{sun}</g><g className="sky--cloud">{cloud}</g></g>,
    cloudy: <g className="sky--cloud">{cloud}</g>,
    fog: <g className="sky--cloud">{cloud}<line x1="4" y1="21" x2="18" y2="21" /><line x1="6" y1="23.4" x2="16" y2="23.4" /></g>,
    lightrain: <g><g className="sky--cloud">{cloud}</g><g className="sky--rain">{drops(1)}</g></g>,
    rain: <g><g className="sky--cloud">{cloud}</g><g className="sky--rain">{drops(2)}</g></g>,
    heavyrain: <g><g className="sky--cloud">{cloud}</g><g className="sky--rain">{drops(3)}</g></g>,
    thunder: <g><g className="sky--cloud">{cloud}</g><g className="sky--bolt"><path d="M12.4 18.8 9.2 23.4h2.6l-1 3.4 3.6-5h-2.6l1-2Z" /></g></g>,
    sleet: <g><g className="sky--cloud">{cloud}</g><g className="sky--rain">{drops(2)}</g></g>,
    snow: <g><g className="sky--cloud">{cloud}</g><g className="sky--rain"><line x1="7" y1="20" x2="7" y2="23" /><line x1="11" y1="20" x2="11" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /></g></g>,
  }[sky];
  return (
    <svg className="sky" viewBox="0 0 24 27" aria-hidden="true" focusable="false">
      {body}
    </svg>
  );
}

/** Status to the ink it is written in. Never the colour alone — the word leads. */
const JOB_INK: Record<JobStatus, string> = { go: "wx--good", watch: "wx--poor", risk: "wx--no" };

/**
 * How many jobs a day's column shows before it folds the rest into a line.
 *
 * Three. Four was measured against a fabricated January week — six evap jobs
 * a day, every day — and overflowed the tile at every size the board runs at,
 * by 68 pixels at 1920 and 284 at 4K. November's nine real bookings would
 * never have shown it; the first hot week would have, on the wall.
 */
const JOBS_PER_DAY = 3;

/**
 * How many hours the strip draws.
 *
 * Jake, 19 November: "the hour by hour should show the weather for the day 7-4
 * each hour, and once the time has passed either move it out and then show 8-5
 * etc, or make it gray."
 *
 * Rolling, which is the first of the two he offered, because the forecast only
 * carries hours still to come — there is no eight o'clock left to grey out at
 * ten. So the window is ten hours from the working day's start, and it walks
 * forward through the morning: 7–4, then 8–5, then 9–6.
 */
const STRIP_HOURS = 10;

/** "Thu 20". The day, as somebody standing in front of the wall would say it. */
function wxDayName(iso: string, today: boolean): string {
  if (today) return "Today";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]} ${d.getDate()}`;
}

/** The job type without the "Installation - " already said by the line under it. */
function jobKind(type: string): string {
  return type.replace(/^(installation|service|repair|diagnostics|removal)\s*[–-]\s*/i, "").trim() || type;
}

/** "Install", "Service" — what is being done, which decides half the verdicts. */
function jobDoing(type: string): string {
  const m = /^(installation|service|repair|diagnostics|removal)/i.exec(type);
  if (!m) return "Job";
  const w = m[1].toLowerCase();
  return w === "installation" ? "Install" : w === "diagnostics" ? "Diagnose" : w[0].toUpperCase() + w.slice(1);
}

/** "8am", "noon" — a booked start as somebody would say it. */
function startAt(hour: number): string {
  if (hour === 12) return "noon";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? "am" : "pm"}`;
}

function WeatherPage({ m, live }: { m: Metrics; live: Live }) {
  const all = m.weather;
  /*
   * Only the days still ahead, and at most a week of them. The reader keeps
   * nine so a job booked eight days out can still be judged; seven is what
   * stays readable as columns from across the room.
   */
  const w = all ? { ...all, days: all.days.filter((d) => d.date >= all.today).slice(0, 7) } : null;

  if (!w || w.days.length === 0) {
    return (
      <div className="tile c12" style={{ gridRow: "1 / span 2" }}>
        <span className="tile__title">No forecast</span>
        <span className="tile__sub">
          {all
            ? "The forecast on file has run out. The board will have a new one on the next sync."
            : "The weather service didn’t answer. The board will have it back on the next sync."}
        </span>
      </div>
    );
  }

  // Every booked job the weather bears on, judged, and filed under its day.
  const calls = live.st && m.bookedWork ? callsForJobs(m.bookedWork, all!) : [];
  const t = tally(calls);
  const byDay = new Map<string, JobCall[]>();
  for (const c of calls) byDay.set(c.date, [...(byDay.get(c.date) ?? []), c]);
  for (const list of byDay.values()) list.sort((a, b) => a.hour - b.hour);
  const flagged = calls.filter((c) => c.status !== "go");

  /*
   * Whose hours the strip shows. Today's until its working day is nearly
   * spent, and tomorrow's after that: at half past three, ten columns of
   * evening is a worse answer to "what time and how hot" than tomorrow
   * morning is.
   */
  const workLeft = (d: WxDay) => d.hours.filter((h) => h.hour >= WORK_FROM_HOUR && h.hour <= WORK_TO_HOUR).length;
  const stripDay = workLeft(w.days[0]) >= 3 || w.days.length === 1 ? w.days[0] : w.days[1];
  const first = stripDay.hours.length > 0 ? stripDay.hours[0].hour : WORK_FROM_HOUR;
  const from = Math.max(WORK_FROM_HOUR, first);
  const strip = stripDay.hours.filter((h) => h.hour >= from && h.hour < from + STRIP_HOURS);
  /*
   * One scale for the whole strip, from the coldest air an evap could make to
   * the hottest the day gets. Shared rather than per-hour, because the bars
   * are compared with each other: the length of each is the cooling there is
   * to be had in that hour, and lengths mean nothing without a common ruler.
   */
  const floor = Math.min(...strip.map((h) => deliveredC(h.tempC, h.humidity)), stripDay.minC) - 3;
  const ceiling = Math.max(...strip.map((h) => h.tempC), stripDay.maxC) + 1;

  return (
    <>
    <div className="tile c12" style={{ gridRow: 1 }}>
      <div className="tile__head">
        <span className="tile__title">The week, and the work booked into it</span>
        {/* The totals on one line, where four head cards used to be: the seven
            columns want the height more than a row of sums does. */}
        <span className="tile__sub">
          {w.now ? `${degrees(w.now.tempC)} now · ${Math.round(w.now.humidity)}% humidity · ` : ""}
          {calls.length > 0
            ? `${count(calls.length)} jobs the weather bears on · ${count(t.go)} good to go${
                t.watch > 0 ? ` · ${count(t.watch)} to watch` : ""
              }${t.risk > 0 ? ` · ${count(t.risk)} at risk` : ""}`
            : "nothing booked that the weather touches"}
          {flagged.length > 0 ? ` · soonest: #${flagged[0].number} ${wxDayName(flagged[0].date, flagged[0].date === w.today)}` : ""}
        </span>
        <span className="crew__legend">
          <span className="crew__key"><i className="wxdot wx--no" aria-hidden="true" />at risk</span>
          <span className="crew__key"><i className="wxdot wx--poor" aria-hidden="true" />watch</span>
          <span className="crew__key"><i className="wxdot wx--good" aria-hidden="true" />good</span>
          <span className="wx__credit">{w.credit}</span>
        </span>
      </div>
      <div className="wxw" style={{ "--wx-n": w.days.length } as CSSProperties}>
        {w.days.map((d) => (
          <WxDayCol key={d.date} d={d} today={d.date === w.today} jobs={byDay.get(d.date) ?? []} />
        ))}
      </div>
    </div>

    <div className="tile c12" style={{ gridRow: 2 }}>
      <div className="tile__head">
        <span className="tile__title">
          {stripDay.date === w.today ? "Today, hour by hour" : `${wxDayName(stripDay.date, false)}, hour by hour`}
        </span>
        {/* The bar carries two readings, so the subtitle names both. */}
        <span className="tile__sub">
          {`bar height is the heat · the solid top is the cooling an evap would get · ${clock(WORK_FROM_HOUR)}–${clock(WORK_TO_HOUR)} is the working day`}
        </span>
      </div>
      {strip.length === 0 ? (
        <span className="wxw__none">No hours left in today. The week above starts with tomorrow.</span>
      ) : (
        <div className="wxs">
          {strip.map((h) => (
            <WxHourCell key={h.hour} h={h} lo={floor} hi={ceiling} judged={judgedHour(stripDay)?.hour === h.hour} />
          ))}
        </div>
      )}
    </div>
    </>
  );
}

/**
 * One hour of today: how hot it gets, how much of that an evap could take off,
 * and any rain.
 *
 * One bar carrying two readings, which took three goes. Height alone was
 * decorative — every column prints its own temperature twice. Drawing only the
 * gap between the two temperatures was honest and unreadable: on a humid day
 * every bar is a stub in an empty track, which looks like a page that failed
 * to load rather than a day with no cooling in it.
 *
 * So the bar's height is the hour's heat, and the solid cap on it is the
 * cooling an evap would get out of that hour. A tall bar with a sliver on top
 * is a hot day an evap can do nothing with; one that is mostly solid is the
 * day to book the handovers.
 */
function WxHourCell({ h, lo, hi, judged }: { h: WxHour; lo: number; hi: number; judged: boolean }) {
  const out = deliveredC(h.tempC, h.humidity);
  const span = hi - lo;
  const at = (t: number) => (span > 0 ? Math.max(0, Math.min(100, ((t - lo) / span) * 100)) : 50);
  const top = at(h.tempC);
  const cool = at(out);
  const working = h.hour >= WORK_FROM_HOUR && h.hour <= WORK_TO_HOUR;
  return (
    <div className={`wxs__h${working ? " is-work" : ""}${judged ? " is-judged" : ""}`}>
      <b className="wxs__t">{degrees(h.tempC)}</b>
      <SkyIcon sky={h.sky} />
      <span className="wxs__bar" aria-hidden="true">
        <i className="wxs__air" style={{ height: `${top}%` }} />
        {/* A floor on the cap, so an hour with no cooling is a visible line
            rather than nothing — an absent segment reads as missing data. */}
        <i className="wxs__cool" style={{ bottom: `${cool}%`, height: `${Math.max(1.5, top - cool)}%` }} />
      </span>
      <span className="wxs__out">{degrees(out)}</span>
      <span className="wxs__rain">{h.rainMm >= 0.1 ? mm(h.rainMm) : ""}</span>
      <span className="wxs__hr">{clock(h.hour)}</span>
    </div>
  );
}

/** One day: what it is like, then what is booked into it. */
function WxDayCol({ d, today, jobs }: { d: WxDay; today: boolean; jobs: JobCall[] }) {
  const head = headlineCall(d);
  /*
   * What gets folded away is the good news, never a problem.
   *
   * Taking the first three by time would hide a two o'clock job that is at
   * risk behind three morning ones that are fine — which is the page failing
   * at the one thing it is for. So the day is ranked worst-first to decide
   * what shows, and the survivors are put back in time order to be read.
   */
  const rank: Record<JobStatus, number> = { risk: 0, watch: 1, go: 2 };
  const byTrouble = [...jobs].sort((a, b) => rank[a.status] - rank[b.status] || a.hour - b.hour);
  const shown = byTrouble.slice(0, JOBS_PER_DAY).sort((a, b) => a.hour - b.hour);
  const hidden = byTrouble.slice(JOBS_PER_DAY);
  const rest = hidden.length;
  const allHiddenFine = hidden.every((h) => h.status === "go");
  return (
    <div className={`wxw__d${today ? " is-today" : ""}`}>
      <span className="wxw__name">{wxDayName(d.date, today)}</span>
      <span className="wxw__row">
        <span className="wxw__temp">
          {degrees(d.minC)}–{degrees(d.maxC)}
        </span>
        <SkyIcon sky={d.sky} />
      </span>
      <span className="wxw__rain">
        {d.rainMm > 0 ? mm(d.rainMm) : "dry"}
        {d.rainFrom != null ? ` · from ${clock(d.rainFrom)}` : d.peakAt != null ? ` · peak ${clock(d.peakAt)}` : ""}
      </span>
      <span className={`wxw__head wx--${head.rating}`}>{head.word}</span>
      <span className="wxw__why">{head.why}</span>

      {/* And the diary for that day, under the weather that decides it. */}
      <span className="wxw__jobs">
        {jobs.length === 0 ? (
          <span className="wxw__none">nothing booked that this touches</span>
        ) : (
          <>
            {shown.map((c) => (
              <span className={`wxj2 is-${c.status}`} key={c.jobId}>
                <span className="wxj2__top">
                  <b className="wxj2__num">#{c.number}</b>
                  <span className="wxj2__at">{startAt(c.hour)}</span>
                </span>
                <span className="wxj2__what">{jobKind(c.type)}</span>
                <span className="wxj2__doing">
                  {jobDoing(c.type)}
                  {c.suburb ? ` · ${c.suburb}` : ""}
                </span>
                <span className={`wxj2__word ${JOB_INK[c.status]}`}>
                  <i className={`wxdot ${JOB_INK[c.status]}`} aria-hidden="true" />
                  {c.word}
                </span>
              </span>
            ))}
            {rest > 0 && (
              <span className="wxw__none">{`and ${rest} more${allHiddenFine ? ", all good to go" : ""}`}</span>
            )}
          </>
        )}
      </span>
    </div>
  );
}

function SuburbHeat({ places }: { places: Metrics["topJobSuburbs"] }) {
  const located = places.map((p) => ({ ...p, at: suburbCoords[slugForSuburb(p.suburb)] }));
  const pts = located
    .filter((p): p is typeof p & { at: readonly [number, number] } => !!p.at)
    .map((p) => ({ suburb: p.suburb, count: p.count, lat: p.at[0], lng: p.at[1] }));
  const offMap = located.filter((p) => !p.at);

  if (pts.length === 0) {
    return (
      <div className="heat__none">
        {places.length === 0
          ? "No completed jobs recorded yet"
          : places.map((p) => `${p.suburb} ${p.count}`).join(" · ")}
      </div>
    );
  }

  return (
    <div className="heat">
      <BoardSuburbMap places={pts} />
      {offMap.length > 0 && (
        <span className="heat__off">Also {offMap.map((p) => `${p.suburb} ${p.count}`).join(" · ")}</span>
      )}
    </div>
  );
}

/** suburbCoords is keyed by slug; the board carries the display name. */
const slugForSuburb = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "-");

function AreasPage({ m }: { m: Metrics; live: Live }) {
  // Jobs, not website leads. The leads table holds about thirty rows in total,
  // so the map drew the whole catchment from a trickle and named whichever two
  // suburbs had filled in the web form. Completed jobs carry the same suburb
  // column and there are thousands of them.
  const places = m.topJobSuburbs ?? [];
  // Four, not five: the fifth ran off the bottom of the card at 1080p.
  const oldest = [...m.quotesOutstanding].sort((a, b) => b.ageDays - a.ageDays).slice(0, 4);
  /**
   * The best average ticket, over suburbs with enough jobs to mean something.
   * One $14,800 job in a suburb that has had one job is not an average, it is
   * that job — and on a wall it reads as a place worth chasing.
   */
  const best = places
    .filter((p) => p.count >= 3 && p.avg != null)
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))[0];

  return (
    <>
      <div className="tile" style={{ gridColumn: "1 / span 8", gridRow: "1 / span 3" }}>
        <div className="tile__head">
          <span className="tile__title">Jobs by suburb</span>
          <span className="heat__legend">
            Fewer
            <span className="heat__ramp" />
            More
          </span>
        </div>
        {places.length === 0 ? (
          <span className="tile__sub">No completed jobs recorded yet</span>
        ) : (
          <SuburbHeat places={places} />
        )}
      </div>

      <div className="tile tile--navy" style={{ gridColumn: "9 / span 4", gridRow: 1 }}>
        <span className="tile__label">Highest ticket</span>
        <span className={vcls(m.highestTicket ? plain(m.highestTicket.value) : NA, "tile__value--hero")}>
          <Ticker id="Highest ticket" text={m.highestTicket ? plain(m.highestTicket.value) : NA} />
        </span>
        <span className="tile__sub">
          {m.highestTicket
            ? [m.highestTicket.jobType, m.highestTicket.suburb].filter(Boolean).join(" · ") || "last 60 days"
            : "No completed jobs yet"}
        </span>
      </div>

      <div className="tile" style={{ gridColumn: "9 / span 4", gridRow: 2 }}>
        <span className="tile__label">Best average ticket</span>
        <span className={vcls(best ? plain(best.avg) : NA, "tile__value--hero")}>
          <Ticker id="Best average ticket" text={best ? plain(best.avg) : NA} />
        </span>
        <span className="tile__sub">
          {best ? `${best.suburb} · ${count(best.count)} ${best.count === 1 ? "job" : "jobs"}` : "Not enough jobs to rank"}
        </span>
      </div>

      {/* Going cold, not biggest: the Quotes page already ranks what is out by
          value, and the question this page answers is which ones are aging. */}
      <div className="tile" style={{ gridColumn: "9 / span 4", gridRow: 3 }}>
        <div className="tile__head">
          <span className="tile__title">Going cold</span>
          <span className="tile__sub">last 60 days</span>
        </div>
        {oldest.length === 0 ? (
          <span className="tile__sub">Nothing outstanding</span>
        ) : (
          <div className="quotes">
            {oldest.map((qr) => (
              <div className="quote quote--stack" key={qr.id}>
                <span className="quote__label">
                  {qr.label}
                  {qr.jobNumber ? <span className="quote__job">#{qr.jobNumber}</span> : null}
                </span>
                <span className="quote__value">{plain(qr.value)}</span>
                <span className={`quote__age ${qr.ageDays >= 7 ? "quote__age--late" : ""}`}>
                  {qr.ageDays === 0
                    ? "Today"
                    : `${qr.ageDays} ${qr.ageDays === 1 ? "day" : "days"}${qr.ageDays >= 7 ? " · follow up" : ""}`}
                </span>
                {/* Good, better and best are one quote and at most one of them
                    sells, so the figure is the average of the options rather
                    than their sum. It says so: an unlabelled average of three
                    prices reads as a total and understates the top option. */}
                <span className="quote__basis">{qr.options > 1 ? `avg of ${qr.options}` : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}



/* --------------------------------------------------------------------- crew */

const SECTOR_WORD: Record<CrewSector, string> = {
  maintenance: "maintenance",
  breakdown: "breakdowns",
  repair: "repairs",
  install: "installs",
  other: "other",
};
/* "break" was the short word for a breakdown until the Daily pace page started
   allowing half an hour a day for a break: "1 break · 1 rep" beside a column
   headed Not billable reads as a tea break. Diagnostics is what the job type
   is actually called. */
const SECTOR_SHORT: Record<CrewSector, string> = {
  maintenance: "maint",
  breakdown: "diag",
  repair: "rep",
  install: "inst",
  other: "other",
};

/** "7–3:30", the day non-billable time is measured against. */
const dayWindow = `${DAY_START_HOUR}\u2013${Math.floor(DAY_END_HOUR)}:${String(Math.round((DAY_END_HOUR % 1) * 60)).padStart(2, "0")}`;

/** "166h", "0.5h" — the unit the crew talk in. */
const hrs = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n * 10) / 10}h`);
/** Whole hours, for a figure read from across the room. */
const bigHrs = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n)}h`);

/**
 * Each tech's last sixty days.
 *
 * Jake asked (15 Nov) for the mix of work per person, time on the tools, how
 * much of it is not billable, drive time, whether jobs came in inside the time
 * they were sold for, and "other KPI we can use to see who is standing out vs
 * who is not".
 *
 * **Nothing on this page carries a verdict colour**, and that is deliberate.
 * The board's status palette says where a figure sits against something that
 * measures it, and nothing here is measured against anything anybody has set:
 * there is no configured target for hours on the tools, for drive time, or for
 * the share of jobs that come in inside the sold time. A green 71% would be the
 * board inventing a target and then marking a man against it. The figures sit
 * in ink with their denominators written beside them, and the room does the
 * judging — which is also why the rows are ordered by jobs attended and carry
 * no rank.
 *
 * **Lateness to a job is not here.** The arrival stamp is a default on 576 of
 * the last 715 visits, so a late count would rank the crew on who taps the app.
 * The first line of the page says how much of the clock is real instead, and
 * the per-tech column says it again per person. See DASHBOARD.md.
 */
function CrewPage({ m, live }: { m: Metrics; live: Live }) {
  const c = m.crew;
  if (!live.st || !c || c.techs.length === 0) {
    return (
      <div className="tile c12" style={{ gridRow: "1 / span 2" }}>
        <span className="tile__title">Each van, this year</span>
        <span className="tile__sub">
          {!live.st
            ? "ServiceTitan isn’t connected."
            : c && c.techs.length === 0
              ? "None of the vans has clocked a job in the window yet."
              : "Worked out on the next sync."}
        </span>
      </div>
    );
  }
  const t = c.team;

  return (
    <>
      <HeadCard
        label="Time on the tools"
        value={bigHrs(t.hours)}
        foot={`${count(t.jobs)} jobs · ${t.timed.with} of ${t.timed.of} visits clocked`}
      />
      {/* Not on a job and not driving to one, inside the day the business pays
          for. Jake's definition, 15 Nov. */}
      <HeadCard
        label="Not billable"
        value={t.idle.share != null ? bigHrs(t.idle.hours) : NA}
        foot={
          t.idle.share != null
            ? `${pct(t.idle.share)} of the ${dayWindow} day · after a ${Math.round(BREAK_HOURS * 60)} min break`
            : `only ${count(t.idle.days)} days fully stamped`
        }
      />
      <HeadCard
        label="Drive time"
        value={t.drive.avgMins != null ? String(Math.round(t.drive.avgMins)) : NA}
        suffix={t.drive.avgMins != null ? "min a job" : undefined}
        // Short enough to hold one line at 1600x900, where the longer wording wrapped.
        foot={`${hrs(t.drive.hours)} · ${t.drive.jobs} of ${t.drive.of} jobs recorded`}
      />
      {/* Navy, not a status colour: it is the page's headline question and
          nothing sets a target for it. See the note above. */}
      {/* Against the booked slot, with the invoice's own verdict beneath it.
          Over the year 458 of 490 attended jobs carry a slot and 238 carry a
          sold time, so the slot is the one that can speak for the whole crew;
          the sold time stays because it is what the customer paid for. */}
      <HeadCard
        navy
        label="In the time allowed"
        value={t.inAllowedRate != null ? pct(t.inAllowedRate) : NA}
        foot={
          t.inAllowedRate != null
            ? `${t.allow.within} of ${t.allow.of} jobs${
                t.inTimeRate != null ? ` · ${pct(t.inTimeRate)} of the time sold` : ""
              }`
            : `${t.allow.of} jobs booked by the hour · too few to rate`
        }
      />

      <div className="tile c12" style={{ gridRow: 2 }}>
        <div className="tile__head">
          <span className="tile__title">Each van</span>
          <span className="tile__sub">
            work found: a quote written on a maintenance or breakdown call, or an install booked at
            that address within {c.followDays} days
          </span>
          <span className="crew__legend">
            {CREW_SECTORS.map((k) => (
              <span className="crew__key" key={k}>
                <i className={`mix--${k}`} aria-hidden="true" />
                {SECTOR_WORD[k]}
              </span>
            ))}
          </span>
        </div>
        <div className="crew">
          <div className="crew__head">
            <span>Tech</span>
            <span>Work</span>
            <span>On the tools</span>
            <span>Not billable</span>
            <span>Drive</span>
            <span>In the time allowed</span>
            <span>Billed</span>
            <span>Work found on a visit</span>
          </div>
          {c.techs.map((p) => (
            <CrewRow key={p.tech} p={p} />
          ))}
        </div>
      </div>
    </>
  );
}

function CrewRow({ p }: { p: TechKpi }) {
  const mix = CREW_SECTORS.filter((k) => p.mix[k] > 0);
  return (
    <div className="crew__row">
      <span className="crew__name">
        {p.tech}
        <em>{count(p.jobs)} jobs</em>
      </span>

      <span className="crew__mix">
        <span className="crew__bar" aria-hidden="true">
          {mix.map((k) => (
            <span key={k} className={`crew__seg mix--${k}`} style={{ flexGrow: p.mix[k] }} />
          ))}
        </span>
        {/* The words, not just the colours: the segments are five shades of the
            one navy family and nobody reads a shade from four metres. */}
        <span className="crew__mixnums">
          {mix.map((k) => `${p.mix[k]} ${SECTOR_SHORT[k]}`).join(" · ")}
        </span>
      </span>

      {/* The clock, and how much of it was measured at all. A tech's hours are
          only the visits whose stamps gave a real span, so the denominator goes
          under the figure rather than in a footnote nobody reads. */}
      <span className="crew__fig">
        <b>{bigHrs(p.hours)}</b>
        <span>{`${p.timed.with} of ${p.timed.of} clocked`}</span>
      </span>

      {/* Only the days every job was stamped can say what the rest of the day
          was. Below the floor it says how few, rather than putting an hour and
          a half a day on a man for not tapping his phone. */}
      <span className="crew__fig">
        <b>{p.idle.share != null ? hrs(p.idle.hours) : NA}</b>
        <span>
          {p.idle.share != null
            ? `${pct(p.idle.share)} over ${count(p.idle.days)} days`
            : `${p.idle.days} of ${MIN_IDLE_DAYS} days stamped`}
        </span>
      </span>

      <span className="crew__fig">
        <b>{p.drive.avgMins != null ? `${Math.round(p.drive.avgMins)} min` : NA}</b>
        <span>
          {p.drive.jobs > 0
            ? `${hrs(p.drive.hours)} · ${p.drive.jobs} of ${p.drive.of} jobs`
            : `none of ${p.drive.of} jobs recorded`}
        </span>
      </span>

      {/* The slot leads and the sold time follows: see the head card. A man
          with too few jobs booked by the hour to rate still gets the count,
          because "3 of 4" is a fact and "—" is not. */}
      <span className="crew__fig">
        <b>{p.inAllowedRate != null ? pct(p.inAllowedRate) : NA}</b>
        <span>
          {p.inAllowedRate != null
            ? `${p.allow.within} of ${p.allow.of} · ${
                p.inTimeRate != null ? `sold ${pct(p.inTimeRate)}` : "booked by the hour"
              }`
            : `${p.allow.of} jobs · ${MIN_TIMED} needed to rate`}
        </span>
      </span>

      <span className="crew__fig">
        <b>{compact(p.billed)}</b>
        <span>{p.perHour != null ? `${compact(p.perHour)} an hour` : "no hours clocked"}</span>
      </span>

      <span className="crew__fig">
        <b>
          {count(p.found.quoted)} {p.found.quoted === 1 ? "quote" : "quotes"}
        </b>
        <span>
          {p.found.visits > 0
            ? `${p.found.install} led to an install · of ${p.found.visits} calls`
            : "no service calls in the window"}
        </span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ sectors */

const SECTOR_NAMES: Array<[SectorKey, string]> = [
  ["maintenance", "Maintenance"],
  ["breakdown", "Breakdowns"],
  ["repair", "Repairs"],
  ["install", "Installs"],
];

/** "17 Sep", for the page's line. */
function shortDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/**
 * The pipeline's stages: each one a subset of the one before it.
 *
 * "Quoted on the visit" is every visit that was quoted on, not the ones where
 * nothing came of it — a funnel stage is a count of what got that far, and
 * `quoted` in VisitOutcomes is the leftovers. Dropped entirely on a snapshot
 * written before `quotedAll` existed, rather than drawn as a zero.
 */
function pipeStages(o: VisitOutcomes): Array<{ label: string; n: number; tint: CrewSector }> {
  return [
    { label: "Visits", n: o.visits, tint: "maintenance" as CrewSector },
    ...(o.quotedAll != null
      ? [{ label: "Quoted there", n: o.quotedAll, tint: "breakdown" as CrewSector }]
      : []),
    { label: "Booked back", n: o.install + o.repair, tint: "repair" as CrewSector },
    { label: "Installs", n: o.install, tint: "install" as CrewSector },
  ];
}

/**
 * Where a visit ended up: four outcomes, exclusive, adding up to the visits.
 *
 * Not the same thing as the pipeline above it, which is cumulative — "quoted
 * there" counts every visit that was quoted on, and this one counts the visits
 * where that is all that happened. Both are on the tile because they answer
 * different questions: how far the work got, and where it stopped.
 */
function endedAt(o: VisitOutcomes): Array<[string, number, CrewSector]> {
  return [
    ["Install", o.install, "install"],
    ["Repair", o.repair, "repair"],
    ["Quoted, nothing booked", o.quoted, "maintenance"],
    ["Just the visit", o.only, "other"],
  ];
}

/**
 * The four kinds of work side by side, and what the two kinds of visit lead to.
 *
 * Jake's question (15 Nov): is maintenance or breakdown work worth pushing for
 * the installs it brings, not just for itself? So each visit is valued twice:
 * what it billed, and what it billed plus the installs and repairs booked at
 * the same address in the 60 days after it. The second figure is the one the
 * question is about, and it sits in the navy card.
 *
 * The outcome bars use the navy family, not the status palette: an install is
 * not "good" and a plain service is not "bad" in the board's colour language,
 * and every segment is written out in words with its count beside it.
 */
function SectorsPage({ m, live }: { m: Metrics; live: Live }) {
  const s = m.sectors;
  if (!live.st || !s) {
    return (
      <div className="tile c12" style={{ gridRow: "1 / span 2" }}>
        <span className="tile__title">Maintenance, breakdowns, repairs and installs</span>
        <span className="tile__sub">{!live.st ? "ServiceTitan isn’t connected." : "Worked out on the next sync."}</span>
      </div>
    );
  }
  const goal = m.marginGoal;
  const visits: Array<[string, VisitOutcomes]> = [["Breakdowns", s.breakdown], ["Maintenance", s.maintenance]];
  const per = (o: VisitOutcomes) => (o.visits > 0 ? (o.ownRevenue + o.ledRevenue) / o.visits : null);
  const perOwn = (o: VisitOutcomes) => (o.visits > 0 ? o.ownRevenue / o.visits : null);
  const perProfit = (o: VisitOutcomes) => (o.visits > 0 ? (o.ownProfit + o.ledProfit) / o.visits : null);
  const b = per(s.breakdown);
  const mt = per(s.maintenance);
  // Too few visits and the comparison is one install either way.
  const enough = s.breakdown.visits >= 10 && s.maintenance.visits >= 10;
  const lead = enough && b != null && mt != null && mt > 0 && b > 0
    ? b >= mt
      ? `A breakdown has brought in ${(b / mt).toFixed(1)}× a maintenance visit`
      : `A maintenance visit has brought in ${(mt / b).toFixed(1)}× a breakdown`
    : "Not enough visits yet to compare";

  return (
    <>
      {SECTOR_NAMES.map(([k, name]) => {
        const f = s.bySector[k];
        const avg = f.jobs > 0 ? f.revenue / f.jobs : null;
        // Over or under the goal's margin, in words. The pace scale ("Ahead · 197%")
        // is margin as a share of the goal, which on a wall reads as nonsense.
        const verdict = f.margin != null && goal != null
          ? f.margin >= goal ? { verdict: "ahead", text: `▲ Over ${pct(goal)}` } : { verdict: "behind", text: `▼ Under ${pct(goal)}` }
          : null;
        return (
          <div className="tile tile--sector c3" key={k} style={{ gridRow: 1 }}>
            <span className="tile__labelrow">
              <span className="tile__label">{name}</span>
              {verdict ? <span className={`tile__verdict status status--${verdict.verdict}`}>{verdict.text}</span> : null}
            </span>
            <span className="sector__fig">
              <span className={vcls(f.jobs ? money(f.revenue) : NA)}>
                <Ticker id={`Sector ${name}`} text={f.jobs ? money(f.revenue) : NA} />
              </span>
              <span className="tile__sub">billed</span>
            </span>
            <div className="rows">
              <span className="rows__one"><span className="rows__k">Jobs · average</span><span className="rows__v">{count(f.jobs)} · {plain(avg)}</span></span>
              <span className="rows__one"><span className="rows__k">Profit</span><span className="rows__v">{f.costed ? money(f.profit) : NA}</span></span>
              <span className="rows__one">
                <span className="rows__k">Margin{goal != null ? ` · goal ${pct(goal)}` : ""}</span>
                <span className="rows__v">{f.margin == null ? (f.costed ? `${f.costed} costed, too few` : NA) : pct(f.margin)}</span>
              </span>
            </div>
          </div>
        );
      })}

      <div className="tile c8" style={{ gridRow: 2 }}>
        <div className="tile__head">
          <span className="tile__title">What a visit turns into</span>
          <span className="tile__sub">
            same address, within {s.followDays} days · visits at least {s.settleDays} days old
          </span>
        </div>
        {/* A pipeline rather than a stacked bar (Jake, 15 Nov). The stages are
            cumulative and each one is a subset of the one before it, so the row
            narrows left to right and the drop-off is the gap you can see. The
            stacked bar it replaced showed the four outcomes a visit *ended* at,
            which is the same data and answers a different question: it took
            reading the key to work out that "install" and "quoted, nothing
            booked" were not two steps of one thing. */}
        <div className="pipe">
          {visits.map(([name, o]) => (
            <div className="pipe__row" key={name}>
              <span className="pipe__name">
                {name}
                <em>{count(o.visits)} visits</em>
              </span>
              <span className="pipe__flow">
                {pipeStages(o).map((st, i) => (
                  <Fragment key={st.label}>
                    {i > 0 ? (
                      <span className="pipe__arrow" aria-hidden="true">
                        &rsaquo;
                      </span>
                    ) : null}
                    {/*
                      Equal boxes, and the bar inside each one carries the
                      share. Sizing the boxes themselves by the count was the
                      first try: at nineteen installs out of sixty-eight visits
                      the last box came out too narrow for its own label, and
                      once every box had a floor under it they were all the same
                      width anyway — a funnel that did not narrow. The bar does
                      narrow, and the text stays the size it needs to be.
                    */}
                    <span className="pipe__stage">
                      <i
                        className={`pipe__tint mix--${st.tint}`}
                        aria-hidden="true"
                        style={{ width: o.visits > 0 ? `${Math.max(3, (st.n / o.visits) * 100)}%` : "100%" }}
                      />
                      <b>{count(st.n)}</b>
                      <u>{st.label}</u>
                      <em>{o.visits > 0 ? `${pct(st.n / o.visits)} of visits` : ""}</em>
                    </span>
                  </Fragment>
                ))}
              </span>
              {/* Where the visit ended up, under how far it got. Two different
                  questions off the same visits, and Jake wanted both: the
                  stages are cumulative and each contains the one after it,
                  these four are exclusive and add up to the visits. The lead-in
                  word is what keeps them from being read as one list. */}
              <span className="pipe__out">
                <span className="pipe__bar" aria-hidden="true">
                  {o.visits > 0 &&
                    endedAt(o)
                      .filter(([, n]) => n > 0)
                      .map(([w, n, c]) => (
                        <span key={w} className={`pipe__seg mix--${c}`} style={{ flexGrow: n }} />
                      ))}
                </span>
                <span className="pipe__key">
                  <em className="pipe__kcap">ended at</em>
                  {endedAt(o).map(([w, n, c]) => (
                    <span key={w} className="pipe__k">
                      <i className={`mix--${c}`} aria-hidden="true" />
                      {w} <b>{count(n)}</b>
                      {o.visits > 0 ? <em>{pct(n / o.visits)}</em> : null}
                    </span>
                  ))}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="tile tile--navy c4" style={{ gridRow: 2 }}>
        <span className="tile__label">Each visit is worth, with what it led to</span>
        {/* The two figures are the answer to the page's question, so they are
            the size of an answer. They were a right-hand column in a two-row
            list at a third of this, which put the money at the same weight as
            the labels beside it in a tile with room to spare. */}
        <div className="worth">
          {visits.map(([name, o]) => (
            <div className="worth__one" key={name}>
              <span className="worth__name">{name}</span>
              <span className="worth__fig">
                <Ticker id={`Worth ${name}`} text={plain(per(o))} />
              </span>
              <span className="worth__sub">
                {plain(perOwn(o))} the visit alone · {plain(perProfit(o))} profit all in
              </span>
            </div>
          ))}
        </div>
        <span className="tile__sub">
          <b>{lead}</b>
          {visits.some(([, o]) => o.ledUnbilled > 0)
            ? ` · ${count(s.breakdown.ledUnbilled + s.maintenance.ledUnbilled)} follow‑on jobs not billed yet`
            : ""}
        </span>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------- pieces */
/**
 * The small card across the top of a page: what it is, then the figure.
 *
 * Label above and figure below, rather than the label-left/figure-right the
 * board used before — at four across, the right-aligned figures landed at four
 * different distances from their labels and stopped reading as one row.
 */
function HeadCard({ label, value, suffix, foot, navy, verdict }: {
  label: string; value: string; suffix?: string; foot?: string; navy?: boolean;
  /** Where this figure sits against what it is measured by, if anything measures it. */
  verdict?: { verdict: Verdict; text: string } | null;
}) {
  return (
    <div className={`tile tile--head c3 ${navy ? "tile--navy" : ""}`}>
      <span className="tile__labelrow">
        <span className="tile__label">{label}</span>
        {/* Glyph and word, not a coloured dot: ▼ Behind reads at four metres and
            reads to the one man in twelve who cannot tell the dot from the one
            beside it. */}
        {verdict ? <span className={`tile__verdict status status--${verdict.verdict}`}>{verdict.text}</span> : null}
      </span>
      {/* The figure goes green as well as the word when it is where the goal
          needs it: the word is a third the size and the figure is what is read
          from across the room. Only the good side — behind or close stays in
          ink with the word saying so, so a green figure is always good news. */}
      <span className={`${vcls(value)}${verdict && (verdict.verdict === "track" || verdict.verdict === "ahead") ? " tile__value--good" : ""}`}>
        <Ticker id={label} text={value} />
        {suffix ? <em className="tile__suffix">{suffix}</em> : null}
      </span>
      {foot ? <span className="tile__foot">{foot}</span> : null}
    </div>
  );
}

/**
 * What today asks for, in words, for the foot of a day card.
 *
 * The day cards used to carry a pace chip: today's figure over the day's
 * target times how much of the working day had gone. The arithmetic was right
 * and the number was noise. Sales land in lumps of two to fifteen thousand
 * against a day that needs twelve, so at twenty past nine one $4,054 sale read
 * "▲ Ahead · 127%" — $4,054 over the $3,192 the clock said was due by then —
 * on a day a third covered. A percentage with no denominator on the card was
 * then read against the only big number anybody had in mind, the $3.2M year
 * goal, and the board stopped being believed.
 *
 * So the day cards say what the day asks for and leave the judging to the Pace
 * and Performance pages, where a week and a month of working days have enough
 * in them to average out. A target is a fact; a verdict on two hours of a
 * lumpy day is not.
 */
/**
 * What today has to invoice for the month to still land: the month's need,
 * less everything done before today, over the billable days left with today
 * among them. `share` scales the month's need to another goal level (the
 * floor), since the floor's ask isn't the goal's ask scaled once the work
 * already done comes off it.
 *
 * The plan's flat day share asked the same of the 28th whether the month was
 * $40K behind or $40K ahead; this asks for what keeps up. Work dated today is
 * taken back out of the month first, so the ask holds still through the day
 * instead of shrinking as the day's own invoices arrive.
 */
function keepUpToday(m: Metrics, share = 1): number | null {
  const month = m.pace?.standing.month.invoiced;
  const today = m.pace?.standing.today.invoiced;
  // A day off asks for nothing, the same as the plan.
  if (!month || month.need == null || month.done == null || !((today?.need ?? 0) > 0) || !(m.workingDaysLeft >= 1)) return null;
  return Math.max(0, month.need * share - (month.done - (today?.done ?? 0))) / m.workingDaysLeft;
}

function keepUpMarks(m: Metrics, done: number | null | undefined): GoalMark[] {
  const lv = m.goalLevels;
  if (!lv || done == null || !(lv.goal > 0)) return [];
  const levels = [{ key: "goal", year: lv.goal, need: keepUpToday(m) }];
  if (lv.floor && lv.floor > 0 && lv.floor < lv.goal) levels.push({ key: "floor", year: lv.floor, need: keepUpToday(m, lv.floor / lv.goal) });
  return levels.filter((l) => l.need != null).map((l) => {
    const need = l.need as number;
    const ok = done >= need;
    return { key: l.key, ok, text: `${ok ? "▲" : "▼"} ${shortGoal(l.year)} · ${plain(Math.abs(done - need))} ${ok ? "over" : "to go"}` };
  });
}

/** "$9,800 a day to keep up · 5 billable days left": the ask and what it's spread over. */
function keepUpFoot(m: Metrics): string | null {
  const k = keepUpToday(m);
  if (k == null) return null;
  const n = m.workingDaysLeft;
  return `${plain(k)} a day to keep up · ${count(n)} billable ${n === 1 ? "day" : "days"} left`;
}

function askedOfToday(target: number | null | undefined, kind: "money" | "count" = "money"): string | null {
  if (target == null || !(target > 0)) return null;
  return `of ${kind === "money" ? plain(target) : count(Math.round(target))} today`;
}

/**
 * Today's money in, said as deposits, part payments and finals.
 *
 * Only the kinds that happened: on a day of three straight settlements,
 * "deposits 0 · part 0" is two zeroes taking up the line that the third figure
 * needs. Anything nobody has applied to an invoice yet is named rather than
 * folded in — it is money in, and it is also somebody's job this afternoon.
 */
function paidKindLine(k: Metrics["paidKinds"]): string | null {
  if (!k) return null;
  const parts = ([
    ["deposits", k.deposit],
    ["part paid", k.part],
    ["settled", k.final],
    ["to apply", k.unmatched],
  ] as const)
    .filter(([, v]) => v.count > 0)
    .map(([name, v]) => `${name} ${plain(v.value)} (${count(v.count)})`);
  return parts.length ? parts.join(" · ") : null;
}

/**
 * The quoting the day asks for, with its working shown.
 *
 * The chain Jake asked the board to carry, in the order he said it: the $3.2M
 * goal says what has to be sold, the close rate says how much has to be quoted
 * to sell it, and the average option amount says how many quotes that is. Every
 * figure on the card traces back to the goal, and the card says so — a target
 * nobody can follow is one the room argues with instead of hitting.
 */
function quotingAskedOfToday(m: Metrics): string | null {
  const money = m.pace?.day.quoted.value ?? null;
  if (money == null || !(money > 0)) return null;
  const jobs = m.pace?.day.quoted.count ?? null;
  const close = m.pace?.rates.closeRate.value ?? null;
  const how =
    jobs != null && jobs > 0 && close != null && close > 0
      ? `${count(Math.round(jobs))} ${Math.round(jobs) === 1 ? "quote" : "quotes"} at ${Math.round(close * 100)}%`
      : null;
  return [`of ${plain(money)} today`, how].filter(Boolean).join(" · ");
}

/**
 * The same, joined to whatever else the foot was going to say.
 *
 * The count steps carry a target again. They were pulled on the strength of a
 * stale fixture reading twenty-four bookings a day against a half-remembered
 * "three or four" that was never measured. Measured: ten working days into
 * October the business has booked 102 jobs and completed 72 — 10.2 and 7.2 a
 * day — against a plan asking about 15.6 and 9.1. A stretch of half as much
 * again on bookings is what a goal of growing to $3.2M looks like, not a
 * broken number, and the room is owed the figure it is being asked for.
 */
/**
 * Where the day stands against the year goal and the floor under it.
 *
 * Against the whole day's target, not the share of it the clock says is due:
 * that share is what read "Ahead · 127%" at 9:22am off one sale. "▼ $6,323 to
 * go" means the same thing at 9am and at 5pm, and turns to "▲ over" only when
 * the day has actually done it. The floor's target is the goal's scaled down,
 * because every day target on the wall is the year's revenue shared out.
 */
type GoalMark = { key: string; ok: boolean; text: string };
const shortGoal = (v: number) => (v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M` : `$${Math.round(v / 1000)}K`);
/**
 * The goal chips and the foot, as one block pinned to the bottom of a tile.
 *
 * Together, and not two things that each find their own way down. They were
 * two: the chips sat straight under the figure and the foot had `margin-top:
 * auto`, so on a card whose figure is centred — the navy hero — the chips
 * floated up with the figure and landed sixty pixels above where the same
 * chips sat on the two cards beside it. Three cards in a row, three different
 * heights for the same line. One auto margin, on one block, is the whole fix.
 */
function TileBottom({ goals, foot }: { goals?: GoalMark[]; foot?: string }) {
  if (!goals?.length && !foot) return null;
  return (
    <span className="tile__bottom">
      {goals?.length ? <GoalMarks marks={goals} /> : null}
      {foot ? <span className="tile__foot">{foot}</span> : null}
    </span>
  );
}

function goalMarks(m: Metrics, done: number | null | undefined, target: number | null | undefined): GoalMark[] {
  const lv = m.goalLevels;
  if (!lv || done == null || target == null || !(target > 0)) return [];
  const levels = [{ key: "goal", year: lv.goal, need: target }];
  if (lv.floor && lv.floor > 0 && lv.floor < lv.goal) levels.push({ key: "floor", year: lv.floor, need: (target * lv.floor) / lv.goal });
  return levels.map((l) => {
    const ok = done >= l.need;
    const gap = Math.abs(done - l.need);
    return { key: l.key, ok, text: `${ok ? "▲" : "▼"} ${shortGoal(l.year)} · ${plain(gap)} ${ok ? "over" : "to go"}` };
  });
}

function GoalMarks({ marks }: { marks: GoalMark[] }) {
  if (!marks.length) return null;
  return (
    <span className="goalmarks">
      {marks.map((g) => <span key={g.key} className={`goalmark status status--${g.ok ? "ahead" : "behind"}`}>{g.text}</span>)}
    </span>
  );
}

function footWithTarget(target: number | null | undefined, rest?: string, kind: "money" | "count" = "money"): string | undefined {
  return [askedOfToday(target, kind), rest].filter(Boolean).join(" · ") || undefined;
}

function headVerdictOf(done: number | null | undefined, byNow: number | null | undefined) {
  const index = paceIndex(done, byNow);
  const v = verdictOf(index);
  return v ? { verdict: v, text: verdictText(index, v) } : null;
}

/**
 * A figure at the size the room reads it, with its label above and one line of
 * context under it. The three across the top of Today.
 */
/**
 * A figure with its breakdown beside it, split down the middle.
 *
 * The same shape as the two rate cards below it on the page: label across the
 * top, a rule down the middle, and a foot under both. The breakdown sat under
 * the figure and left the whole right half of the card empty, which on a wall
 * reads as a card that has lost something.
 */
function SideCard({
  label,
  value,
  rows,
  foot,
  verdict,
  goals,
}: {
  label: string;
  value: string;
  /** Against the year goal and its floor; see goalMarks. */
  goals?: GoalMark[];
  rows?: Array<{ k: string; v: string }>;
  foot?: string;
  /** Where this figure sits against what the day needs by now, if anything measures it. */
  verdict?: { verdict: Verdict; text: string } | null;
}) {
  return (
    <div className="tile c4">
      <span className="tile__labelrow">
        <span className="tile__label">{label}</span>
        {verdict ? <span className={`tile__verdict status status--${verdict.verdict}`}>{verdict.text}</span> : null}
      </span>
      <div className={`side ${rows?.length ? "" : "side--alone"}`}>
        <span className={vcls(value, "tile__value--hero")}><Ticker id={label} text={value} /></span>
        {rows?.length ? (
          <div className="rows">
            {rows.map((r) => (
              <span className="rows__one" key={r.k}>
                <span className="rows__k">{r.k}</span>
                <b className="rows__v">{r.v}</b>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <TileBottom goals={goals} foot={foot} />
    </div>
  );
}

function HeroCard({
  label,
  value,
  rows,
  foot,
  navy,
  verdict,
  goals,
}: {
  label: string;
  /** Against the year goal and its floor; see goalMarks. */
  goals?: GoalMark[];
  /** Where this figure sits against what the day needs by now, if anything measures it. */
  verdict?: { verdict: Verdict; text: string } | null;
  value: string;
  /**
   * A short breakdown under the figure, stacked rather than run together.
   *
   * The invoice ageing was one line — "9 billed · today 1 · 1–3d 3 · 4–7d 5 ·
   * 7+ 0" — and at four metres that is a sentence to be read rather than a
   * shape to be glanced at. Stacked, with the counts on their own right-hand
   * edge, the tall bucket is the one that sticks out.
   */
  rows?: Array<{ k: string; v: string }>;
  foot?: string;
  navy?: boolean;
}) {
  return (
    <div className={`tile tile--hero c4 ${navy ? "tile--navy" : ""}`}>
      <span className="tile__labelrow">
        <span className="tile__label">{label}</span>
        {verdict ? <span className={`tile__verdict status status--${verdict.verdict}`}>{verdict.text}</span> : null}
      </span>
      <span className={vcls(value, "tile__value--hero")}><Ticker id={label} text={value} /></span>
      {rows?.length ? (
        <div className="rows">
          {rows.map((r) => (
            <span className="rows__one" key={r.k}>
              <span className="rows__k">{r.k}</span>
              <b className="rows__v">{r.v}</b>
            </span>
          ))}
        </div>
      ) : null}
      <TileBottom goals={goals} foot={foot} />
    </div>
  );
}

/**
 * Label and its context on the left, the figure on the right. Two context
 * lines rather than one: a rate with nothing beside it invites the room to
 * guess what it is a rate of.
 */
/**
 * One tile, two halves, a rule between them.
 *
 * The two sides of the business as three lines of text under a single figure
 * was a list; as two halves it is a comparison, which is the only reason the
 * split exists. Each half carries its own count, because real estate is eight
 * jobs deep and a percentage on its own would hide that.
 *
 * No combined figure on this tile on purpose. Domestic and real estate are 110
 * of the 118 jobs quoted — the rest are quotation and site-assessment units
 * that are not a side of the business — so an overall percentage sitting above
 * two that do not add up to it invites a question with a boring answer. The
 * one figure over everything is on Pace.
 */
function SplitRateCard({
  label,
  note,
  halves,
  foot,
}: {
  label: string;
  note?: string;
  /** Each half may carry its own verdict: the two are measured separately. */
  halves: Array<{ name: string; value: string; sub: string; verdict?: { verdict: Verdict; text: string } | null }>;
  foot?: React.ReactNode;
}) {
  return (
    <div className="tile c4">
      <div className="tile__head">
        <span className="tile__label">{label}</span>
        {note && <span className="tile__sub">{note}</span>}
      </div>
      <div className="halves">
        {halves.map((h) => (
          <div className="halves__one" key={h.name}>
            <span className="halves__namerow">
              <span className="halves__name">{h.name}</span>
              {h.verdict ? <span className={`tile__verdict status status--${h.verdict.verdict}`}>{h.verdict.text}</span> : null}
            </span>
            <span className={`halves__value ${h.value === NA ? "is-na" : ""}`}>{h.value}</span>
            <span className="halves__sub">{h.sub}</span>
          </div>
        ))}
      </div>
      {foot && <span className="tile__sub">{foot}</span>}
    </div>
  );
}

function RateCard({
  label,
  lines,
  value,
  accent,
  leading,
}: {
  label: string;
  lines: string[];
  value: string;
  accent?: boolean;
  /** The figure first, with its label and context to the right of it. */
  leading?: boolean;
}) {
  return (
    <div className={`tile tile--split c4 ${leading ? "tile--lead" : ""}`}>
      <div>
        <span className="tile__label">{label}</span>
        {lines.map((l) => (
          <span className="tile__sub" key={l}>{l}</span>
        ))}
      </div>
      <span
        className={`${vcls(value)} tile__value--rate`}
        style={accent && value !== NA ? { color: "var(--accent)" } : undefined}
      >
        <Ticker id={label} text={value} />
      </span>
    </div>
  );
}

const clockLabel = (now: Date) =>
  now.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Melbourne",
  });

/**
 * Email that didn't arrive.
 *
 * Reads as the thing that was lost rather than as a count of events — "1
 * website enquiry never arrived" is a sentence somebody stands up for, where
 * "1 email event" is one they walk past. The wording is in emailAlertLine, so
 * it can be checked without a browser.
 */
function EmailAlert({ h, short }: { h: NonNullable<Metrics["email"]>; short?: boolean }) {
  return (
    <span className={`screen__alert${h.toCustomer ? " screen__alert--bad" : ""}`} role="status">
      <b className="screen__alerticon" aria-hidden="true">!</b>
      <span>
        <b>Email</b> · {emailAlertLine(h, short)}
      </span>
    </span>
  );
}

function JournalAlert({ j, short }: { j: NonNullable<Metrics["journals"]>; short?: boolean }) {
  const n = j.errors;
  const days = j.oldestErrorDays;
  return (
    <span className="screen__alert" role="status">
      <b className="screen__alerticon" aria-hidden="true">!</b>
      <span>
        <b>Xero</b> · {n} journal {n === 1 ? "entry" : "entries"} didn&rsquo;t sync
        {!short && days != null && days > 0 ? ` · oldest ${days} ${days === 1 ? "day" : "days"}` : ""}
      </span>
    </span>
  );
}

function NotConnected({ what }: { what: string }) {
  return (
    <div className="tile screen__notice c12">
      <span className="tile__value">{NA}</span>
      <span className="tile__sub tile__sub--body">
        ServiceTitan isn&apos;t connected yet, so the board can&apos;t see {what}. These are not zero —
        they are unknown. The figures appear as soon as the credentials are in.
      </span>
    </div>
  );
}

function relative(iso: string, now: Date) {
  const secs = Math.round((now.getTime() - Date.parse(iso)) / 1000);
  if (!Number.isFinite(secs)) return "—";
  if (secs < 60) return `${secs} sec ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  return `${Math.floor(secs / 3600)} hr ago`;
}
