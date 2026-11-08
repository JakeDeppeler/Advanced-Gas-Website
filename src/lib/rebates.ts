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
    a: "Absolutely, heat pumps run beautifully off solar PV, especially the iStore and Reclaim units with timer scheduling. Most of our customers see hot water bills drop to almost zero after a daytime-charge install.",
  },
  {
    q: "I rent, can my landlord do this?",
    a: "Yes. VEU is open to rental properties, many landlords love it because the upgrade adds property value with most of the cost offset by the rebate. We can speak to them directly if it helps.",
  },
  {
    q: "What if my old unit still works?",
    a: "Still eligible. VEU doesn't require failure, it rewards the energy-efficiency improvement. Swapping a working but inefficient gas tank or old aircon is exactly what the program is designed for.",
  },
  {
    q: "Are concession card holders eligible for more?",
    a: "Yes, concession card holders (pensioner, healthcare, etc.) can stack with additional Victorian Government top-up rebates in some cases. Worth a quick call to confirm what applies to your situation.",
  },
  {
    q: "Does VEU cover servicing or just installation?",
    a: "VEU is for the new install. We offer annual servicing separately, priced in writing, to keep your warranty intact and bills low.",
  },
];
