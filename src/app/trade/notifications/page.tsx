import { redirect } from "next/navigation";

/** Notifications live under Messages now, as what the office has sent you. */
export default function NotificationsMoved() {
  redirect("/trade/messages");
}
