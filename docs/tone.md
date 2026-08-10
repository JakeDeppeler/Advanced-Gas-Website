# Tone of voice

Pick one. Then everything on the site gets rewritten to match, and
anything new gets written to it.

---

## The problem this is fixing

The brief is "suit every budget while still giving them the best
brands". Right now the copy does the first half by **ranking the brands
against each other**, which quietly tells the budget customer they're
buying the lesser thing.

Three real sentences on the site today:

> "iStore doesn't quite reach Reclaim's build quality or Thermann Series
> 5's parts network, **but** for the customer whose decision comes down
> to the rebate, iStore hits the sweet spot."

> "When the Mitsubishi number doesn't work, Kaden is what we fit **in our
> own rentals**."

> "Kaden as **the value alternative**."

Every one of those is honest, and every one puts the cheaper option on a
lower rung. The second is worse than it looks: it says the good stuff
goes in the houses you live in and the cheap stuff goes in the ones you
rent out, which cuts straight across the promise made everywhere else on
the site, that we only fit what we'd put in our own homes.

**The fix is a change of frame, not just wording.** Stop ranking, start
matching. Every brand we carry is the right answer to a particular
question. Mitsubishi isn't better than Kaden; it's the answer to a
different question. If that's not true of something in the range, it
shouldn't be in the range.

The three tones below all do that. They differ in how they sound.

---

## Tone A · Right for the job  *(recommended)*

Every option is the correct answer for a specific situation. Nothing is
a consolation prize. Premium is justified by need, never by status.

**Sounds like:** a tradesman who's seen every version of your problem
and has an opinion about which one you've got.

**Good at:** letting someone spend less without feeling sold down.
Makes the expensive option easier to sell, because when you *do* say
"you want the 6 kW here", it lands as a reason rather than an upsell.

**Risk:** needs a real reason for every recommendation. If the reason
isn't there, this tone exposes it.

The three sentences become:

> **iStore** is the one to pick when the rebate decides it. Same install,
> same warranty, and it takes the VEU further than anything else we fit.

> **Kaden** is Reece-exclusive, stocked in every store in Victoria, and
> genuinely close to premium on build. It goes in when the space, the
> budget or the timeline says so, and it goes in exactly the same way a
> Mitsubishi does.

> Two brands, because we'd rather know two ranges properly than carry
> twelve. Which one you get depends on your house, not your budget.

---

## Tone B · Straight talker

Closest to what's on the site now. Blunt, plain, opinionated, prepared
to talk you out of things. Keeps the contrarian edge that's working, but
stops ranking the brands.

**Sounds like:** the bloke on the phone is the bloke on the tools, and
he'll tell you when you don't need what you asked for.

**Good at:** trust and differentiation. It's the reason "we'd rather
talk you out of it" reads as credible rather than as a slogan.

**Risk:** blunt is a short distance from blunt-about-your-budget. This
is the tone that produced the "rentals" line in the first place, so it
needs watching.

> **iStore.** If the rebate is what's deciding this, that's your unit.
> Nothing else we fit takes the VEU as far, and it goes in with the same
> crew and the same warranty as the dearest thing on the list.

> **Kaden.** Reece-exclusive, parts in every store in Victoria, and
> closer to premium on build than the price suggests. When Mitsubishi
> doesn't fit the job or the budget, this is what we put in, and we put
> it in the same way.

> We carry two aircon brands, not twelve. Whichever one you end up with,
> the same crew fits it and the same warranty covers it.

---

## Tone C · Quiet expert

Calmer, less blokey, more measured. Fewer short sentences, no slang,
more emphasis on judgement and standards.

**Sounds like:** a specialist explaining a decision, not a tradie
selling one.

**Good at:** reads more expensive. Suits the ducted and CO₂ end of the
range, and older or more cautious buyers.

**Risk:** the honesty gets quieter with it. Much of what makes this site
distinct is that it sounds like a person rather than a company, and this
tone trades some of that away. It also fits the budget end of the range
least well.

> **iStore** delivers the strongest rebate outcome of any system we
> install. Where the Victorian Energy Upgrades figure is the deciding
> factor, it is the sensible choice, installed to the same standard and
> covered by the same warranty as the rest of the range.

> **Kaden** is a Reece-exclusive range, stocked across Victoria, and
> built to a standard that sits close to premium. We specify it where
> the constraints of the job or the budget make it the better fit.

> We carry two air conditioning brands rather than a catalogue, so that
> we know both properly. The choice between them is a question of the
> house, not of what you are prepared to spend.

---

## Rules that apply whichever tone wins

These are the ones that actually deliver "suits everyone, still the best
brands". They're not stylistic.

1. **Never rank two things we sell.** No "doesn't quite reach", no "step
   up to", no "the value alternative". Match to a situation instead.
2. **Nothing is "budget", "cheap" or "entry".** The words are *smaller*,
   *simpler*, *faster to fit*, *strongest rebate*. Say the reason, not
   the tier.
3. **Never say a brand is what we'd put anywhere other than our own
   home.** If it isn't good enough for that, it isn't good enough to
   quote.
4. **A recommendation needs a reason attached.** "You want the 6 kW" is
   an upsell. "You want the 6 kW because four people shower inside an
   hour" is advice.
5. **Same crew, same warranty, said out loud.** It's what makes the
   cheaper option feel like a real choice rather than a downgrade.
6. **Say where something falls down.** Already true of the system pages
   and it's the main reason the rest is believable.
7. **No dollar figures we can't stand behind.** Rebates and prices move;
   "the rebate is applied at the quote" doesn't.
8. **No em-dashes.** Comma or full stop.

---

## What happens next

Once a tone is chosen, the rewrite covers:

- `src/lib/brands.ts` — every `ourTake`, `bestFor` and `keyFeatures`
- `src/lib/serviceContent.ts` — `whyThese`, `benefits`, system blurbs
- `src/components/WhyDifferent.tsx` — the shared house rules
- Home, services, brands hub, pricing intros
- `src/lib/blog.ts` — the comparison posts, which rank hardest of all

Roughly 60 to 80 passages. The frame changes in all of them; how much
the *sound* changes depends on which tone wins.
