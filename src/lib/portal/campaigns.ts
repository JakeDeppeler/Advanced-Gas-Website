/**
 * Everything marketing is running — the one screen in the portal that is a
 * list the office keeps rather than a report the portal derives.
 *
 * A campaign's lead count is not typed in. It comes from matching
 * `utm_campaign` against the utm on each website lead, so the number beside a
 * campaign is the number the website actually produced for it. A campaign with
 * no utm set shows a dash: it is running, we just can't attribute to it.
 */

import type { WebLead } from "./db";

export type CampaignStatus = "draft" | "running" | "in-progress" | "always-on" | "paused" | "finished";
export type Audience = "homeowners" | "real-estate" | "retirement" | "hiring" | "everyone";

export const STATUSES: { k: CampaignStatus; label: string; tone: "live" | "work" | "idle" }[] = [
  { k: "running", label: "Running", tone: "live" },
  { k: "always-on", label: "Always on", tone: "live" },
  { k: "in-progress", label: "In progress", tone: "work" },
  { k: "draft", label: "Draft", tone: "idle" },
  { k: "paused", label: "Paused", tone: "idle" },
  { k: "finished", label: "Finished", tone: "idle" },
];

export const AUDIENCES: { k: Audience; label: string }[] = [
  { k: "homeowners", label: "Homeowners" },
  { k: "real-estate", label: "Real estate" },
  { k: "retirement", label: "Retirement villages" },
  { k: "hiring", label: "Hiring" },
  { k: "everyone", label: "Everyone" },
];

export const statusLabel = (k: string) => STATUSES.find((s) => s.k === k)?.label ?? k;
export const statusTone = (k: string) => STATUSES.find((s) => s.k === k)?.tone ?? "idle";
export const audienceLabel = (k: string) => AUDIENCES.find((a) => a.k === k)?.label ?? k;

/** The two states that mean money is going out and work is coming in. */
export const isLive = (s: string) => s === "running" || s === "always-on";

export type Campaign = {
  id: string;
  name: string;
  blurb: string | null;
  channel: string | null;
  audience: Audience;
  status: CampaignStatus;
  monthlySpend: number | null;
  owner: string | null;
  utmCampaign: string | null;
  sortOrder: number | null;
};

export type CampaignRow = Campaign & {
  /** Leads the website attributed to it, or null when it carries no utm. */
  leads: number | null;
};

/**
 * Attach each campaign's lead count.
 *
 * Matched case-insensitively on utm_campaign, because what gets typed into an
 * ad platform and what gets typed into this form will differ in case sooner or
 * later and nobody will think to check.
 */
export function withLeads(campaigns: Campaign[], leads: WebLead[]): CampaignRow[] {
  const byCampaign = new Map<string, number>();
  for (const l of leads) {
    const c = (l.utm?.utm_campaign ?? l.utm?.campaign ?? "").trim().toLowerCase();
    if (c) byCampaign.set(c, (byCampaign.get(c) ?? 0) + 1);
  }
  return campaigns.map((c) => ({
    ...c,
    leads: c.utmCampaign ? byCampaign.get(c.utmCampaign.trim().toLowerCase()) ?? 0 : null,
  }));
}

export type CampaignTally = {
  live: number;
  /** Null when no campaign records a spend — zero would claim they are free. */
  spend: number | null;
  /** Leads the site produced in the window, attributed or not. */
  leads: number;
  /** Spend over attributed leads. Null unless both sides are known. */
  costPerLead: number | null;
  /** How many of the window's leads no campaign claims. */
  unattributed: number;
};

export function tally(rows: CampaignRow[], totalLeads: number): CampaignTally {
  const live = rows.filter((r) => isLive(r.status)).length;
  const spends = rows.filter((r) => isLive(r.status) && r.monthlySpend != null);
  const spend = spends.length ? spends.reduce((a, r) => a + (r.monthlySpend as number), 0) : null;
  const attributed = rows.reduce((a, r) => a + (r.leads ?? 0), 0);
  return {
    live,
    spend,
    leads: totalLeads,
    // Against attributed leads only: dividing spend by every lead the site
    // produced would credit the ads with the organic ones and read far cheaper
    // than it is.
    costPerLead: spend != null && attributed > 0 ? spend / attributed : null,
    unattributed: Math.max(0, totalLeads - attributed),
  };
}

/** The audience pills, with how many campaigns sit under each. */
export function byAudience(rows: CampaignRow[]): { k: Audience | "all"; label: string; n: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.audience, (counts.get(r.audience) ?? 0) + 1);
  return [
    { k: "all" as const, label: "All", n: rows.length },
    ...AUDIENCES.filter((a) => counts.get(a.k)).map((a) => ({ k: a.k, label: a.label, n: counts.get(a.k) ?? 0 })),
  ];
}
