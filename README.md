# Advanced Gas — Melbourne aircon, heat pump & gas plumbing

Next.js 14 site built for **SEO + lead conversion** for Advanced Gas (Melbourne).
Replaces the previous Framer site at `advancedgas.framer.website`.

## What's built

### Lead conversion
- **Multi-step quote form** (`/quote`) — 4 micro-steps with progress bar. Multi-step forms convert ~30-50% better than single long forms for trades.
- **Sticky mobile CTA** — call + quote buttons fixed to bottom of viewport on mobile (where ~70% of trade traffic lives).
- **Click-to-call** everywhere — `tel:` links in header, footer, hero, every CTA section.
- **Trust signals above the fold** — licenses, warranty, Google rating, "<1hr response" badge.
- **Single primary CTA colour** (amber `accent-500`) — consistent across all pages so the eye knows what to click.
- **Honeypot anti-spam** on the form (silent reject) — no captcha friction.
- **Form posts to `/api/quote`**, which emails via Resend if `RESEND_API_KEY` is set, otherwise logs to server console.

### SEO
- **Per-page metadata** (title, description, canonical, OG, Twitter).
- **`sitemap.xml`** — auto-generated from `src/lib/site.ts`. Includes service + suburb combos.
- **`robots.txt`** — auto-generated.
- **JSON-LD schema** — `HVACBusiness` (LocalBusiness), `Service`, `FAQPage`, `BreadcrumbList` on every relevant page. This is what gives you rich results in Google.
- **Local landing pages** — `/melbourne/[suburb]` and `/melbourne/[suburb]/[service]` for every suburb in `src/lib/site.ts`. Each has unique copy, FAQs and internal linking. This is the local-SEO play that captures "aircon installation Richmond"-style searches.
- **Internal linking** — service pages link to suburb pages, suburb pages link to service pages, every page links to `/quote`.
- **Fast** — Next.js App Router, RSC, Tailwind, no JS frameworks shipped beyond React itself. Should score 95+ on Lighthouse out of the box once images are added.
- **Mobile-first**, accessible (skip-link, ARIA labels, semantic HTML).

## Pages

| Route | Purpose |
|---|---|
| `/` | Homepage — hero, services, trust, process, FAQ |
| `/quote` | Multi-step quote form (primary lead capture) |
| `/services/[slug]` | Service detail pages (aircon, heat pump, servicing, gas) |
| `/melbourne/[suburb]` | Suburb hub (e.g. `/melbourne/richmond`) |
| `/melbourne/[suburb]/[service]` | Suburb + service combo (e.g. `/melbourne/richmond/heat-pump-installation`) |
| `/service-areas` | Index of all suburbs |
| `/about` | About + licences |
| `/contact` | Contact + inline quote form |
| `/thanks` | Post-submit page (add conversion pixels here) |
| `/screen` | Wall dashboard for the office TV — see [DASHBOARD.md](DASHBOARD.md) |

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
# → http://localhost:3000
```

## Deploy

Recommended: **Vercel** (1-click).
1. Push this branch to GitHub.
2. Import the repo at vercel.com.
3. Set env vars from `.env.example`.
4. Point your domain (e.g. `advancedgas.com.au`) at Vercel.

## Before going live — replace these placeholders

All business data is centralised in `src/lib/site.ts`. Edit one file:

- `phone`, `phoneE164` — real phone number
- `email` — real email
- `abn` — real ABN
- `licences.plumbing` — VBA plumbing licence number
- `licences.refrigeration` — ARCtick number
- `address` — real address (or remove and use service-area-only schema)
- `geo` — your lat/long for LocalBusiness schema
- `social` — Facebook, Instagram, Google Business Profile URLs

Other manual replacements:
- `src/lib/serviceContent.ts` — fact-check pricing tiers before going live (current numbers are realistic Melbourne ranges but adjust to your real prices)
- `public/logo.png`, `public/og.jpg`, `public/favicon.ico` — add real brand assets
- `src/app/thanks/page.tsx` — drop in Google Ads / Meta / GA4 conversion pixels

## Lead delivery

Add to `.env.local` (and Vercel env vars):
```
LEAD_NOTIFICATION_EMAIL=you@advancedgas.com.au
RESEND_API_KEY=re_xxx  # from resend.com
```

Without these, leads still come through — they print to the Vercel function log (`vercel logs`) so you can copy them manually until email is wired up.

## Extending suburbs / services

- Add a suburb → push a new entry to `suburbs` in `src/lib/site.ts`. Sitemap, footer, service-area page and `/melbourne/[suburb]` route all update automatically.
- Add a service → push to `services` in `src/lib/site.ts`, then add a matching content block in `src/lib/serviceContent.ts`.

## What I'd add next (not built yet)

- **Photos** — real install photos. Trust signal #1 for trades. Replace OG image too.
- **Blog** at `/blog/[slug]` with MDX — "How much does a heat pump cost in Melbourne?", "VEU rebate explained", "Reverse cycle vs evaporative". Each post = 1 long-tail keyword captured.
- **Google reviews widget** — pull live 5-star reviews onto the homepage.
- **Google Business Profile** — once live, set up GBP and link from the footer's `social.google`.
- **Privacy/Terms pages** — required for Australian Privacy Act compliance if collecting form data.
- **Conversion tracking** — Google Ads, Meta, GA4 pixels on `/thanks`.
