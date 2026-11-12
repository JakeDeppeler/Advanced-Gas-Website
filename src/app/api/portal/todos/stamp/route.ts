import { NextResponse } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { todosStamp } from "@/lib/todos/store";

export const dynamic = "force-dynamic";

/** The to-do board's fingerprint, for LiveTodos to compare. Signed-in only; says nothing about what's on it. */
export async function GET() {
  const me = await getPortalUser();
  if (!me) return new NextResponse("Not found", { status: 404 });
  const stamp = await todosStamp().catch(() => null);
  return NextResponse.json({ stamp }, { headers: { "Cache-Control": "no-store" } });
}
