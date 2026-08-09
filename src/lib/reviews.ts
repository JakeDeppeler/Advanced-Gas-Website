/**
 * Customer reviews.
 *
 * Single source of truth so the home page rail, the /reviews page and the
 * AggregateRating structured data all read from the same list — previously
 * these lived inline in page.tsx and couldn't be reused.
 *
 * `RATING_SUMMARY` drives both the on-page trust numbers and the
 * schema.org AggregateRating that puts star ratings in Google results.
 * Keep it honest — it should match what's actually on the Google profile.
 */

export type Review = {
  title: string;
  txt: string;
  who: string;
  what: string;
  /** Initials for the avatar chip. */
  a: string;
};

export const RATING_SUMMARY = {
  value: 4.9,
  count: 280,
  best: 5,
} as const;

export const REVIEWS: Review[] = [
  { title: "Quoted Mon, installed Fri", txt: "Took the old gas Rinnai out, dropped in a Reclaim heat pump, sorted the VEU rebate so I paid less than $400 out of pocket. Bloke on the phone is the bloke on the tools, refreshing.", who: "Jess M.", what: "Pakenham · heat pump install", a: "JM" },
  { title: "Family business, feels it", txt: "Answered the phone myself, quoted the job, showed up to install the job. That trail of trust doesn't exist with most of the bigger mobs anymore.", who: "Tom H.", what: "Narre Warren · heat pump", a: "TH" },
  { title: "Actually got up in the roof", txt: "Had three quotes for a ducted system. These guys were the only ones who actually crawled into the roof. Middle of the pack on price but installed cleaner than the others would have.", who: "Dean R.", what: "Officer · ducted retrofit", a: "DR" },
  { title: "Rebate handled, didn't lift a finger", txt: "The VEU paperwork looked scary online. They filled it all in, I signed once at the quote and once on the day. Rebate was already in the price. Painless.", who: "Lauren M.", what: "Pakenham · heat pump swap", a: "LM" },
  { title: "Emergency sorted Sunday", txt: "Hot water died on a Sunday with three kids in the house. Answered the phone, had a temp loaner running by lunch, new iStore in on Tuesday. That's service.", who: "Sam K.", what: "Berwick · emergency hot water", a: "SK" },
  { title: "Cleaned up like nothing happened", txt: "Full ducted retrofit over two days. When they left the roof cavity was tidier than they found it and the driveway had been swept. Small thing but it matters.", who: "Bianca R.", what: "Berwick · ducted install", a: "BR" },
  { title: "No surprises on the invoice", txt: "Quote number matched the invoice exactly. No 'we hit unexpected wiring' story at the end. Nice change.", who: "Priya S.", what: "Cranbourne · split install", a: "PS" },
  { title: "Follow-up call was a surprise", txt: "A week after install they rang to check the heat pump was running quiet and the app was set up. First tradie who's ever followed up after payment cleared.", who: "Nick D.", what: "Beaconsfield · heat pump", a: "ND" },
  { title: "Explained everything", txt: "Walked me through the Milieu tablet, showed the wife how to use it, showed us the compliance cert. Ten minutes of teaching that other installers just skip.", who: "Marcus T.", what: "Officer · ducted aircon", a: "MT" },
  { title: "Split install in half a day", txt: "Bedroom Mitsubishi went in before lunch. Neat pipework, brackets straight, temp checked before they left. Would use again for the lounge.", who: "Alex P.", what: "Cranbourne East · split", a: "AP" },
];

/** Home page renders two balanced columns. */
export const REVIEW_COLUMNS: Review[][] = [
  REVIEWS.filter((_, i) => i % 2 === 0),
  REVIEWS.filter((_, i) => i % 2 === 1),
];
