# The sound a sale makes

Drop an audio file here named **`sold.mp3`** and the board plays it when a job
is sold. Nothing else to change.

With no file here the board plays a short synthesised fanfare instead, so the
wall is never silent for want of an asset — see `src/components/screen/cheer.ts`.

Two things to know before it will actually be heard.

**Use something you have the right to use.** A clip from a television show or a
film is somebody's copyright, however short and however familiar; it is not ours
to put on a wall, and a public-facing deployment is the wrong place to find out
whether anybody minds. Royalty-free libraries have plenty of three-second
celebration stings, and a voice memo of somebody in the office shouting is both
free and better.

**The kiosk browser has to be allowed to autoplay.** Browsers refuse to play
audio on a page nobody has clicked, and nobody ever clicks a wall display. The
promise rejects, the board carries on silently, and there is nothing on screen
to say why. Chromium needs:

```
chromium --kiosk --autoplay-policy=no-user-gesture-required https://advancedgas.com.au/tv
```

Check the television's own volume too — a muted HDMI input looks exactly like a
feature that does not work.
