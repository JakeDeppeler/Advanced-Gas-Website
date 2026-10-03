import { redirect } from "next/navigation";

// A page that redirects has to be dynamic. Prerendered, Next answers it with
// a 307 carrying no Location header and the browser sits on a blank page —
// which is what the Information and Learning cards on the home grid were
// doing. Nothing in a typecheck or a build catches it; only a request does.
export const dynamic = "force-dynamic";

// Overheads used to be a calculator of its own, working from its own numbers
// while the capacity tool worked from the crew's. They're one page now, so the
// old link lands on the overheads tab of it.
export default function OverheadPage() {
  redirect("/portal/finance/capacity?t=overheads");
}
