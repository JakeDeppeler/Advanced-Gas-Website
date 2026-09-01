import { redirect } from "next/navigation";

// Reports grew into per-person team files.
export default function ReportsRedirect() {
  redirect("/portal/team");
}
