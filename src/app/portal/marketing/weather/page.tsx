import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { WeatherTargets } from "@/components/portal/weather/WeatherTargets";
import { loadWeatherReport } from "@/lib/weather-triggers/load";
import "./weather.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Weather targets · Team portal" };

/**
 * Marketing › Weather targets: which suburbs the forecast is about to send us
 * work from, and which campaign each should push. The same report the public
 * endpoint serves the Google Ads Script, so what's on this page is exactly
 * what the ads are acting on. Gated like the rest of Marketing.
 */
export default async function WeatherTargetsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Weather targets" forWhom="managers" />;
  const report = await loadWeatherReport();
  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/marketing" label="Marketing" />
      <WeatherTargets report={report} jsonHref="/api/weather-triggers" csvHref="/api/weather-triggers?format=csv" />
    </PortalShell>
  );
}
