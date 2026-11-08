"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { objectExists, signedUploadUrl } from "@/lib/portal/storage";
import { emailContext } from "@/lib/email/context";
import { fromBox } from "@/lib/email/from";
import { withInlineImages } from "@/lib/email/inline";
import { letterHtml, letterText } from "@/lib/email/premium";
import { sendEmail } from "@/lib/email/send";
import { resolveSigner } from "@/lib/email/templates/signer";
import { addEmailPhoto, addToSeries, deleteTemplate, EMAIL_IMAGES_BUCKET, loadTemplate, resetTemplate, restoreVersion, saveTemplate } from "@/lib/email/templates/store";
import { renderTemplate, sampleValues, SERIES, templateFrom, type QuoteKind } from "@/lib/email/templates/types";
import { answerButtons } from "@/lib/quotes/followUpContent";
import { answerUrl } from "@/lib/quotes/answers";
import { setFollowUps } from "@/lib/quotes/followUps";

export type EmailResult = { ok: boolean; error?: string; said?: string; src?: string };

/** The same people who can change Marketing. */
async function editor() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

const NOPE = { ok: false, error: "Only a manager can change customer emails." };
const done = (key?: string) => {
  revalidatePath("/portal/emails");
  if (key) revalidatePath(`/portal/emails/${key}`);
};

export async function saveEmailTemplate(key: string, t: unknown): Promise<EmailResult> {
  const me = await editor();
  if (!me) return NOPE;
  const r = await saveTemplate(key, t, me.name);
  if (!r.ok) return { ok: false, error: r.error };
  done(key);
  return { ok: true, said: "Saved. It's what goes from now on." };
}

export async function resetEmailTemplate(key: string): Promise<EmailResult> {
  const me = await editor();
  if (!me) return NOPE;
  const r = await resetTemplate(key, me.name);
  if (!r.ok) return { ok: false, error: r.error };
  done(key);
  return { ok: true, said: "Back to the standard wording. Your version is in the history if you want it again." };
}

export async function restoreEmailVersion(key: string, id: string): Promise<EmailResult> {
  const me = await editor();
  if (!me) return NOPE;
  const r = await restoreVersion(key, id, me.name);
  if (!r.ok) return { ok: false, error: r.error };
  done(key);
  return { ok: true, said: "That version is back, and saved." };
}

export async function deleteEmailTemplate(key: string): Promise<EmailResult> {
  const me = await editor();
  if (!me) return NOPE;
  const r = await deleteTemplate(key, me.name);
  if (!r.ok) return { ok: false, error: r.error };
  done();
  redirect("/portal/emails?deleted=1");
}

/** A new email at the end of a series, then straight into it to write. */
export async function addSeriesEmail(form: FormData): Promise<void> {
  const me = await editor();
  const kind = String(form.get("series") ?? "") as QuoteKind;
  if (!me || !SERIES.some((s) => s.k === kind)) redirect("/portal/emails");
  const r = await addToSeries(kind, me.name);
  if (!r.ok || !r.key) redirect(`/portal/emails?error=${encodeURIComponent(r.ok ? "Couldn't add it." : r.error)}`);
  done();
  redirect(`/portal/emails/${r.key}?new=1`);
}

/**
 * The email as it is on screen, saved or not, to the signed-in person's own
 * address with Sarah's made-up details. A follow-up's buttons are the
 * preview quote's, so tapping one sends the owner what a customer's tap would.
 */
export async function sendEmailTest(key: string, raw: unknown): Promise<EmailResult> {
  const me = await editor();
  if (!me) return NOPE;
  if (!me.email) return { ok: false, error: "Your portal login has no email address to send it to." };
  const current = await loadTemplate(key);
  if (!current) return { ok: false, error: "That email couldn't be found." };
  const t = templateFrom(raw, current);
  const ctx = emailContext();
  const e = renderTemplate(t, sampleValues(t.group), {
    base: ctx.base,
    answers: t.group === "followup" ? answerButtons({ yes: answerUrl(0, "yes"), question: answerUrl(0, "question"), no: answerUrl(0, "no") }) : undefined,
  });
  if (!e.subject) return { ok: false, error: "Give it a subject first." };
  const mail = { base: ctx.base, footer: ctx.footer, preheader: e.preheader, blocks: e.blocks, signer: resolveSigner(t.signer, "Jake Deppeler") };
  const out = await sendEmail("other", await withInlineImages({
    from: fromBox("quotes"),
    to: [me.email],
    reply_to: "admin@advancedgas.com.au",
    subject: `[Test] ${e.subject}`,
    html: letterHtml(mail),
    text: letterText(mail),
  }), { template: key, test: true });
  return out.ok ? { ok: true, said: `Sent to ${me.email}, with Sarah's made-up details.` } : { ok: false, error: `It didn't send: ${out.error}` };
}

/* ----------------------------------------------------------------- photos */

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX = 15 * 1024 * 1024;

/** Step one: a one-time link the browser sends the photo straight to (a server action would hit the host's 4.5MB limit). */
export async function startEmailPhotoUpload(input: { type: string; size: number }): Promise<EmailResult & { path?: string; url?: string }> {
  const me = await editor();
  if (!me) return NOPE;
  const ext = EXT[String(input.type)];
  if (!ext) return { ok: false, error: "That isn't a photo we can use. JPG, PNG or WebP." };
  if (!(Number(input.size) > 0) || Number(input.size) > MAX) return { ok: false, error: "Photos can be up to 15MB." };
  const path = `${crypto.randomUUID()}.${ext}`;
  const url = await signedUploadUrl(path, EMAIL_IMAGES_BUCKET);
  return url ? { ok: true, path, url } : { ok: false, error: "Photo storage isn't answering. Try again in a minute." };
}

/** Step two: check it arrived, and keep it in the list of uploaded photos. */
export async function finishEmailPhotoUpload(input: { path: string; label: string }): Promise<EmailResult> {
  const me = await editor();
  if (!me) return NOPE;
  const path = String(input.path ?? "");
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path)) return { ok: false, error: "That upload couldn't be found." };
  if (!(await objectExists(path, EMAIL_IMAGES_BUCKET))) return { ok: false, error: "The photo didn't reach storage. Try it again." };
  await addEmailPhoto(path, String(input.label ?? "").replace(/\.[^.]+$/, "").trim() || "Uploaded photo", me.name).catch(() => undefined);
  return { ok: true, src: `/api/email-image/${path}` };
}

/* ------------------------------------------------------------- the sender */

/** The follow-ups on or off (lib/quotes/followUps.ts › setFollowUps). On leaves every quote already out alone. */
export async function setFollowUpsAction(on: boolean): Promise<EmailResult> {
  const me = await editor();
  if (!me) return NOPE;
  const r = await setFollowUps(on === true, me.name);
  if (!r.ok) return { ok: false, error: r.error };
  done();
  return {
    ok: true,
    said: on
      ? `On. ${r.leftAlone ? `The ${r.leftAlone} quote${r.leftAlone === 1 ? "" : "s"} already out ${r.leftAlone === 1 ? "is" : "are"} left alone; ` : ""}quotes tagged Awaiting Quote Approval from now on get them.`
      : "Off. Nothing more goes; the ones in progress pick up where they were if it's switched back on.",
  };
}
