import { DEFAULT_PLAN, type SoundKind, type SoundPlan } from "@/lib/board/soundTypes";

/**
 * The noise good news makes, and whether this screen is allowed to make it.
 *
 * One file per kind, so a quote, a finished job and a sale can have different
 * voices without touching any of this.
 *
 * **A browser will not play audio on a page nobody has clicked**, and nobody
 * ever clicks a wall display. That is the whole difficulty: the board would go
 * silent for a reason it had no way to show. So two things live here besides
 * the sound — a way to unlock audio from any keypress the television's remote
 * sends, and a state the footer reads so the board can say what happened.
 *
 * It says *which* of several things happened, not merely whether it was
 * allowed. Four rounds of this were shipped blind to a television nobody here
 * can hear, and every one was a guess about which of "wrong file", "file didn't
 * load" and "browser said no" was the actual fault. The board now distinguishes
 * them itself, in words, on the screen — and that is what found the real one.
 */

/**
 * Bumped whenever the clip behind a name changes.
 *
 * The board asked for these files for about an hour before they existed, and a
 * browser is entitled to remember a 404 — so a screen that tried once and was
 * told "no such file" can keep believing it long after the file is in place.
 * That is not something a deploy can undo and not something a reload clears on
 * every device. A new query string is a new URL, and a new URL has nothing
 * cached against it.
 */
const V = "6";

export type CheerKind = SoundKind;

/**
 * Each clip, and what measuring it showed.
 *
 * Decoded both and read the envelope rather than trusting that "it played"
 * meant "it was heard", which is how the first sale clip was caught: it was the
 * wrong recording — 2.4 seconds, opening with half a second of silence and
 * peaking at a fifth of the loudness of this one. On a wall, a second after the
 * alert wipes in, that reads as a sound that did not happen, and it was
 * reported as one three times before the right file arrived.
 *
 * What is here now, measured:
 *
 * - `quote` — 0.69s, peak RMS 0.24, audible from 0s, voiced around 162Hz.
 * - `sold`  — 6.48s, peak RMS 0.60, audible from 0s, sustained to the end.
 *
 * Hence the volumes, which are not equal and are not meant to be: the sale's
 * recording is two and a half times the louder of the two, so 0.85 against the
 * quote's 1.0 still leaves a sale clearly the bigger noise without it being the
 * startling one. The sale's alert holds 11 seconds, which the 6.5s clip fits
 * inside with room to spare — nothing has to be trimmed or faded.
 *
 * A finished job shares the quote's clip, which was asked for and is worth
 * naming as a cost: the two are then indistinguishable by ear, so the wall is
 * the only thing that says which just happened. Give `done` its own file here
 * and that goes away — the cache below is keyed by source, so two kinds sharing
 * one still only fetch and decode it once.
 */
const BUILTIN_SRC: Record<string, string> = {
  "builtin:quote": `/sounds/quote.mp3?v=${V}`,
  "builtin:sold": `/sounds/sold.mp3?v=${V}`,
};

/**
 * What each pop-up plays, as chosen on the portal's Sounds page and sent to
 * the board with its remote. Until one arrives — or if none ever has — the
 * board plays what is above, at those volumes: DEFAULT_PLAN is that table.
 */
let plan: SoundPlan = DEFAULT_PLAN;
let screenToken: string | null = null;

type Voice = { mode: "clip"; src: string; volume: number } | { mode: "notes"; volume: number } | { mode: "off" };

function voiceFor(ref: string, volume: number): Voice {
  if (ref === "off" || volume <= 0) return { mode: "off" };
  if (ref === "notes") return { mode: "notes", volume };
  if (BUILTIN_SRC[ref]) return { mode: "clip", src: BUILTIN_SRC[ref], volume };
  if (ref.startsWith("file:")) {
    // Uploaded sounds come from our own route: the television with its screen
    // token, the portal's Sounds page with its session.
    const id = encodeURIComponent(ref.slice(5));
    return { mode: "clip", src: `/api/screen/sound/${id}${screenToken ? `?k=${encodeURIComponent(screenToken)}` : ""}`, volume };
  }
  return { mode: "notes", volume };
}
const voice = (kind: CheerKind): Voice => voiceFor(plan[kind].sound, plan[kind].volume);

/**
 * Take the portal's choices. Called with every read of the remote, so it does
 * nothing unless something changed; when it has, the new clips are fetched
 * and decoded straight away rather than at the next sale.
 */
export function setSoundPlan(next: SoundPlan | null | undefined, token: string | null): void {
  const p = next ?? DEFAULT_PLAN;
  if (token === screenToken && JSON.stringify(p) === JSON.stringify(plan)) return;
  plan = p;
  screenToken = token;
  if (ctx) checkAudio();
}

/**
 * What each kind sounds like with no file behind it.
 *
 * Deliberately not an impression of anything: these stand in for whatever the
 * office puts in `public/sounds/`, and a synthesised arpeggio is one thing
 * nobody owns. Three distinct shapes, so the three are told apart from across a
 * room without looking up — which is more than the recordings manage while a
 * quote and a finished job share a file.
 */
const NOTES: Record<CheerKind, number[]> = {
  // C5, G5 — a fifth, which asks a question rather than answering one.
  quote: [523.25, 783.99],
  // G5, E5 — the only one that falls, because a finished job is a thing closing
  // rather than opening.
  done: [783.99, 659.25],
  // C5, E5, G5 — a major triad, which reads as "good news" to nearly everyone.
  sold: [523.25, 659.25, 783.99],
};

type Ctor = typeof AudioContext;
const ctxCtor = (): Ctor | undefined =>
  typeof window === "undefined"
    ? undefined
    : window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;

/** One context for the life of the page: browsers cap how many a page may open. */
let ctx: AudioContext | null = null;

/**
 * What the last attempt at a noise actually did.
 *
 * - `unknown` — nothing has been tried yet. The footer says nothing.
 * - `clip`    — the real recording played, or is loaded and the speakers work.
 *               The footer says nothing.
 * - `notes`   — the recording was not available, so the synthesised notes
 *               covered it. **This is the one worth putting on the wall**: the
 *               board made a noise, just not the one anybody chose, and without
 *               saying so that reads from the room as "the sound is still
 *               wrong" with no way to tell whether the file or the browser is
 *               at fault. `soundReason` says which.
 * - `off`     — nothing at all came out. Press a button.
 */
export type SoundState = "unknown" | "clip" | "notes" | "off";

let state: SoundState = "unknown";
let reason = "";
const listeners = new Set<() => void>();

function announce(next: SoundState, why = "") {
  if (next === state && why === reason) return;
  state = next;
  reason = why;
  for (const l of listeners) l();
}

/** For the footer's marker. `useSyncExternalStore` wants exactly this shape. */
export function subscribeAudio(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const soundState = () => state;
/** Short enough to read from four metres: "404", "decode failed", "no audio". */
export const soundReason = () => reason;
/** The server renders no marker: it cannot know, and a flash of "sound off" is worse than none. */
export const soundStateOnServer = (): SoundState => "unknown";

function context(): AudioContext | null {
  const C = ctxCtor();
  if (!C) return null;
  if (!ctx) {
    try {
      ctx = new C();
    } catch {
      return null;
    }
  }
  return ctx;
}

/**
 * The clips, fetched once and decoded into memory.
 *
 * **Why not an `<audio>` element.** That was the first implementation and it
 * worked on every machine here and on none of the televisions. The symptom was
 * exact and it is what gave the game away: the board's synthesised notes were
 * audible on the wall while the recording was not. Those notes come out of an
 * AudioContext. So the television's speakers worked, its AudioContext was
 * running, and the only thing failing was `HTMLMediaElement.play()` — which is
 * gated by an autoplay policy that Web Audio, already unlocked, is past.
 *
 * So the recording goes out the same pipe the notes do. Nothing about the
 * television has to be configured for that to work, which matters: the board is
 * a panel on a wall and every fix that begins "open the browser settings" is a
 * fix somebody has to climb up to apply.
 *
 * Decoded up front rather than at the alert, because a sale is exactly the
 * moment not to be waiting on a network round trip, and a fetch that fails is
 * better known about before the wall needs it. Roughly 2MB resident for the
 * pair, which is nothing against the board's images.
 */
const buffers = new Map<string, AudioBuffer>();
const pending = new Map<string, Promise<AudioBuffer | null>>();

function load(src: string, c: AudioContext): Promise<AudioBuffer | null> {
  // Keyed by source rather than kind: a quote and a finished job play the same
  // file, and fetching it twice to hold two copies of it would be silly.
  const have = buffers.get(src);
  if (have) return Promise.resolve(have);
  let p = pending.get(src);
  if (!p) {
    p = fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.arrayBuffer();
      })
      // The callback form as well as the promise: older WebKit only has the
      // former, and a television browser is exactly where that still bites.
      .then(
        (bytes) =>
          new Promise<AudioBuffer>((res, rej) => {
            const out = c.decodeAudioData(bytes, res, rej);
            if (out && typeof out.then === "function") out.then(res, rej);
          }),
      )
      .then((buf) => {
        buffers.set(src, buf);
        return buf;
      })
      .catch((e: unknown) => {
        // Kept for the footer. A bare status code is the most useful thing that
        // fits: "404" says deploy, "decode failed" says file.
        const m = e instanceof Error ? e.message : String(e);
        pending.delete(src); // a later attempt may succeed; don't cache failure
        failure = /^\d{3}$/.test(m) ? `HTTP ${m}` : "decode failed";
        return null;
      });
    pending.set(src, p);
  }
  return p;
}

let failure = "";

/**
 * Ask the browser whether it would let us make a noise, by trying.
 *
 * This used to read `AudioContext.state === "suspended"` and call that blocked,
 * which was wrong and silenced the board: a browser opens an AudioContext
 * suspended at page load *whatever* its autoplay policy says, so a wall display
 * that could play perfectly well reported itself mute — and `cheer` believed it
 * and stopped trying. The symptom was the one thing worse than the bug it was
 * meant to warn about: no sound at all, where there had been a fallback.
 *
 * So it does the two things that can be known in advance without making a
 * sound: fetch and decode the clips, and ask the context whether it is running.
 * Neither is a guess. It never downgrades a verdict a real alert has earned.
 */
export function checkAudio(): void {
  const c = context();
  if (!c) return announce("off", "no audio");
  void c
    .resume()
    .catch(() => {})
    .then(() => {
      const srcs = [...new Set((["quote", "done", "sold"] as CheerKind[]).map(voice).flatMap((v) => (v.mode === "clip" ? [v.src] : [])))];
      return Promise.all(srcs.map((src) => load(src, c)));
    })
    .then((loaded) => {
      if (state === "clip" || state === "notes") return;
      if (c.state !== "running") return announce("off");
      if (loaded.some((b) => b == null)) return announce("notes", failure);
      announce("clip");
    })
    .catch(() => announce("off"));
}

/**
 * Unlock audio from a user gesture — any key the remote sends, or a tap.
 *
 * One gesture is all a browser wants, and a television remote sends a keydown
 * for every button on it, so pressing anything at all while the board is up
 * turns the sound on until the page reloads. Not a substitute for
 * `--autoplay-policy=no-user-gesture-required` on a kiosk that reloads itself,
 * but the difference between "no sound" and "press any key".
 */
export function primeAudio(): void {
  checkAudio();
}

/** Each note a step up from the last, fading as the next starts. */
function fanfare(c: AudioContext, kind: CheerKind, volume = 1) {
  NOTES[kind].forEach((hz, i) => {
    const at = c.currentTime + i * 0.12;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.35 * volume), at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
    osc.connect(gain).connect(c.destination);
    osc.start(at);
    osc.stop(at + 0.5);
  });
}

/**
 * Make the noise. Never throws, and never keeps the caller waiting.
 *
 * Returns a way to stop it, which the alert calls when it clears. The clips fit
 * inside their holds, so this is for the case the hold ends early — a second
 * sale landing on the first, or the board being sent to another page — where a
 * recording still playing over a board that has moved on is worse than one cut
 * short.
 */
export function cheer(kind: CheerKind): () => void {
  return play(kind, voice(kind));
}

/**
 * The Sounds page's "play it here": the same pipe and the same gain the wall
 * uses, so what the office hears at a desk is what the room will hear.
 */
export function previewSound(kind: CheerKind, ref: string, volume: number): () => void {
  return play(kind, voiceFor(ref, volume));
}

function play(kind: CheerKind, v: Voice): () => void {
  // Chosen silence is not a fault: the footer's "sound off" is for a board
  // that couldn't make a noise, not one told not to.
  if (v.mode === "off") return () => {};
  const c = context();
  let source: AudioBufferSourceNode | null = null;
  let stopped = false;
  const volume = v.volume;

  const fallback = (why: string) => {
    if (stopped || !c) return announce("off", "no audio");
    try {
      fanfare(c, kind, volume);
      announce("notes", why);
    } catch {
      announce("off", why);
    }
  };

  if (!c) {
    announce("off", "no audio");
    return () => {};
  }

  if (v.mode === "notes") {
    void c.resume().catch(() => {}).then(() => {
      if (stopped) return;
      try {
        fanfare(c, kind, volume);
        // Beeps by choice are the sound working, not a clip that failed.
        announce(c.state === "running" ? "clip" : "off");
      } catch {
        announce("off", "playback failed");
      }
    });
    return () => { stopped = true; };
  }

  /*
   * Always try. There is no reliable way to ask a browser in advance whether it
   * will play a sound, and guessing wrong in the cautious direction means the
   * board goes quiet on a real sale for a policy that was not actually stopping
   * it. The decode is usually already done, in which case this resolves on the
   * next tick and the sound lands with the alert.
   */
  void c
    .resume()
    .catch(() => {})
    .then(() => load(v.src, c))
    .then((buf) => {
      if (stopped) return;
      if (!buf) return fallback(failure);
      try {
        const src = c.createBufferSource();
        src.buffer = buf;
        const gain = c.createGain();
        gain.gain.value = volume;
        src.connect(gain).connect(c.destination);
        src.start();
        source = src;
        // A suspended context accepts all of the above and emits nothing, so
        // the verdict is the context's state, not the absence of a throw.
        announce(c.state === "running" ? "clip" : "off");
      } catch {
        fallback("playback failed");
      }
    })
    .catch(() => fallback(failure || "playback failed"));

  return () => {
    stopped = true;
    try {
      source?.stop();
    } catch {
      /* Already finished. A player that will not stop is not worth throwing over. */
    }
  };
}
