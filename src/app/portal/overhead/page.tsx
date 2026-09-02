import { redirect } from "next/navigation";

// Overhead moved under Finance.
export default function OverheadRedirect() {
  redirect("/portal/finance/overhead");
}
