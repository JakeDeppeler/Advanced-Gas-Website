import { redirect } from "next/navigation";
import { LEARNING_TRACKS } from "@/lib/portal/content";

export default function LearningIndex() {
  redirect(`/portal/learning/${LEARNING_TRACKS[0].slug}`);
}
