import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { TodoView } from "@/components/portal/TodoView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketing to-dos · Team portal" };

/** Posts, ads, the website, reviews: marketing's own list, apart from people's and the accounts'. */
export default async function MarketingTodosPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  return <TodoView user={user} kind="marketing" />;
}
