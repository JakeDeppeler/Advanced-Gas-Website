import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { TodoView } from "@/components/portal/TodoView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account to-dos · Team portal" };

/** Quote follow-ups, invoices to send, late payments, jobs to book: the office's customer work. */
export default async function AccountTodosPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead") && !can(user, "manage_users")) redirect("/portal/todo");
  return <TodoView user={user} kind="accounts" />;
}
