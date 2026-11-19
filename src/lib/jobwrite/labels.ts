// The parts of a write-up and their labels, kept apart from words.ts so the
// page's browser code can use them without Node's crypto coming along.

export type QuoteWords = { doing: string; removing: string; included: string; excluded: string; labour: string };
export type InvoiceWords = { did: string; removed: string; included: string; labour: string };
export type JobWords = { quote: QuoteWords; invoice: InvoiceWords };

/** The quote's, as the templates have them (pricebook/wording.ts LABELS). */
export const QUOTE_LABELS: Record<keyof Omit<QuoteWords, "labour">, string> = {
  doing: "What we're doing:", removing: "What we're removing:", included: "What's included:", excluded: "What's not included:",
};
/** The invoice's, the same parts said after the work. */
export const INVOICE_LABELS: Record<keyof Omit<InvoiceWords, "labour">, string> = {
  did: "What we did:", removed: "What we removed:", included: "What was included:",
};

/**
 * The job summary as one block to read and change (Jake, 19 Nov: "the job
 * summary and then the labour line"): each part a paragraph starting with its
 * label, the empty ones left out. words.ts turns it back into ServiceTitan's
 * HTML with the labels in bold.
 */
export function summaryBlock(kind: "estimate" | "invoice", w: QuoteWords | InvoiceWords): string {
  const labels: Record<string, string> = kind === "estimate" ? QUOTE_LABELS : INVOICE_LABELS;
  return Object.entries(labels)
    .map(([k, label]) => [label, ((w as Record<string, string>)[k] ?? "").replace(/\s+/g, " ").trim()] as const)
    .filter(([, t]) => t)
    .map(([label, t]) => `${label} ${t}`)
    .join("\n\n");
}
