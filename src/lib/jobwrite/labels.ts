// The shape of a write-up, kept apart from words.ts so the page's browser
// code can use it without Node's crypto coming along.
//
// Jake, 19 Nov: the summary is written as paragraphs in the style of two of
// his own (an evap repair on a 24-year-old cooler, and a five-head Rinnai
// replacing an evap and a wall furnace), not in the four labelled parts the
// quote templates use. So each document's summary is one block of text, with
// its paragraphs and any headings ("Installation Details:", "Important Note –
// Existing System Condition") as written.

export type DocWords = {
  /** Paragraphs, a blank line between, headings on lines of their own. */
  summary: string;
  /** The one paragraph on the labour line that carries the one price. */
  labour: string;
};
export type QuoteWords = DocWords;
export type InvoiceWords = DocWords;
export type JobWords = { quote: DocWords; invoice: DocWords };

/** The labels the quote templates' summaries start their paragraphs with, kept bold when one is put back. */
export const TEMPLATE_LABELS = [
  "What we're doing:", "What we're removing:", "What's included:", "What's not included:",
  "What we did:", "What we removed:", "What was included:",
] as const;
