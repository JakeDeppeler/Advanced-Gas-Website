/**
 * The noise a sale makes.
 *
 * Plays `/sounds/sold.mp3` if that file is there, and a short synthesised
 * fanfare if it isn't — so the board makes a noise the day this ships, and
 * whatever clip the office would rather hear is a matter of dropping a file in
 * `public/sounds/` with no code change.
 *
 * **A kiosk browser will refuse to play this by default.** Autoplay without a
 * user gesture is blocked everywhere, and a wall display is never clicked, so
 * the promise `play()` returns rejects and the board stays silent with nothing
 * in the interface to explain it. Chromium needs launching with
 * `--autoplay-policy=no-user-gesture-required`; see DASHBOARD.md. Every path
 * here swallows its own failure, because a sale that cannot be heard is still a
 * sale that has to be shown.
 */

const FILE = "/sounds/sold.mp3";

/** Loud enough across a workshop, short of startling somebody at the next desk. */
const VOLUME = 0.7;

/**
 * Three notes up, a second apart, each fading as the next starts.
 *
 * Deliberately not an impression of anything: it is a placeholder for whatever
 * the office puts in `public/sounds/sold.mp3`, and a synthesised arpeggio is
 * one thing nobody owns.
 */
function fanfare() {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  // C5, E5, G5 — a major triad, which reads as "good news" to nearly everyone.
  [523.25, 659.25, 783.99].forEach((hz, i) => {
    const at = ctx.currentTime + i * 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(VOLUME * 0.5, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.5);
  });
  // Let the last note ring out before tearing the context down; browsers cap
  // how many a page may open, and a board runs for weeks.
  setTimeout(() => void ctx.close().catch(() => {}), 1200);
}

/** Make the noise. Never throws, and never keeps the caller waiting. */
export function cheer(): void {
  try {
    const audio = new Audio(FILE);
    audio.volume = VOLUME;
    // A missing file rejects the same way a blocked autoplay does, so the
    // fanfare covers both and the board is never silent for want of an asset.
    void audio.play().catch(() => {
      try {
        fanfare();
      } catch {
        // No audio on this device. The alert is still on the wall.
      }
    });
  } catch {
    // No Audio constructor at all — a server render, or a browser from 2009.
  }
}
