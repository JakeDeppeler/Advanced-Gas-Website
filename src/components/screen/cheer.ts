/**
 * The noise good news makes, and whether this screen is allowed to make it.
 *
 * One file per kind, so a quote and a sale can have different voices without
 * touching any of this. A finished job stays silent, and that restraint is the
 * point: a board that chimes at every event is a board somebody turns the
 * speakers off on, and then the sale makes no noise either.
 *
 * **A browser will not play audio on a page nobody has clicked**, and nobody
 * ever clicks a wall display. That is the whole difficulty: the board would go
 * silent for a reason it had no way to show. So two things live here besides
 * the sound — a way to unlock audio from any keypress the television's remote
 * sends, and a state the footer reads so the board can say what happened.
 *
 * It says *which* of three things happened, not merely whether it was allowed.
 * Four rounds of this were shipped blind to a television nobody here can hear,
 * and every one of them was a guess about which of "wrong file", "file didn't
 * load" and "browser said no" was the actual fault. The board now distinguishes
 * them itself, in words, on the screen. That is worth more than the next guess.
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
const V = "5";

export type CheerKind = "quote" | "sold";

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
 */
const CLIPS: Record<CheerKind, { src: string; volume: number }> = {
  quote: { src: `/sounds/quote.mp3?v=${V}`, volume: 1 },
  sold: { src: `/sounds/sold.mp3?v=${V}`, volume: 0.85 },
};

/**
 * What each kind sounds like with no file behind it.
 *
 * Deliberately not an impression of anything: these stand in for whatever the
 * office puts in `public/sounds/`, and a synthesised arpeggio is one thing
 * nobody owns. A quote gets two notes and a sale three, so the two are told
 * apart from across a room without looking up.
 */
const NOTES: Record<CheerKind, number[]> = {
  // C5, G5 — a fifth, which asks a question rather than answering one.
  quote: [523.25, 783.99],
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
 * - `clip`    — the real recording played. The footer says nothing.
 * - `notes`   — the file would not play, so the synthesised notes covered it.
 *               **This is the one worth putting on the wall**: the board made a
 *               noise, just not the one anybody chose, and without saying so
 *               that reads from the room as "the sound is still wrong" with no
 *               way to tell whether the file or the browser is at fault.
 * - `off`     — nothing at all came out. Press a button.
 */
export type SoundState = "unknown" | "clip" | "notes" | "off";

let state: SoundState = "unknown";
const listeners = new Set<() => void>();

function announce(next: SoundState) {
  if (next === state) return;
  state = next;
  for (const l of listeners) l();
}

/** For the footer's marker. `useSyncExternalStore` wants exactly this shape. */
export function subscribeAudio(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const soundState = () => state;
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
 * Ask the browser whether it would let us make a noise, by trying.
 *
 * This used to read `AudioContext.state === "suspended"` and call that blocked,
 * which was wrong and silenced the board: a browser opens an AudioContext
 * suspended at page load *whatever* its autoplay policy says, so a wall display
 * that could play perfectly well reported itself mute — and `cheer` believed it
 * and stopped trying. The symptom was the one thing worse than the bug it was
 * meant to warn about: no sound at all, where there had been a fallback.
 *
 * So it plays the real file at zero volume and pauses it. Volume is not the
 * `muted` attribute, which is the one autoplay policies treat specially, so
 * this is subject to exactly the rules a real alert will meet. Nothing is
 * audible and the file is in cache afterwards, ready for the first sale.
 *
 * A probe that succeeds is reported as `clip` even though nobody heard it: it
 * means the next real alert will be heard, which is what the footer is for. It
 * never downgrades a verdict a real alert has already earned.
 */
export function checkAudio(): void {
  try {
    const probe = new Audio(CLIPS.sold.src);
    probe.volume = 0;
    void probe
      .play()
      .then(() => {
        probe.pause();
        if (state === "unknown" || state === "off") announce("clip");
      })
      .catch(() => {
        if (state === "unknown") announce("off");
      });
  } catch {
    if (state === "unknown") announce("off");
  }
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
  const c = context();
  // Resume the synth context, which a gesture does allow, and then ask the
  // question the way checkAudio asks it — by trying to play the real thing.
  if (c) void c.resume().catch(() => {});
  checkAudio();
}

/** Each note a step up from the last, fading as the next starts. */
function fanfare(c: AudioContext, kind: CheerKind) {
  NOTES[kind].forEach((hz, i) => {
    const at = c.currentTime + i * 0.12;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
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
  const c = context();
  /*
   * Always try. There is no reliable way to ask a browser in advance whether it
   * will play a sound — the thing that looks like one, a suspended
   * AudioContext, is suspended at page load either way — and guessing wrong in
   * the cautious direction means the board goes quiet on a real sale for a
   * policy that was not actually stopping it.
   */
  const fallback = () => {
    if (!c) return announce("off");
    try {
      // A suspended context plays nothing, so ask for it back first; a gesture
      // may have arrived since the page loaded. `resume` is a promise, so the
      // verdict cannot be known here — `notes` is the honest answer either way,
      // since it names the thing that was attempted.
      void c.resume().catch(() => {});
      fanfare(c, kind);
      announce("notes");
    } catch {
      announce("off");
    }
  };
  let audio: HTMLAudioElement | null = null;
  try {
    const clip = CLIPS[kind];
    audio = new Audio(clip.src);
    audio.volume = clip.volume;

    void audio
      .play()
      .then(() => announce("clip"))
      // A missing file rejects the same way a blocked autoplay does, so the
      // notes cover both and the board is never silent for want of an asset.
      .catch(fallback);
  } catch {
    audio = null;
    fallback();
  }
  return () => {
    if (!audio) return;
    try {
      audio.pause();
      audio.src = "";
    } catch {
      /* A player that will not stop is not worth throwing over. */
    }
  };
}
