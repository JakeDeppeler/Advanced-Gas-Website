# Brand install photos

Drop your real install photos in the folder matching the brand slug.
These feed the gallery strip on each `/brands/<slug>` page.

```
public/brands/
├── brivis/
├── istore/
├── kaden/
├── mitsubishi-electric/
├── reclaim/
├── thermann/
└── zonemate/
```

## Naming

Anything is fine — the filename becomes nothing but a path. But a short
descriptive name helps when someone's editing the catalogue later:

```
public/brands/reclaim/co2-split-berwick-01.jpg
public/brands/brivis/wombat-cupboard-retrofit.jpg
public/brands/kaden/multi-head-officer-outdoor.jpg
```

## Before you commit them

Phone photos come off at 4–6 MB, and iPhones shoot HEIC (often saved with
a `.jpg` extension, which no browser will render). Run:

```bash
node scripts/optimise-images.mjs --write --replace
```

It converts everything in `public/` — including this folder — to WebP
capped at 1800 px, and sniffs the real file container rather than
trusting the extension. Dry run first without `--write` to see what it'd do.

Needs `pip install pillow pillow-heif` once.

## Then tell me the filenames

Once they're pushed, the photos get wired into `src/lib/brands.ts` under
each brand's `gallery` array:

```ts
gallery: [
  { src: "/brands/reclaim/co2-split-berwick-01.jpg", alt: "Reclaim CO₂ split installed in Berwick" },
  ...
],
```

Send the filenames and roughly what each shows and I'll write the alt
text and slot them in.

## Rule

**Only real photos of our own work go in here.** Manufacturer product
renders live in `/public` at the top level and are referenced from
`brands.ts` product entries — they're clearly labelled as manufacturer
imagery on the pages that use them. Keeping the two separate is what
lets the site say "these are our installs" and mean it.
