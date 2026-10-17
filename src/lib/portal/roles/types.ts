/**
 * A seat in the business and what's expected of whoever sits in it: the
 * day, what they own and don't, what they're measured on, what the seat
 * requires, and how they move up. Shared by the page and the server.
 */
export type Role = {
  id: string;
  name: string;
  tagline: string;
  reportsTo: string;
  growsInto: string;
  manages: string;
  intro: string;
  day: string[];
  owns: string[];
  notOwns: string[];
  measured: string[];
  requires: string[];
  moveUp: string;
};

/** The lists on a role, in the order they're shown, and what each is called. */
export const ROLE_LISTS: Array<{ k: "day" | "owns" | "notOwns" | "measured" | "requires"; label: string }> = [
  { k: "day", label: "A typical day" },
  { k: "owns", label: "You own this" },
  { k: "notOwns", label: "You don't own this" },
  { k: "measured", label: "Measured on" },
  { k: "requires", label: "What this seat requires" },
];

/** Roles as saved, and who's in each: a person's id to a role's id. */
export type RolesState = { roles: Role[]; assign: Record<string, string> };
