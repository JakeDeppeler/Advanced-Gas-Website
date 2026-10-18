import { redirect } from "next/navigation";

/** Year so far is Pace › Year now. */
export default function YearSoFarPage() {
  redirect("/portal/pace?view=year");
}
