import { redirect } from "next/navigation";

// Overheads used to be a calculator of its own, working from its own numbers
// while the capacity tool worked from the crew's. They're one page now, so the
// old link lands on the overheads tab of it.
export default function OverheadPage() {
  redirect("/portal/finance/capacity?t=overheads");
}
