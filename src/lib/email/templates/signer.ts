import { headshot, SIGNERS } from "@/lib/email/team";
import type { SignerChoice } from "./types";

/**
 * Who signs an email. "Whoever quoted it" is the person ServiceTitan says
 * wrote the quote, with their photo when we have a headshot and their
 * initials when we don't: a follow-up from the person who came out reads as
 * one, which is the point of it. With nobody to name, the team signs.
 */
export function resolveSigner(choice: SignerChoice, quoterName: string | null): { name: string; role: string; photo: string | null } {
  if (choice !== "quoter") return SIGNERS[choice];
  const name = quoterName?.trim() || "";
  if (!name) return SIGNERS.team;
  const known = Object.values(SIGNERS).find((s) => s.name.toLowerCase() === name.toLowerCase());
  return known ?? { name, role: SIGNERS.jake.role, photo: headshot(name) };
}
