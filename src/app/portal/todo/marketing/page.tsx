import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { TodoView } from "@/components/portal/TodoView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketing to-dos · Team portal" };

/** Google Ads, Facebook, and the rest (sign wraps, flyers): marketing's own lists, apart from people's and the accounts'. */
export default async function MarketingTodosPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  return <TodoView user={user} kind="marketing" />;
}
