/**
 * The /rebates page's questions. In a module of their own rather than inside
 * the page because the website chat answers from them too, and a page file
 * can only export what Next.js expects of a page.
 */
export const REBATE_FAQS: { q: string; a: string }[] = [
  {
    q: "Who actually pays for the VEU rebate?",
    a: "Energy retailers in Victoria are required by law to fund energy-efficiency upgrades, that's the VEU program. We claim and apply the certificates on your behalf, which is why you don't pay then chase.",
  },
  {
    q: "Is the rebate guaranteed at the amount you quote?",
    a: "The rebate value can fluctuate slightly based on certificate prices, but we lock in the quoted figure once you sign, so the price you see is the price you pay. We carry any market movement, not you.",
  },
  {
    q: "Can I use VEU with solar?",
    a: "Absolutely, heat pumps run beautifully off solar PV, especially the iStore and Reclaim units with timer scheduling. With solar, a heat pump set to run on a daytime timer can cut hot water running costs to very little.",
  },
  {
    q: "I rent, can my landlord do this?",
    // Rentals get VEU + STCs only (Jake, 24 Nov 2026): Solar Victoria's rebate,
    // and the locally made top-up that is part of it, are owner-occupier only.
    a: "Yes. The VEU discount and the federal STCs both apply to rental properties. Solar Victoria's rebate is for owner-occupiers only, so a rental gets less off, about $1,205 on a heat pump on today's figures. We can speak to your landlord directly if it helps.",
  },
  {
    q: "What if my old unit still works?",
    a: "Still eligible. VEU doesn't require failure, it rewards the energy-efficiency improvement. Swapping a working but inefficient gas tank or old aircon is exactly what the program is designed for.",
  },
  {
    q: "Are concession card holders eligible for more?",
    a: "Sometimes. It depends on the program and your circumstances, so call us and we'll check what applies to you.",
  },
  {
    q: "Does VEU cover servicing or just installation?",
    a: "VEU is for the new install. We offer annual servicing separately, priced in writing, to keep your warranty intact and bills low.",
  },
];
