import { redirect } from "next/navigation";
import { LEARNING_TRACKS } from "@/lib/portal/content";

// A page that redirects has to be dynamic. Prerendered, Next answers it with
// a 307 carrying no Location header and the browser sits on a blank page —
// which is what the Information and Learning cards on the home grid were
// doing. Nothing in a typecheck or a build catches it; only a request does.
export const dynamic = "force-dynamic";

export default function LearningIndex() {
  redirect(`/portal/learning/${LEARNING_TRACKS[0].slug}`);
}
