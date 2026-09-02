import { redirect } from "next/navigation";
import { INFO_SECTIONS } from "@/lib/portal/content";

export default function InformationIndex() {
  redirect(`/portal/information/${INFO_SECTIONS[0].slug}`);
}
