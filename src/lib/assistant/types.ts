/**
 * What the website chat's instant-answer mode sends back, and the limits both
 * ends hold to. Kept apart from the knowledge so the widget can import it
 * without shipping the whole site's FAQ set to the browser.
 */

export type AskReply = {
  text: string;
  /** The page the answer came from, when there is one worth opening. */
  link?: { href: string; label: string };
  /**
   * answer: a real answer. unsure: nothing on the site covers it, so the
   * visitor is pointed at the team. emergency: the gas safety lines, shown
   * with the phone number first.
   */
  kind: "answer" | "unsure" | "emergency";
  /** The site's own question the answer was matched to, in the no-model mode. */
  about?: string;
  /** Who wrote it: Claude from the site's content, or the site's own FAQ text. Never a person. */
  by: "ai" | "site";
};

export type AskTurn = { q: string; a: string };

export const ASK_LIMITS = {
  /** Characters in one question. A real question is a sentence or two. */
  question: 500,
  /** Earlier turns sent back for context, and the characters kept of each half. */
  turns: 6,
  turnChars: 600,
  /** Raw request body, checked before it is parsed. */
  body: 8000,
} as const;

/**
 * Whether instant answers are on for this deployment.
 *
 * Preview and local builds only until Jake signs it off. VERCEL_ENV is
 * "production" only on the live site's build, so the redesign's preview
 * deployments (and `next dev`, where it is unset) get it and the public site
 * doesn't. The layout reads this at build time and the /api/chat/ask route
 * checks it again, so the route is not reachable on production just because
 * somebody found its URL. To go live, return true here (or delete the check).
 */
export const assistantEnabled = () => process.env.VERCEL_ENV !== "production";
