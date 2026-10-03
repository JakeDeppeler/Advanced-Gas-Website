"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import {
  createCampaign, updateCampaign, deleteCampaign,
  createBrandAsset, deleteBrandAsset,
} from "@/lib/portal/db";
import { uploadPhoto, deletePhoto } from "@/lib/portal/storage";

export type MarketingResult = { ok: boolean; error?: string };

/** Marketing is behind the same capability the page is. */
async function requireMarketing() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

export async function addCampaign(input: {
  name: string; blurb: string; channel: string; audience: string; status: string;
  monthlySpend: string; owner: string; utmCampaign: string;
}): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can change campaigns." };
  if (!input.name.trim()) return { ok: false, error: "Give it a name." };

  // Blank means we don't record a spend for it, which is not the same as $0 —
  // a campaign costing nothing and a campaign we haven't costed read very
  // differently next to a cost-per-lead.
  const spend = input.monthlySpend.trim() === "" ? null : Number(input.monthlySpend.replace(/[^0-9.]/g, ""));
  if (spend !== null && !Number.isFinite(spend)) return { ok: false, error: "The spend has to be a number." };

  const res = await createCampaign({
    name: input.name.trim(), blurb: input.blurb.trim(), channel: input.channel.trim(),
    audience: input.audience, status: input.status, monthlySpend: spend,
    owner: input.owner.trim() || me.name, utmCampaign: input.utmCampaign.trim(),
  });
  if (!res.ok) return { ok: false, error: res.error === "not-configured" ? "The database isn't connected." : "Couldn't save it." };
  revalidatePath("/portal/marketing");
  return { ok: true };
}

export async function setCampaignStatus(input: { id: string; status: string }): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can change campaigns." };
  const res = await updateCampaign(input.id, { status: input.status });
  if (!res.ok) return { ok: false, error: "Couldn't change it." };
  revalidatePath("/portal/marketing");
  return { ok: true };
}

export async function removeCampaign(input: { id: string }): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can remove a campaign." };
  const res = await deleteCampaign(input.id);
  if (!res.ok) return { ok: false, error: "Couldn't remove it." };
  revalidatePath("/portal/marketing");
  return { ok: true };
}

/** A brand asset: the logo pack, the van wrap, a finished-job photo. */
export async function uploadBrandAsset(form: FormData): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can add brand assets." };

  const label = String(form.get("label") || "").trim();
  const kind = String(form.get("kind") || "other");
  const file = form.get("file");
  if (!label) return { ok: false, error: "Give it a name." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pick a file." };
  if (file.size > 25 * 1024 * 1024) return { ok: false, error: "That file is over 25MB." };

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `brand/${crypto.randomUUID()}.${ext}`;
  const up = await uploadPhoto(path, await file.arrayBuffer(), file.type || "application/octet-stream");
  if (!up.ok) return { ok: false, error: up.error === "not-configured" ? "File storage isn't set up." : "Couldn't upload it." };

  const row = await createBrandAsset({
    label, kind, path, mime: file.type || null, bytes: file.size, addedBy: me.name,
  });
  if (!row.ok) {
    // Don't leave the file orphaned in the bucket if the row didn't land.
    await deletePhoto(path);
    return { ok: false, error: "Couldn't save it." };
  }
  revalidatePath("/portal/marketing");
  return { ok: true };
}

export async function removeBrandAsset(input: { id: string; path: string }): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can remove a brand asset." };
  await deletePhoto(input.path);
  const res = await deleteBrandAsset(input.id);
  if (!res.ok) return { ok: false, error: "Couldn't remove it." };
  revalidatePath("/portal/marketing");
  return { ok: true };
}
