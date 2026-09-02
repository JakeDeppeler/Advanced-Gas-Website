/** Shared between the Edge middleware and the Node session helper, so the
 *  middleware never has to import session.ts (which pulls in next/headers). */
export const SESSION_COOKIE = "ag_portal";
