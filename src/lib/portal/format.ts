/**
 * The number formats the portal uses, in one place.
 *
 * They were duplicated at the top of every component that showed a dollar
 * figure, which is fine right up until two of them disagree about decimal
 * places on the same screen.
 */
export const money = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

export const money2 = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const hrs = (n: number) => `${Math.round(n).toLocaleString("en-AU")} hrs`;

export const pct = (n: number) => `${Math.round(n * 100)}%`;
