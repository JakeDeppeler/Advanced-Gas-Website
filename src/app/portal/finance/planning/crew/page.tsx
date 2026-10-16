import { redirect } from "next/navigation";

/**
 * Crew & rate priced the crew its own way, so its hour disagreed with every
 * other page. Its questions — another person, fewer vans — are What if's other
 * tabs now, on the same hour.
 */
export default function CrewPlanningPage() {
  redirect("/portal/finance/planning");
}
