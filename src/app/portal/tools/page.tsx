import { redirect } from "next/navigation";

export const metadata = { title: "Tools — Team portal" };

/**
 * Tools is one page with a tab per tool, and it opens on the fault codes —
 * the one somebody reaches for on site with a unit flashing at them. The
 * Home card lands here.
 */
export default function ToolsPage() {
  redirect("/portal/tools/fault-codes");
}
