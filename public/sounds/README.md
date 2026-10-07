# The noises the board makes

Two files, both optional:

| File | Plays when |
|---|---|
| `quote.mp3` | a quote goes out |
| `sold.mp3` | a job is sold |

Drop either in and the board uses it. With no file there it plays a short
synthesised cue instead — two notes for a quote, three for a sale — so the wall
is never silent waiting on an asset. See `src/components/screen/cheer.ts`.

A finished job stays silent on purpose. A board that chimes at every event is a
board somebody turns the speakers off on, and then the sale makes no noise
either.

## Use something you have the right to use

A clip from a television show, a film or a record is somebody's copyright,
however short and however familiar, and a public deployment is the wrong place
to find out whether anybody minds. Three ways to get these honestly:

- A royalty-free library — there are hundreds of three-second celebration
  stings, and they cost a few dollars or nothing.
- Licence the actual clip, if it matters enough.
- Record your own. Somebody in the office shouting lands harder than a clip
  everyone has already heard, and costs nothing at all.

Keep them short — a second or two. The Sold alert holds the wall for eleven
seconds and the quote for seven, and anything longer than the alert is still
playing over the next page.

## It will not be heard without this

**The kiosk browser has to be allowed to autoplay.** Browsers refuse to play
audio on a page nobody has clicked, and nobody ever clicks a wall display. The
promise rejects, the board carries on silently, and the footer says `Sound off ·
press any button` — which is the stopgap, not the fix. Pressing any button on
the remote unlocks it until the page reloads.

Chromium and anything built on it:

```
chromium --kiosk --autoplay-policy=no-user-gesture-required https://advancedgas.com.au/tv
```

On a Google TV (Kogan and the rest) the built-in browser has no such setting.
Sideload **Fully Kiosk Browser** and turn on *Settings → Web Content Settings →
Enable Autoplay*; it also starts on boot, which the built-in browser does not.

Check the television's own volume too — a muted HDMI input looks exactly like a
feature that does not work.
