/** Where an address on the email list came from. */
export type EmailSource = "servicetitan" | "website" | "xero" | "keepintouch";

export const SOURCE_LABEL: Record<EmailSource, string> = {
  servicetitan: "ServiceTitan customer",
  website: "Website enquiry",
  xero: "Xero contact",
  keepintouch: "Keep in touch",
};

export const SOURCE_PLURAL: Record<EmailSource, string> = {
  servicetitan: "ServiceTitan customers",
  website: "Website enquiries",
  xero: "Xero contacts",
  keepintouch: "Keep in touch",
};

export type EmailRow = {
  email: string;
  name: string | null;
  sources: EmailSource[];
  suburb: string | null;
  /** The last job ServiceTitan has for them, as a date. */
  lastJob: string | null;
  /** The most recent date anything we hold for them changed. */
  lastSeen: string | null;
  /** Xero says they're a supplier and nothing says they're a customer. */
  supplierOnly: boolean;
  optedOut: boolean;
};

export type SourceState = { source: EmailSource; count: number; note: string | null };

const RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[a-z]{2,}$/i;
/** Lower-cased and trimmed, or null when it isn't an address anyone could send to. */
export function cleanEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  return RE.test(e) && e.length <= 320 ? e : null;
}
