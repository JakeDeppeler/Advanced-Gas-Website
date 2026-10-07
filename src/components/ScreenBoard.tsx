"use client";

import { type CSSProperties, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { suburbCoords } from "@/lib/suburbCoords";
import { BoardSuburbMap } from "@/components/BoardSuburbMap";
import type { Metrics, SourceState } from "@/lib/dashboard/metrics";
import type { Step } from "@/lib/dashboard/pace";
import { Gauge, MiniDial, ZONES, ZONE_BAND, ZONE_LABEL, paceIndex, verdictOf, verdictText, type Verdict } from "./screen/Gauge";
import { Alert, previewAlert, type AlertKind } from "./screen/Alert";
import { checkAudio, primeAudio, soundReason, soundState, soundStateOnServer, subscribeAudio } from "./screen/cheer";
import { Ticker, TickerScope } from "./screen/Ticker";
import { alertFrom } from "@/lib/dashboard/alertCopy";
import { useBoardRemote } from "./screen/useBoardRemote";
import { BOARD_PAGES, type BoardRemote } from "@/lib/board/remoteTypes";

type Snapshot = {
  computedAt: string;
  metrics: Metrics;
  sources: Record<string, { state: SourceState; detail?: string; at?: string }>;
};

// Re-fetches JSON on a timer rather than reloading the page. A kiosk browser
// left on this URL for months would leak memory and flash white on every
// location.reload(); swapping state in place does neither.
const REFRESH_MS = 30_000;
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
  Team: "screen__grid--team",
  Performance: "screen__grid--perf",
  Areas: "screen__grid--areas",
};

/**
 * The line beside each page name: what the figures below it are measuring.
 *
 * Pace names where its targets came from, because "63%" on a wall invites the
 * question and the answer is the whole point of the board.
 */
/**
 * The badge beside a page's name: is this page's own measure on track?
 *
 * Only Performance carries one so far. Its headline question is whether the
 * month's work is getting done, so the badge is the `completed` step of Pace —
 * the same figure the Pace page's Completed dial shows, on the same done ÷
 * by-now scale as every other verdict on the board and as the footer's key. A
 * second scale invented for this one badge is how a board starts disagreeing
 * with itself.
 */
function headVerdict(name: (typeof PAGES)[number], m: Metrics): { verdict: string; text: string } | null {
  if (name !== "Performance") return null;
  const s = m.pace?.standing.month.completed;
  if (!s || s.need == null) return null;
  const index = paceIndex(s.done, s.byNow);
  const verdict = verdictOf(index);
  if (!verdict) return null;
  return { verdict, text: verdictText(index, verdict) };
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
    return `What the ${goal} goal needs of every step${day ? ` · ${day}` : ""}`;
  },
  Quotes: () => "Written today, and what's still out",
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
  Performance: () => `${monthName(new Date())} so far · booked and invoiced, by job type`,
  Areas: () => "Where the work is · last 60 days",
  // Says whose day it is and what the dials measure, because the first dial is
  // time against a quote and the room has to know that is what it is seeing.
  "Daily pace": (m) => {
    const d = m.daily;
    if (!d) return "Each tech's day on the tools";
    const cover = d.team.quotedCover;
    const gap = cover.of - cover.with;
    return `each tech's day on the tools: on time vs quoted, jobs done, billed${
      gap > 0 ? ` · ${gap} of ${cover.of} jobs have no quoted time` : ""
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
  const [queue, setQueue] = useState<Metrics["alertEvents"]>([]);
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
        if (fresh.length) setQueue((qd) => [...qd, ...fresh].slice(-3));

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
            key={celebrating.id}
            alert={alertFrom(celebrating, m)}
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
        {/* Whether the page's own headline measure is behind, close, on track
            or ahead, right beside its name — so the room gets the answer before
            reading any of the figures under it. The word is written out: this
            is the board's status palette and it is never carried by hue alone. */}
        {headVerdict(name, m) && (
          <span className={`screen__verdict status status--${headVerdict(name, m)!.verdict}`}>
            {headVerdict(name, m)!.text}
          </span>
        )}
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
          <span className="screen__dashes" aria-hidden="true">
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
        {name === "Daily pace" && <DailyPacePage m={m} live={live} now={now} />}
        {name === "Team" && <TeamPage m={m} live={live} />}
        {name === "Performance" && <PerformancePage m={m} live={live} />}
        {name === "Areas" && <AreasPage m={m} live={live} />}
        </TickerScope.Provider>
      </div>

      <div className={`screen__foot${journalAlert ? " has-alert" : ""}`}>
        <span className="screen__feed">
          <span className={`screen__dot ${healthy ? "" : "screen__dot--stale"}`} aria-hidden />
          <b>{healthy ? "Live" : "Catching up"}</b>
        </span>
        {/* A journal entry ServiceTitan couldn't post to Xero. On every page,
            because it's the one thing on the board that needs the office
            rather than the crew — and gone the run after it's fixed. */}
        {journalAlert && m.journals && <JournalAlert j={m.journals} short={page === 1} />}
        {/* With the alert up and every feed fine, the green Live dot says what
            this line would, and the Pace page's key needs the room. */}
        {!(journalAlert && healthy) && <span>
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
        {page === 1 && (
          <span className="screen__legend">
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
  const soldFoot =
    soldJobs == null
      ? undefined
      : `${count(soldJobs)} ${soldJobs === 1 ? "job" : "jobs"} sold` +
        (m.quotesCreatedTodayCount > 0
          ? ` · ${count(m.quotesCreatedTodayCount)} ${m.quotesCreatedTodayCount === 1 ? "quote" : "quotes"} written`
          : "");

  const today = m.pace?.standing.today;
  /*
   * Sold is the one of these with no money figure to be measured against.
   *
   * The `sold` step in `standing` counts jobs, so its byNow is in jobs — the
   * same unit trap that put 529,611% on a Team card. The day's sold *value*
   * target is on the plan, and how much of the day has gone is on the
   * calendar, so the by-now for money is the two multiplied.
   */
  const cal = m.paceData?.calendar;
  const dayGone = cal ? (cal.todayWorking ? cal.dayFraction : 1) : null;
  const soldTarget = m.pace?.day.sold.value ?? null;
  const soldByNow = soldTarget != null && dayGone != null ? soldTarget * dayGone : null;

  return (
    <>
      {/* Sold today, on the left where the eye starts. */}
      <HeroCard
        navy
        label="Sold today"
        value={st.plain(m.soldToday, live)}
        verdict={headVerdictOf(live.st ? m.soldToday : null, soldByNow)}
        foot={soldFoot}
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
        verdict={headVerdictOf(live.st ? m.revenueToday : null, today?.invoiced.byNow)}
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
            : m.jobsInvoicedToday === 0
              ? "nothing billed yet today"
              : `${count(m.jobsInvoicedToday)} ${m.jobsInvoicedToday === 1 ? "job" : "jobs"} billed, by how long each waited`
        }
      />

      {/* Quoted today completes the money row: written, billed, closed. The
          three figures the day is actually judged on sit on one line, and the
          counts move down to the row underneath. */}
      <SideCard
        label="Quoted today"
        value={st.plain(m.quotesCreatedTodayValue, live)}
        verdict={headVerdictOf(live.st ? m.quotesCreatedTodayValue : null, today?.quotedValue.byNow)}
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
            : m.quotesCreatedTodayCount === 0
              ? "nothing quoted yet today"
              : `${count(m.quotesCreatedTodayCount)} ${m.quotesCreatedTodayCount === 1 ? "job" : "jobs"} priced today`
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
            sub: `from ${count(m.leadsToday)} ${m.leadsToday === 1 ? "lead" : "leads"}`,
            verdict: headVerdictOf(live.st ? m.bookingsToday : null, today?.booked.byNow),
          },
          {
            name: "Completed",
            value: st.count(m.jobsCompletedToday, live),
            sub: `${count(m.jobsCompletedWeek)} this week`,
            verdict: headVerdictOf(live.st ? m.jobsCompletedToday : null, today?.completed.byNow),
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
      {/* Money in, both halves of it: what was banked today and what is still
          owed. They were two different cards' worth of figure and only one card
          between them, and they belong side by side anyway — a good day on the
          left is the thing that shrinks the number on the right. */}
      <SplitRateCard
        label="Money in"
        halves={[
          {
            name: "Paid today",
            value: m.paidToday == null ? NA : plain(m.paidToday),
            sub:
              m.paymentsToday == null
                ? "payments not synced yet"
                : m.paymentsToday === 0
                  ? "nothing banked yet"
                  : `${count(m.paymentsToday)} ${m.paymentsToday === 1 ? "payment" : "payments"}`,
          },
          {
            name: "Overdue",
            value: m.overdueTotal == null ? NA : money(m.overdueTotal),
            sub:
              m.overdueCount == null
                ? "not read from Xero yet"
                : `${count(m.overdueCount)} ${m.overdueCount === 1 ? "invoice" : "invoices"}`,
          },
        ]}
        foot={m.receivablesTotal == null ? undefined : `${money(m.receivablesTotal)} on the books all up`}
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
   * A bucket the snapshot does not carry counts as zero.
   *
   * Snapshots written before the fortnight was split into 1–7 and 8–14 hold
   * neither key, and `receivablesAging` is carried forward when a Xero read
   * fails or is skipped — so the old shape outlives the deploy. Read loosely,
   * those two rows came out as a dash beside a bar at its full width, which
   * says "everything is a week late" on a board whose whole job is not to say
   * things like that.
   */
  const a = m.receivablesAging;
  const num = (v: number | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const aging = a
    ? { notDue: num(a.notDue), d1to7: num(a.d1to7), d8to14: num(a.d8to14), d15to30: num(a.d15to30), d30plus: num(a.d30plus) }
    : null;
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
              : `${count(m.paymentsToday)} ${m.paymentsToday === 1 ? "payment" : "payments"} · ${plain(m.paidMonth ?? 0)} this month`
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
            {[
              { k: "Not due yet", v: aging.notDue, cls: "" },
              { k: "1 – 7 days", v: aging.d1to7, cls: "is-soft" },
              { k: "8 – 14 days", v: aging.d8to14, cls: "is-soft2" },
              { k: "15 – 30 days", v: aging.d15to30, cls: "is-warn" },
              { k: "30+ days", v: aging.d30plus, cls: "is-bad" },
            ].map((r) => (
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

  // The same two measures as the Today page's money row, against the same
  // by-now, so the two pages cannot disagree about whether the day is going
  // well. Sold has no money step in `standing` — that one counts jobs — so its
  // by-now is the day's target times how much of the day has gone.
  const today = m.pace?.standing.today;
  const cal = m.paceData?.calendar;
  const dayGone = cal ? (cal.todayWorking ? cal.dayFraction : 1) : null;
  const soldTarget = m.pace?.day.sold.value ?? null;
  const soldByNow = soldTarget != null && dayGone != null ? soldTarget * dayGone : null;

  return (
    <>
      <div className="tile tile--head" style={{ gridColumn: "1 / span 4", gridRow: 1 }}>
        <span className="tile__labelrow">
          <span className="tile__label">Quoted today</span>
          <Verdict of={headVerdictOf(m.quotesCreatedTodayValue, today?.quotedValue.byNow)} />
        </span>
        <span className={vcls(plain(m.quotesCreatedTodayValue))}><Ticker id="Quoted today" text={plain(m.quotesCreatedTodayValue)} /></span>
        {/* How many options each job was given, not just how many were written
            in total. The count on its own answers "how busy"; the average
            answers "how well" — three options a job is a quote, one is a price,
            and it is the first thing that slips on a flat-out day. */}
        <span className="tile__foot">
          {count(m.quotesCreatedTodayCount)} {m.quotesCreatedTodayCount === 1 ? "job" : "jobs"}
          {m.quotesCreatedTodayCount > 0 && m.quotesCreatedTodayOptions > 0
            ? ` · ${count(m.quotesCreatedTodayOptions)} options · ${avgOptions(m.quotesCreatedTodayOptions, m.quotesCreatedTodayCount)} each`
            : ""}
        </span>
      </div>

      <div className="tile tile--navy tile--head" style={{ gridColumn: "5 / span 4", gridRow: 1 }}>
        <span className="tile__labelrow">
          <span className="tile__label">Sold today</span>
          <Verdict of={headVerdictOf(m.soldToday, soldByNow)} />
        </span>
        <span className={vcls(plain(m.soldToday))}><Ticker id="Sold today" text={plain(m.soldToday)} /></span>
        <span className="tile__foot">
          {count(m.quotesCreatedTodaySold)} of {count(m.quotesCreatedTodayCount)} jobs quoted today
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
 * Each tech's day on the tools.
 *
 * The only page the crew are the subject of, which sets how it behaves: worst
 * first, so the card the room should look at is the leftmost one, and nobody is
 * scored against a number that was never set.
 *
 * **The first dial is quoted ÷ taken, not the other way round.** Taking longer
 * than the job was priced for is the bad outcome, and the board's zones run
 * low-is-behind — so a day quoted at 4h and taken in 6 reads 67%, in the red
 * band, where 6h quoted and 5.5h taken reads 109% and sits on track. One
 * palette, no inverted dial, and "over time" lands in the colour the rest of
 * the board uses for trouble.
 *
 * **A job with no quoted time is not scored.** Most service work is billed
 * without a labour line, so only 76 of 268 timesheet spans over thirty days
 * carried quoted hours; a standard time per job type, set in the portal, fills
 * the rest in as it gets filled in. Until then those jobs show their hours
 * taken, the dial is drawn flat, and the card says how many of the day's jobs
 * had nothing to measure against. That is the whole reason the header carries
 * the caveat too: a figure the room cannot check is one it stops trusting.
 */
function DailyPacePage({ m, live, now }: { m: Metrics; live: Live; now: Date }) {
  const d = m.daily;
  const hrs = (n: number) => `${Math.round(n * 10) / 10}h`;
  /** "0.5h under" / "1.2h over" — the gap in the unit the crew talk in. */
  const gap = (quoted: number, taken: number) => {
    const diff = Math.round(Math.abs(quoted - taken) * 10) / 10;
    if (diff < 0.1) return "on the quote";
    return `${diff}h ${taken > quoted ? "over" : "under"}`;
  };
  /** The band's word. The four verdicts, said the way a day is said. */
  const BAND: Record<Verdict, string> = {
    ahead: "Under time",
    track: "On time",
    close: "Running over",
    behind: "Over time",
  };

  if (!live.st || !d || d.techs.length === 0) {
    return (
      <div className="tile c12 dp__empty">
          <span className="tile__label">Nobody on the tools yet</span>
        <span className="dp__emptysub">
          {live.st ? "The first job of the day fills this page." : "Waiting on ServiceTitan."}
        </span>
      </div>
    );
  }

  const t = d.team;
  const teamIndex = t.hoursQuoted != null && t.hoursTakenQuoted > 0 ? t.hoursQuoted / t.hoursTakenQuoted : null;

  return (
    <>
      <div className="dp__row">
        {d.techs.slice(0, 5).map((p, i) => {
          // Over the quoted jobs only, both halves. See hoursTakenQuoted.
          const index = p.hoursQuoted != null && p.hoursTakenQuoted > 0 ? p.hoursQuoted / p.hoursTakenQuoted : null;
          const v = verdictOf(index);
          const jobsIdx = paceIndex(p.jobsDone, p.jobsTotal);
          const billIdx = paceIndex(p.billedCount, Math.max(1, p.jobsDone));
          const noQuote = p.quotedCover.of - p.quotedCover.with;
          return (
            <div className="dp__card" key={p.tech}>
              <span className={`dp__band ${v ? `status--${v}` : "dp__band--none"}`}>
                <b>{v ? BAND[v] : "No quoted time"}</b>
                <em>
                  {index != null && p.hoursQuoted != null
                    ? `${Math.round(index * 100)}% · ${gap(p.hoursQuoted, p.hoursTakenQuoted)}`
                    : `${hrs(p.hoursTaken)} taken`}
                </em>
              </span>

              <span className="dp__who">
                <i aria-hidden>{i + 1}</i>
                {p.tech}
              </span>

              {/* The label belongs to the cell, not the dial: `bare` drops the
                  Gauge's own heading so it can sit inside a card that already
                  has one, and three unlabelled dials in a column are three
                  numbers nobody can name. */}
              <div className="dp__cell">
                <span className="dp__glabel">On time · hours vs quoted</span>
                <Gauge
                  bare
                  index={index}
                  verdict={v}
                  figure={hrs(index != null ? p.hoursTakenQuoted : p.hoursTaken)}
                  of={p.hoursQuoted != null ? `of ${hrs(p.hoursQuoted)} quoted` : "taken"}
                  status={
                    index != null
                      ? verdictText(index, v)
                      : /* Never "0%". Nothing was quoted, so there is nothing to be
                           behind, and a red dial here would blame somebody for a
                           missing setting. */
                        "nothing quoted to measure"
                  }
                  foot={
                    noQuote > 0
                      ? `${noQuote} of ${p.quotedCover.of} not quoted · ${hrs(p.hoursTaken)} all up`
                      : undefined
                  }
                />
              </div>

              <div className="dp__cell">
                <span className="dp__glabel">Jobs done off the list</span>
                <Gauge
                  bare
                  index={jobsIdx}
                  verdict={verdictOf(jobsIdx)}
                  figure={`${p.jobsDone} of ${p.jobsTotal}`}
                  status={verdictText(jobsIdx, verdictOf(jobsIdx))}
                  foot={p.jobsDone >= p.jobsTotal ? "list done" : `${p.jobsTotal - p.jobsDone} still to go`}
                />
              </div>

              <div className="dp__cell">
                <span className="dp__glabel">Billed</span>
                <Gauge
                  bare
                  index={p.jobsDone > 0 ? billIdx : null}
                  verdict={p.jobsDone > 0 ? verdictOf(billIdx) : null}
                  figure={`${p.billedCount} of ${p.jobsDone}`}
                  status={p.jobsDone > 0 ? verdictText(billIdx, verdictOf(billIdx)) : "nothing finished yet"}
                  foot={p.billedValue > 0 ? `${money(p.billedValue)} billed today` : "nothing billed yet"}
                />
              </div>

              <span className="dp__foot">
                {p.onNow ? (
                  <b>
                    Now · {p.onNow.what}
                    {p.onNow.where ? `, ${p.onNow.where}` : ""} · {hrs(p.onNow.taken)}
                    {p.onNow.quoted != null ? ` of ${hrs(p.onNow.quoted)}` : ""}
                  </b>
                ) : (
                  <b>{p.jobsDone >= p.jobsTotal ? "List done" : "Between jobs"}</b>
                )}
                <span>
                  {p.toBillCount > 0
                    ? `${p.toBillCount} ${p.toBillCount === 1 ? "job" : "jobs"} waiting to bill`
                    : "Nothing waiting to bill"}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* The day in one line, in the same navy the Pace page's year band uses. */}
      <div className="year dp__team">
        <div className="year__main">
          <span className="year__nums">
            <b className="year__gap">{hrs(t.hoursTaken)} taken</b>
            <em className={`year__vs ${teamIndex != null && teamIndex < 1 ? "is-behind" : "is-ahead"}`}>
              {/* Named as the subset it is. "16.2h taken, 6h quoted, 10.2h over"
                  was the whole day's hours against four jobs' quotes, which is
                  not a comparison — it is two different days put next to each
                  other with a minus sign between them. */}
              {t.hoursQuoted != null
                ? `${hrs(t.hoursTakenQuoted)} of that on ${t.quotedCover.with} quoted ${
                    t.quotedCover.with === 1 ? "job" : "jobs"
                  } · ${gap(t.hoursQuoted, t.hoursTakenQuoted)}`
                : "no quoted time on today's jobs"}
            </em>
          </span>
        </div>
        <div className="dp__teamstats">
          <span>
            <em>Jobs done</em>
            <b>
              {t.jobsDone} <i>of {t.jobsTotal}</i>
            </b>
          </span>
          <span>
            <em>Billed</em>
            <b>
              {t.billedCount} <i>of {t.billableCount} done</i>
            </b>
          </span>
          <span>
            <em>On the tools</em>
            <b>
              {d.techs.length} <i>{d.techs.length === 1 ? "tech" : "techs"}</i>
            </b>
          </span>
        </div>
      </div>
    </>
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

  const teamSold = people.reduce((a, r) => a + r.sold, 0);
  const teamQuoted = people.reduce((a, r) => a + r.quoted, 0);
  const teamSoldJobs = people.reduce((a, r) => a + r.soldJobs, 0);
  const teamQuotedJobs = people.reduce((a, r) => a + r.quotedJobs, 0);
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
            <span className="teamfoot__sub">{count(teamQuotedJobs)} jobs</span>
          </span>
          <span className="teamfoot__stat">
            <span className="teamfoot__k">Close rate</span>
            <b>{teamQuotedJobs > 0 ? pct(teamSoldJobs / teamQuotedJobs) : NA}</b>
          </span>
          <span className="teamfoot__stat">
            <span className="teamfoot__k">Avg ticket</span>
            <b>{teamSoldJobs > 0 ? plain(teamSold / teamSoldJobs) : NA}</b>
          </span>
          <span className="teamfoot__stat">
            <span className="teamfoot__k">Avg quote</span>
            <b>{teamQuotedJobs > 0 ? plain(teamQuoted / teamQuotedJobs) : NA}</b>
          </span>
        </span>
      </div>
    </>
  );
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
          <span className="teamcard__sub">{count(r.quotedJobs)} jobs</span>
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

/* ------------------------------------------------------------ /05 Performance */
/**
 * Performance: what the month's work was worth, by the kind of job it was.
 *
 * One table, not two panels. The second panel here used to be top suburbs by
 * website lead, which is a different question on a page about job profitability
 * and is answered properly by the heat map on Areas — off thousands of jobs
 * rather than the thirty-odd rows the web form has ever produced.
 *
 * The goal line on each margin bar is the year goal's profit percentage. No
 * percentage set means no line, rather than a line at a number nobody chose.
 */
/**
 * What the quote allowed against what the crew actually clocked.
 *
 * The one comparison on this page that is about doing the work rather than
 * selling it, and the one the office asked for: a job priced at four hours that
 * takes nine was sold at a margin it never had.
 *
 * It counts only jobs carrying *both* numbers — sold hours on the invoice and a
 * timesheet against the job — which is a narrower set than the costed one and a
 * small one either way. The count goes on the card, because thirty-seven jobs'
 * over-run is a different statement from the month's and the room has to be
 * able to see which it is being shown.
 *
 * Over the year rather than the month, alone among this page's cards: October
 * carries six such jobs and the year carries thirty-seven. Six jobs is a
 * fortnight's weather, so the card's sub line says which period it means.
 *
 * Quoted margin against achieved margin, the other half of what was asked for,
 * is not here: the estimate line items do carry a cost, but only seven jobs in
 * the year have both a quoted cost and a billed one, and seven is an anecdote.
 * See DASHBOARD.md.
 */
function TimeCard({ jp, live }: { jp: Metrics["jobProfitMonth"]; live: Live }) {
  const n = jp?.timeJobs ?? 0;
  const allowed = jp?.timeAllowed ?? 0;
  const actual = jp?.timeActual ?? 0;
  // Over-run as a share of what was allowed: 91.5 allowed and 141.7 taken is
  // 55% over, not 155%.
  const over = n > 0 && allowed > 0 ? actual / allowed - 1 : null;
  const hrs = (h: number) => `${h >= 100 ? Math.round(h) : h.toFixed(1)} hrs`;
  // Under the quote is good, over is not. The same four-step palette as
  // everything else, read in the direction that matters here.
  const verdict = over == null ? null : over <= 0 ? "ahead" : over <= 0.1 ? "track" : over <= 0.3 ? "close" : "behind";

  return (
    <div className="tile c3">
      <div className="tile__head">
        <span className="tile__title">Time on the tools</span>
        {/* The one card on a month page that isn't the month, and it says so.
            October holds six jobs with both a quoted time and a timesheet; the
            year holds thirty-seven. Six is not an over-run, it is a fortnight.
            Just the period: "allowed vs taken" alongside it wrapped the title
            onto two lines in a quarter-width card, and the two rows below
            already name both halves. */}
        <span className="tile__sub">last 30 days</span>
      </div>
      {!live.st || n === 0 ? (
        <span className="tile__sub tile__sub--body">
          {st.sub("No job this month carries both a quoted time and a timesheet", live)}
        </span>
      ) : (
        <div className="timecard">
          <span className={`timecard__fig status--${verdict}`}>
            {over == null ? NA : `${over > 0 ? "+" : ""}${Math.round(over * 100)}%`}
          </span>
          <span className="timecard__say">{over != null && over > 0 ? "over the quote" : "inside the quote"}</span>
          {/* Both bars scaled against the longer of the two, so the overhang is
              the over-run drawn to scale rather than a percentage read twice. */}
          <div className="timecard__bars">
            <span className="timecard__row">
              <span className="timecard__k">Allowed</span>
              <b>{hrs(allowed)}</b>
            </span>
            <span className="timecard__bar">
              <i className="is-allowed" style={{ width: `${(allowed / Math.max(allowed, actual)) * 100}%` }} />
            </span>
            <span className="timecard__row">
              <span className="timecard__k">Taken</span>
              <b>{hrs(actual)}</b>
            </span>
            <span className="timecard__bar">
              <i
                className={`is-actual status--${verdict}`}
                style={{ width: `${(actual / Math.max(allowed, actual)) * 100}%` }}
              />
            </span>
          </div>
          <span className="tile__sub">
            {count(jp?.timeOver ?? 0)} of {count(n)} {n === 1 ? "job" : "jobs"} ran over
          </span>
        </div>
      )}
    </div>
  );
}

function PerformancePage({ m, live }: { m: Metrics; live: Live }) {
  const goal = m.marginGoal;

  const rows = m.topJobTypes.map((t) => ({
    ...t,
    margin: t.profit != null && t.revenue > 0 ? t.profit / t.revenue : null,
  }));

  /**
   * Margin, or — when there is none to show — each type's share of the month.
   *
   * The job-type table's margin comes off `st_invoices.cost`, and not one
   * invoice in the replica carries one: 0 of 5,415. So the column was five empty
   * grey tracks and a column of dashes, which from four metres reads as a broken
   * chart rather than as missing data, and Jake asked why the line was grey.
   *
   * A column that has never once held a figure is not holding a place, it is
   * taking one. Share of the month's invoicing goes there instead — measured,
   * and it answers what the table is actually read for, which is where the
   * month's money came from. The navy tile above still carries a real margin,
   * worked per job from equipment cost and hours (see jobProfit.ts), and this
   * column comes back on its own the day ServiceTitan starts sending a cost.
   */
  const anyMargin = rows.some((t) => t.margin != null);
  const share = (revenue: number) => (m.revenueInvoicedMtd > 0 ? revenue / m.revenueInvoicedMtd : null);

  // The tile's margin is the job-level one, not the invoice column's: the
  // invoice column has never once been populated, so a tile built on it read
  // "—" on every single day it has been up.
  // The rolling thirty days. The month and year fields are only still read so a
  // snapshot written before jobProfitRecent existed renders rather than blanks.
  const jp = m.jobProfitRecent ?? m.jobProfitYear ?? m.jobProfitMonth;

  return (
    <>
      {/* Three cards, and each says which population it counts. Jobs booked is
          jobs created this month; everything else on this page is invoices, and
          the two differ — 29 invoices against 20 jobs booked and 11 completed in
          the same month, because ServiceTitan bills a job when it is billed and
          one job can carry more than one invoice. The page was read as job
          counts twice; now it says.

          The foot names the work rather than the date, because the date was
          never the interesting half. This counted every job created, installs
          among them, and an install is not a booking — it exists because
          something was already sold, so it was counted on the way in and again
          at Sold and Completed. It was also judged against a target built from
          quote visits and service calls, which made 78 look ahead of a plan
          that had asked for 62. Same definition as the Pace funnel now, so one
          word means one thing across the board. */}
      <HeadCard
        label="Jobs booked"
        value={st.count(m.bookingsMonth, live)}
        verdict={headVerdictOf(m.bookingsMonth, m.pace?.standing.month.booked.byNow)}
        foot="quote, repair and service jobs"
      />
      <HeadCard
        label="Invoiced"
        value={st.money(m.revenueInvoicedMtd, live)}
        verdict={headVerdictOf(m.revenueInvoicedMtd, m.pace?.standing.month.invoiced.byNow)}
        foot={live.st ? `${count(m.invoiceCountMonth)} invoices raised` : undefined}
      />
      {/* What turned up against what was asked for. The row was three cards in a
          space built for four, with a quarter of it empty since profit came
          off, and this is the figure that was missing from the story: booked,
          invoiced, paid, and what was left of it. */}
      {/* Measured against the same plan as Invoiced, not against what we
          happened to invoice: the goal is revenue, and revenue is not revenue
          until it is banked. It will read behind Invoiced most months, because
          cash lags billing — that gap is the thing worth seeing. */}
      <HeadCard
        label="Paid"
        value={m.paidMonth == null ? NA : money(m.paidMonth)}
        verdict={headVerdictOf(m.paidMonth, m.pace?.standing.month.invoiced.byNow)}
        foot={
          m.paidMonth == null
            ? "payments not synced yet"
            : m.revenueInvoicedMtd > 0
              ? `${pct(m.paidMonth / m.revenueInvoicedMtd)} of what was invoiced`
              : "banked this month"
        }
      />
      {/* Profit came off: it read "—" on every single day, because no invoice in
          the tenant carries a cost. Margin stays because Jake asked for it, and
          it is now the per-job figure — price before GST, less equipment and
          materials, less the hours at what an hour of the crew costs — with the
          jobs it could cost said underneath, so a margin off four jobs never
          passes as a margin off the month. */}
      <HeadCard
        navy
        label="Job margin"
        value={live.st ? pct(jp?.margin ?? null) : NA}
        /* Against the goal itself, not against a by-now share of it: a margin
           is a rate, and a rate is not something you accumulate half of by the
           middle of the month. */
        verdict={headVerdictOf(jp?.margin ?? null, goal)}
        suffix={goal != null && jp?.margin != null ? `of ${pct(goal)}` : undefined}
        foot={
          !live.st
            ? undefined
            : jp == null || jp.costed === 0
              ? "no job costed this month yet"
              : `over ${count(jp.costed)} of ${count(jp.jobs)} jobs billed · last 30 days`
        }
      />

      <TimeCard jp={jp} live={live} />

      <div className="tile c9">
        <div className="tile__head">
          <span className="tile__title">Job types</span>
          {/* The set-aside count is on the wall, not buried: a ranking that
              quietly omits most of the invoices is a ranking you can't trust. */}
          <span className="tile__sub">
            this month
            {m.jobTypeUnclassified > 0 ? ` · ${count(m.jobTypeUnclassified)} untyped` : ""}
          </span>
        </div>
        {rows.length === 0 ? (
          <span className="tile__sub">{st.sub("No invoiced work in the this month", live)}</span>
        ) : (
          <div className="jt">
            <div className="jt__head">
              <span />
              {/* Invoices, not jobs: the table is grouped from st_invoices, and
                  a job can carry more than one. 29 invoices against 11 jobs
                  completed this month is the kind of gap a wrong column heading
                  turns into an argument. */}
              {/* Booked leads invoiced: a month that takes a lot on and bills
                  little of it reads as quiet on the invoice column alone. */}
              <span>Booked</span>
              <span>Invoices</span>
              <span>Revenue</span>
              <span className="jt__marginhead">
                {anyMargin ? `Margin${goal != null ? ` · line is the ${pct(goal)} goal` : ""}` : "Share of the month"}
              </span>
              <span />
            </div>
            {rows.map((t) => {
              const under = goal != null && t.margin != null && t.margin < goal;
              const part = anyMargin ? null : share(t.revenue);
              return (
                <div className="jt__row" key={t.jobType}>
                  <span className="jt__name">{t.jobType}</span>
                  <span className="jt__n">{t.booked == null ? NA : count(t.booked)}</span>
                  <span className="jt__n">{count(t.jobs)}</span>
                  <span className="jt__n">{money(t.revenue)}</span>
                  <span className="jt__bar">
                    {anyMargin ? (
                      t.margin == null ? null : (
                        <>
                          {/* Scaled to twice the goal, so a bar at the goal sits
                              mid-track and the line has somewhere to be. Without
                              a goal the scale is the best margin on the page. */}
                          <span
                            className={`jt__fill ${under ? "is-under" : "is-over"}`}
                            style={{
                              width: `${Math.min(100, (t.margin / (goal != null ? goal * 2 : Math.max(0.01, ...rows.map((r) => r.margin ?? 0)))) * 100)}%`,
                            }}
                          />
                          {goal != null && <span className="jt__goal" />}
                        </>
                      )
                    ) : part == null ? null : (
                      // Share of the whole month, so the bars sit against the
                      // figure in the tile above rather than against each other
                      // — the top row is not automatically a full track.
                      <span className="jt__fill" style={{ width: `${Math.min(100, part * 100)}%` }} />
                    )}
                  </span>
                  <span className={`jt__pct ${anyMargin ? (t.margin == null ? "" : under ? "is-under" : "is-over") : "jt__pct--quiet"}`}>
                    {anyMargin ? (t.margin == null ? NA : pct(t.margin)) : part == null ? NA : pct(part)}
                  </span>
                </div>
              );
            })}
            {/* The five rows are a ranking, not the month. Jake asked for the
                month's own totals under them because the obvious reading of a
                table is that it adds up, and these five came to a third of the
                invoiced figure in the tile above. Counted over every invoice,
                untyped ones included, so this line and "Invoiced" agree. */}
            <div className="jt__row jt__row--total">
              <span className="jt__name">All work this month</span>
              <span className="jt__n">{count(m.bookingsMonth)}</span>
              <span className="jt__n">{count(m.invoiceCountMonth)}</span>
              {/* Full digits, not $21K: this is the figure of the page and it
                  gets read off the wall and repeated. */}
              <span className="jt__n">{plain(m.revenueInvoicedMtd)}</span>
              <span />
              <span
                className={`jt__pct ${
                  anyMargin ? (m.marginPct == null ? "" : goal != null && m.marginPct < goal ? "is-under" : "is-over") : "jt__pct--quiet"
                }`}
              >
                {anyMargin ? (m.marginPct == null ? NA : pct(m.marginPct)) : "100%"}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
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
 * A head card's verdict: done against what the goal says should be done by now.
 *
 * The same scale as the dials and the footer's key, so "On track" on this page
 * means what it means on Pace. `byNow` must be in the step's own unit — the
 * count steps are jobs and the money steps are dollars, and they share a shape.
 */
function Verdict({ of }: { of: { verdict: Verdict; text: string } | null }) {
  if (!of) return null;
  return <span className={`tile__verdict status status--${of.verdict}`}>{of.text}</span>;
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
}: {
  label: string;
  value: string;
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
      {foot ? <span className="tile__foot">{foot}</span> : null}
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
}: {
  label: string;
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
      {foot ? <span className="tile__foot">{foot}</span> : null}
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
