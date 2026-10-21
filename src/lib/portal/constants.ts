/** Shared between the Edge middleware and the Node session helper, so the
 *  middleware never has to import session.ts (which pulls in next/headers). */
export const SESSION_COOKIE = "ag_portal";

/** Set while an admin is previewing the portal as another crew level. */
export const VIEW_AS_COOKIE = "ag_viewas";

/**
 * The address a sign-in code was asked for, between the two steps of the
 * login page. A cookie rather than the URL, so the address isn't left in the
 * browser's history; set whether or not they're on the team, so the page
 * can't be used to find out who is.
 */
export const LOGIN_EMAIL_COOKIE = "ag_login";
