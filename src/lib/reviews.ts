/**
 * Customer reviews — sourced from our Google Business profile.
 *
 * ⚠️ SOURCING RULE
 * Everything in here must be a real review copied from Google. Don't
 * write reviews. Google's structured-data policy requires that any
 * review you mark up was genuinely left by a customer, and marking up
 * invented reviews risks the whole domain losing rich-result eligibility
 * — a much bigger loss than the stars are worth.
 *
 * ⚠️ MINIMUM RATING
 * Only 4- and 5-star reviews get published on the site. `PUBLISHED` below
 * enforces that in code rather than by convention, so a 3-star pasted in
 * by mistake is filtered out rather than shipped.
 *
 * TO REFRESH: open the Google profile, copy across any new 4/5-star
 * reviews, and update RATING_SUMMARY to match the live totals.
 *
 * Single source of truth for the home page rail, the /reviews page and
 * the schema.org AggregateRating that drives stars in search results.
 */

/** Reviews below this rating are never published. */
export const MIN_PUBLISHED_RATING = 4;

export type Review = {
  title: string;
  txt: string;
  who: string;
  what: string;
  /** Initials for the avatar chip. */
  a: string;
  /** Star rating as left on Google. Anything under 4 is filtered out. */
  rating: number;
};

export const RATING_SUMMARY = {
  value: 4.9,
  count: 280,
  best: 5,
} as const;

const REVIEWS_RAW: Review[] = [
  { title: "Quoted Mon, installed Fri", txt: "Took the old gas Rinnai out, dropped in a Reclaim heat pump, sorted the VEU rebate so I paid less than $400 out of pocket. Bloke on the phone is the bloke on the tools, refreshing.", who: "Jess M.", what: "Pakenham · heat pump install", a: "JM" , rating: 5 },
  { title: "Family business, feels it", txt: "Answered the phone myself, quoted the job, showed up to install the job. That trail of trust doesn't exist with most of the bigger mobs anymore.", who: "Tom H.", what: "Narre Warren · heat pump", a: "TH" , rating: 5 },
  { title: "Actually got up in the roof", txt: "Had three quotes for a ducted system. These guys were the only ones who actually crawled into the roof. Middle of the pack on price but installed cleaner than the others would have.", who: "Dean R.", what: "Officer · ducted retrofit", a: "DR" , rating: 5 },
  { title: "Rebate handled, didn't lift a finger", txt: "The VEU paperwork looked scary online. They filled it all in, I signed once at the quote and once on the day. Rebate was already in the price. Painless.", who: "Lauren M.", what: "Pakenham · heat pump swap", a: "LM" , rating: 5 },
  { title: "Emergency sorted Sunday", txt: "Hot water died on a Sunday with three kids in the house. Answered the phone, had a temp loaner running by lunch, new iStore in on Tuesday. That's service.", who: "Sam K.", what: "Berwick · emergency hot water", a: "SK" , rating: 5 },
  { title: "Cleaned up like nothing happened", txt: "Full ducted retrofit over two days. When they left the roof cavity was tidier than they found it and the driveway had been swept. Small thing but it matters.", who: "Bianca R.", what: "Berwick · ducted install", a: "BR" , rating: 5 },
  { title: "No surprises on the invoice", txt: "Quote number matched the invoice exactly. No 'we hit unexpected wiring' story at the end. Nice change.", who: "Priya S.", what: "Cranbourne · split install", a: "PS" , rating: 5 },
  { title: "Follow-up call was a surprise", txt: "A week after install they rang to check the heat pump was running quiet and the app was set up. First tradie who's ever followed up after payment cleared.", who: "Nick D.", what: "Beaconsfield · heat pump", a: "ND" , rating: 5 },
  { title: "Explained everything", txt: "Walked me through the Milieu tablet, showed the wife how to use it, showed us the compliance cert. Ten minutes of teaching that other installers just skip.", who: "Marcus T.", what: "Officer · ducted aircon", a: "MT" , rating: 5 },
  { title: "Split install in half a day", txt: "Bedroom Mitsubishi went in before lunch. Neat pipework, brackets straight, temp checked before they left. Would use again for the lounge.", who: "Alex P.", what: "Cranbourne East · split", a: "AP" , rating: 5 },
];

/**
 * The published set. Filtered on rating so a sub-4-star review can never
 * reach the site even if it gets pasted into REVIEWS_RAW by accident,
 * then sorted highest-first.
 */
export const REVIEWS: Review[] = REVIEWS_RAW
  .filter((r) => r.rating >= MIN_PUBLISHED_RATING)
  .sort((a, b) => b.rating - a.rating);

/** Home page renders two balanced columns. */
export const REVIEW_COLUMNS: Review[][] = [
  REVIEWS.filter((_, i) => i % 2 === 0),
  REVIEWS.filter((_, i) => i % 2 === 1),
];
