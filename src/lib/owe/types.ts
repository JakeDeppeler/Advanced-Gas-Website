/** How badly a supplier needs paying when there isn't enough for everyone. */
export type Priority = "must" | "high" | "normal" | "wait";

export const PRIORITIES: Array<{ k: Priority; label: string; blurb: string }> = [
  { k: "must", label: "Must pay", blurb: "We stop if we don't — no stock, no trading" },
  { k: "high", label: "High", blurb: "Pay on time; it hurts if we don't" },
  { k: "normal", label: "Normal", blurb: "Pay by the due date" },
  { k: "wait", label: "Can wait", blurb: "Can be paid late if we have to" },
];
export const PRIORITY_RANK: Record<Priority, number> = { must: 0, high: 1, normal: 2, wait: 3 };
export const isPriority = (v: unknown): v is Priority => typeof v === "string" && v in PRIORITY_RANK;

export type SupplierPriority = { supplier: string; priority: Priority; reason: string | null };

/** One thing owed: a Xero bill, or something added in the portal. */
export type Owed = {
  id: string;
  supplier: string;
  what: string | null;
  due: string;
  amount: number;
  source: "xero" | "portal";
};

/** The key a supplier's priority is kept under: their name, case and spacing aside. */
export const supplierKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
