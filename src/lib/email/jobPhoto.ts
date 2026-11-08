import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { stFetch, stTenantPath } from "@/lib/dashboard/servicetitan";
import { aiConfigured } from "@/lib/chat/draft";
import { site } from "@/lib/site";

/**
 * A photo the tech took on the job, for the top of the customer's email
 * (Jake, 8 Nov: "should we use a photo they take on site?"). Their own new
 * system on their own wall beats any stock shot.
 *
 * It has to show the whole system (Jake, 8 Nov: "it should always show a
 * photo of the full system"), and the newest photo is as often a nameplate,
 * a pipe joint or the old unit. So Claude looks at the job's latest few and
 * picks the one showing the finished system whole, or none, in which case
 * the email uses the stock photo of that kind of system, which always is.
 * Phone photos are several megabytes, so it's shrunk to 1200px by Next's own
 * image optimiser (no new dependency) via /api/email-photo, then attached to
 * the email by inline.ts. That route only serves an attachment id signed
 * here, so nobody can walk through job photos by guessing numbers, and the
 * URL never goes in an email: the picture is inside it.
 */

const PHOTO = /\.(jpe?g|png)$/i;

const secret = () => process.env.PORTAL_AUTH_SECRET ?? "";

export function photoSig(id: number): string {
  return createHmac("sha256", secret()).update(`email-photo:${id}`).digest("hex").slice(0, 32);
}

export function photoSigOk(id: number, sig: string): boolean {
  if (!secret() || !/^[0-9a-f]{32}$/.test(sig)) return false;
  return timingSafeEqual(Buffer.from(photoSig(id)), Buffer.from(sig));
}

type Raw = { id?: number; fileName?: string | null; originalFileName?: string | null; name?: string | null; createdOn?: string | null; active?: boolean };

const optimised = (id: number, w: number) =>
  `${site.url.replace(/\/$/, "")}/_next/image?url=${encodeURIComponent(`/api/email-photo/${id}?s=${photoSig(id)}`)}&w=${w}&q=${w > 800 ? 72 : 60}`;

/** How many of the newest photos Claude looks at: enough to find the finished one, few enough to stay quick. */
const LOOK_AT = 6;

const PICK_SCHEMA = {
  type: "object",
  properties: {
    pick: { type: ["integer", "null"], description: "The number of the photo to use, or null if none qualifies." },
    why: { type: "string" },
  },
  required: ["pick", "why"],
  additionalProperties: false,
} as const;

const PICK_RULES = `You choose the photo for the top of a thank-you email to a household customer, from photos a heating and cooling technician took on their job.

Pick the photo that best shows the COMPLETE, FINISHED system that was installed or serviced: the whole indoor unit on the wall, the whole outdoor unit, or the whole hot water tank and heat pump, in frame, square on or at a pleasant angle, tidy.

Never pick: a close-up of part of a unit, a nameplate, data plate or label, a pipe joint, wiring, a switchboard or meter, the old unit being removed, rubbish, a screen or paperwork, a photo with a person's face, or anything blurry, dark or sideways. If none of the photos shows the whole finished system clearly, answer null. A stock photo is used then, so null is always better than a poor pick.`;

let client: Anthropic | null = null;
const api = () => (client ??= new Anthropic());

async function smallJpeg(id: number): Promise<string | null> {
  try {
    const res = await fetch(optimised(id, 640), { headers: { Accept: "image/jpeg,image/png" }, cache: "no-store" });
    if (!res.ok || !/^image\/jpeg/.test(res.headers.get("content-type") ?? "")) return null;
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch {
    return null;
  }
}

/**
 * The optimised URL of the job photo showing the whole system, or null (none
 * qualifies, no photos, no access, no secret, Claude unavailable).
 */
export async function jobSitePhoto(jobId: number, jobType?: string | null): Promise<string | null> {
  if (!secret() || !aiConfigured()) return null;
  let ids: number[];
  try {
    const r = await stFetch<{ data?: Raw[] }>(stTenantPath("forms", `jobs/${jobId}/attachments`), { page: "1", pageSize: "100" });
    ids = (r.data ?? [])
      .filter((a) => typeof a.id === "number" && a.active !== false && PHOTO.test(a.fileName || a.originalFileName || a.name || ""))
      .sort((a, b) => (b.createdOn ?? "").localeCompare(a.createdOn ?? ""))
      .slice(0, LOOK_AT)
      .map((a) => a.id!);
  } catch {
    return null;
  }
  if (!ids.length) return null;
  const small = await Promise.all(ids.map(smallJpeg));
  const shown = ids.map((id, n) => ({ id, data: small[n] })).filter((x): x is { id: number; data: string } => !!x.data);
  if (!shown.length) return null;

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  shown.forEach((x, n) => {
    content.push({ type: "text", text: `Photo ${n + 1}` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: x.data } });
  });
  content.push({ type: "text", text: `The job: ${jobType ?? "heating and cooling work"}. Which photo shows the whole finished system?` });
  try {
    const res = await api().beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 300,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: PICK_SCHEMA as unknown as Record<string, unknown> } },
      system: [{ type: "text", text: PICK_RULES, cache_control: { type: "ephemeral", ttl: "1h" } }],
      messages: [{ role: "user", content }],
    });
    if (res.stop_reason === "refusal") return null;
    const out = JSON.parse(res.content.map((b) => (b.type === "text" ? b.text : "")).join("")) as { pick: number | null };
    const chosen = typeof out.pick === "number" ? shown[out.pick - 1] : undefined;
    return chosen ? optimised(chosen.id, 1200) : null;
  } catch {
    return null;
  }
}
