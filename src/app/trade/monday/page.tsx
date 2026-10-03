import { redirect } from "next/navigation";

/** The old Monday van jobs screen is the weekly check now. Kept so a
 *  home-screen shortcut to the old address still lands somewhere. */
export default function MondayMoved() {
  redirect("/trade/van/check");
}
