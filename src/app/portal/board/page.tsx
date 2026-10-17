import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** "What it shows" was taken off the portal; its address goes to the remote. */
export default function BoardIndex() {
  redirect("/portal/board/remote");
}
