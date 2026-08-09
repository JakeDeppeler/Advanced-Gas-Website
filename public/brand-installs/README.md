# Brand install photos — drop them here

One folder. Drop every brand install photo straight in, no subfolders to
think about.

## Naming

**Start the filename with the brand name.** Everything after that is up to
you — it just helps whoever reads the code later.

```
reclaim-berwick-co2-split.jpg
reclaim 315 stainless officer.jpg      ← spaces are fine
brivis-wombat-cupboard.jpg
kaden-multi-head-outdoor.jpg
mitsubishi-msz-ap-lounge.jpg
thermann-continuous-flow.jpg
istore-270-pakenham.jpg
zonemate-milieu-hallway.jpg
```

Recognised brand prefixes:

| Type | Matches |
|---|---|
| `reclaim` | Reclaim Energy |
| `brivis` | Brivis |
| `kaden` | Kaden |
| `mitsubishi` / `mitsi` / `me` | Mitsubishi Electric |
| `thermann` | Thermann |
| `istore` | iStore |
| `zonemate` / `milieu` | Zonemate |

Don't stress about the exact wording — if a file doesn't match anything the
sorter lists it as unmatched and I'll place it by eye.

## After you drop them in

```bash
node scripts/sort-brand-photos.mjs --write
```

That one command:

1. **Converts HEIC → WebP.** iPhones shoot HEIC and often save it with a
   `.jpg` extension, which no browser can render. The script sniffs the
   real file container rather than trusting the name.
2. **Resizes and compresses** to 1600 px WebP — a 5 MB phone photo lands
   around 200 KB.
3. **Sorts** each file into `public/brand-installs/<brand>/`.
4. **Prints ready-to-paste code** for `src/lib/brandGallery.ts`, with a
   `TODO` on each alt text.

Run it without `--write` first to preview what it'd do.

Needs `pip install pillow pillow-heif` once.

## Then

Either paste the generated block into `src/lib/brandGallery.ts` yourself
and fill in the alt text, or just push the photos and tell me — I'll write
the alt text (it matters for both accessibility and image search) and wire
them in.

## The rule

**Only real photos of our own work go in here.** Manufacturer product
renders live at the top level of `/public` and are referenced from
`brands.ts`. Keeping them apart is what lets the brand pages say "these
are our installs" and actually mean it.
