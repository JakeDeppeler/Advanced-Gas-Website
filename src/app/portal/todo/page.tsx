import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { TodoView } from "@/components/portal/TodoView";

export const dynamic = "force-dynamic";
export const metadata = { title: "To-do · Team portal" };

/** People's own to-dos. The ones the portal writes are on Account to-dos. */
export default async function TodoPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  return <TodoView user={user} kind="mine" />;
}
