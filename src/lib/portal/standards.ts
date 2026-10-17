import { isOwner } from "./team";
import type { PortalUser } from "./caps";

/**
 * Who may change How we work: the roles, processes, handbook, learning and
 * information. The owner only, by his own say: these are the business's
 * standards, and an admin capability would hand them to whoever is made an
 * admin next. Not while previewing as somebody else, either, so the preview
 * shows what the crew really gets.
 */
export const canEditStandards = (u: Pick<PortalUser, "email" | "viewingAs">) => isOwner(u.email) && !u.viewingAs;
