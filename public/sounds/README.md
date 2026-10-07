# The noises the board makes

Two files, both optional:

| File | Plays when |
|---|---|
| `quote.mp3` | a quote goes out, **and** a job is completed |
| `sold.mp3` | a job is sold |

Both are in place: Homer on the quote and the money-button clip on the sale.
Replace either by overwriting the file — nothing else to change, except bumping
`V` in `src/components/screen/cheer.ts`, which is how a browser is made to
forget the clip it already has. With no file there the board plays a short
synthesised cue instead, two notes for a quote and three for a sale, so the wall
is never silent waiting on an asset.

Measured rather than assumed, because "it played" is not "it was heard":

| File | Length | Peak RMS | Audible from | Volume |
|---|---|---|---|---|
| `quote.mp3` | 0.69s | 0.24 | 0s | 1.0 |
| `sold.mp3` | 6.48s | 0.60 | 0s | 0.85 |

The volumes are deliberately unequal. The sale's recording is two and a half
times the louder of the two, so 0.85 against the quote's 1.0 still leaves a sale
clearly the bigger noise without it being the startling one.

**Keep them shorter than the alert they belong to.** The Sold alert holds the
wall for 11 seconds and the quote for 7, and a clip longer than that is cut off
when the alert clears. One wrong file cost three rounds here: a 2.4-second take
that opened with half a second of silence and peaked at a fifth of this clip's
loudness, which on a wall reads as a sound that did not happen.

**A quote and a completed job currently sound the same**, because both play
`quote.mp3` — asked for, and worth knowing: the wall is the only thing that says
which of the two just happened. Drop a `done.mp3` in here and point `done` at it
in `cheer.ts` and that goes away. The loader is keyed by filename, so two kinds
sharing one clip still only fetch and decode it once.

A finished job used to stay silent, on the argument that a board chiming at
every event is a board somebody turns the speakers off on. If the wall does get
muted, this is the first thing to put back.

## Use something you have the right to use

A clip from a television show, a film or a record is somebody's copyright,
however short and however familiar, and a public deployment is the wrong place
to find out whether anybody minds. Three ways to get these honestly:

- A royalty-free library — there are hundreds of three-second celebration
  stings, and they cost a few dollars or nothing.
- Licence the actual clip, if it matters enough.
- Record your own. Somebody in the office shouting lands harder than a clip
  everyone has already heard, and costs nothing at all.

## Why these play through Web Audio and not an `<audio>` element

Because an `<audio>` element did not work on the television, and the way it
failed is worth writing down. The board's synthesised notes were audible on the
wall while the recording was not — same page, same speakers, same moment. So the
television's volume was fine and its AudioContext was running; the only thing
failing was `HTMLMediaElement.play()`, which an autoplay policy gates separately
from Web Audio.

So the recording now goes out the same pipe as the notes: fetched, decoded once
at load, played through an `AudioBufferSourceNode`. Nothing on the television has
to be configured for that to work, which matters — the board is a panel on a
wall, and every fix beginning "open the browser settings" is a fix somebody has
to climb up to apply.

The setting below is still worth having, since a suspended AudioContext stops
everything, notes included. It is no longer what stands between the wall and the
sound of a sale.

## If the sound is still blocked outright

Browsers refuse to play audio on a page nobody has clicked, and nobody ever
clicks a wall display. Then the footer says `Sound off · press any button` —
pressing any button on the remote unlocks it until the page reloads, which is
the stopgap, not the fix.

## What the footer is telling you

The board says which of three things happened, because from across the room
"wrong sound", "no sound" and "the file didn't load" look identical, and each
has a different fix. Nothing in the footer means the real clip played.

| Footer says | What happened | What to do |
|---|---|---|
| nothing | the recording played | — |
| `♪ Beeps only · HTTP 404` | the file is not where the board looked | check it deployed to `/sounds/…` and that `V` was bumped |
| `♪ Beeps only · decode failed` | the file is there but is not audio this browser reads | re-export it as a plain MP3 |
| `♪ Sound off · press any button` | nothing came out at all | press a button on the remote, then the autoplay setting below |

Chromium and anything built on it:

```
chromium --kiosk --autoplay-policy=no-user-gesture-required https://advancedgas.com.au/tv
```

On a Google TV (Kogan and the rest) the built-in browser has no such setting.
Sideload **Fully Kiosk Browser** and turn on *Settings → Web Content Settings →
Enable Autoplay*; it also starts on boot, which the built-in browser does not.

Check the television's own volume too — a muted HDMI input looks exactly like a
feature that does not work.
