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
 * sends, and a flag the footer reads to say "sound off" while it is blocked. A
 * feature that fails invisibly is a feature nobody can fix.
 */

const FILES = {
  quote: "/sounds/quote.mp3",
  sold: "/sounds/sold.mp3",
} as const;

export type CheerKind = keyof typeof FILES;

/** Loud enough across a workshop, short of startling somebody at the next desk. */
const VOLUME = 0.7;

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
let blocked = false;
const listeners = new Set<() => void>();

function announce(next: boolean) {
  if (next === blocked) return;
  blocked = next;
  for (const l of listeners) l();
}

/** For the footer's marker. `useSyncExternalStore` wants exactly this shape. */
export function subscribeAudio(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const audioBlocked = () => blocked;
/** The server renders no marker: it cannot know, and a flash of "sound off" is worse than none. */
export const audioBlockedOnServer = () => false;

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
 * Ask the browser whether it would let us make a noise.
 *
 * A context opened without a user gesture comes up `suspended` where autoplay
 * is blocked and `running` where it isn't, so this answers the question before
 * a sale rather than after one — which matters, because the first sale is
 * exactly the moment nobody wants to be debugging this.
 */
export function checkAudio(): void {
  const c = context();
  announce(!!c && c.state === "suspended");
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
  if (!c) return;
  void c
    .resume()
    .then(() => announce(c.state === "suspended"))
    .catch(() => announce(true));
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
    gain.gain.exponentialRampToValueAtTime(VOLUME * 0.5, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
    osc.connect(gain).connect(c.destination);
    osc.start(at);
    osc.stop(at + 0.5);
  });
}

/** Make the noise. Never throws, and never keeps the caller waiting. */
export function cheer(kind: CheerKind): void {
  const c = context();
  if (c && c.state === "suspended") {
    // Still locked. Say so rather than failing quietly, and don't bother trying.
    announce(true);
    return;
  }
  const fallback = () => {
    if (!c) return announce(true);
    try {
      fanfare(c, kind);
      announce(false);
    } catch {
      announce(true);
    }
  };
  try {
    const audio = new Audio(FILES[kind]);
    audio.volume = VOLUME;
    void audio
      .play()
      .then(() => announce(false))
      // A missing file rejects the same way a blocked autoplay does, so the
      // notes cover both and the board is never silent for want of an asset.
      .catch(fallback);
  } catch {
    fallback();
  }
}
