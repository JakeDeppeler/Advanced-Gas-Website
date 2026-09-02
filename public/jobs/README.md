# Job albums

Drop a folder per job in here, then run:

    node scripts/build-albums.mjs

It prints a ready-made block to paste into `src/lib/albums.ts`.

    public/jobs/
      reclaim-berwick-changeover/
        1-before.jpg
        2-old-unit-out.jpg
        3-new-tank-in.jpg
        4-finished.jpg
        walkthrough.mp4
        walkthrough.jpg      <- poster frame, same name as the video

Rules that matter:

- **Our work only.** Manufacturer renders live at the top level of
  /public and are referenced from brands.ts. Keeping them apart is what
  lets the gallery say "our installs" and mean it.
- **Every video needs a poster** — same filename as the video with a
  `.jpg` extension. Without one the grid shows a black rectangle. The
  build script warns you.
- **Files sort alphabetically**, so number them if the order matters.
  Before/during/after reads far better than a random shuffle.
- **Write the alt text.** The script leaves TODOs; a screen reader and
  Google Images both depend on you replacing them.
