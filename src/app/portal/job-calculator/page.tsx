import { redirect } from "next/navigation";

/**
 * The Job calculator went: jobs are priced in ServiceTitan. An old link or
 * bookmark lands on the crew rates the quotes are priced from.
 */
export default function JobCalculatorPage() {
  redirect("/portal/rates");
}
