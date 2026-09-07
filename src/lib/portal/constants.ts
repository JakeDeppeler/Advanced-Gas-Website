/** Shared between the Edge middleware and the Node session helper, so the
 *  middleware never has to import session.ts (which pulls in next/headers). */
export const SESSION_COOKIE = "ag_portal";

/** Set while an admin is previewing the portal as another crew level. */
export const VIEW_AS_COOKIE = "ag_viewas";
