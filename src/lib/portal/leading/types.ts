/**
 * How we work › Leading: who decides what without an owner, and the record
 * that grows it. Shared by the page and the server.
 */

/** A leadership seat's calls, in three bands, and what it can spend alone. */
export type Seat = {
  /** The role on Roles this is for, so the page can show who's in it. */
  roleId: string;
  name: string;
  /** Make the call. Nobody needs to hear about it. */
  decide: string[];
  /** Make the call, then log it so it's seen at the weekly review. */
  tell: string[];
  /** Bring it to an owner, with a recommendation. */
  ask: string[];
  /** Dollars this seat can commit on its own, per call. Null: not set, so any spend is asked first. */
  spend: number | null;
};

/** One rung of how a call moves from an owner's to a leader's. */
export type Rung = { name: string; means: string };

export type Leading = {
  /** Draft until the owner publishes it: these are the business's rules, not a suggestion. */
  published: boolean;
  intro: string;
  seats: Seat[];
  /** How to bring a call that's above your band. */
  method: string[];
  ladder: Rung[];
  /** How a call moves up the ladder. */
  moveUp: string;
};

export type Band = "decide" | "tell" | "ask";

/** A call someone made, and what the owner thought of it. */
export type Decision = {
  id: string;
  at: string;
  by: string;
  byEmail: string;
  seat: string | null;
  what: string;
  why: string;
  cost: number | null;
  band: Band;
  review: { good: boolean; note: string; by: string; at: string } | null;
};

export const BANDS: Array<{ k: Band; label: string; line: string }> = [
  { k: "decide", label: "Decide it", line: "Your call. Make it and get on." },
  { k: "tell", label: "Decide, then log it", line: "Your call, written down so it's seen at the weekly review." },
  { k: "ask", label: "Bring it to us", line: "Not yet yours. Bring a recommendation, not a question." },
];
