import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import type { EmailKind } from "@/lib/email/eventTypes";
import { keepPhotos } from "@/lib/portal/leadPhotos";
import { placeFromAddress } from "@/lib/portal/leadPlace";
import { customerEmail, friendlySummary, headline, photoAttachments, teamEmail, type Lead, type LeadPhoto, type MailAttachment } from "@/lib/email/leadEmails";

export const runtime = "nodejs";

/* ------------ POST handler ------------ */

export async function POST(req: Request) {
  const data = (await req.json()) as Lead;

  if (data.hp && data.hp.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  if (!data.name || !data.phone || !data.service) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  // Recipients, support comma-separated list, fall back to Jake so leads
  // aren't lost if LEAD_NOTIFICATION_EMAIL isn't set on Vercel.
  const envRecipients = (process.env.LEAD_NOTIFICATION_EMAIL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const to = envRecipients.length ? envRecipients : ["jake@advancedgas.com.au"];
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Advanced Gas Website <onboarding@resend.dev>";
  const replyTo = data.email || undefined;

  // Merge new + legacy photo shape into a single array.
  const allPhotos: LeadPhoto[] = [
    ...(Array.isArray(data.photos) ? data.photos : []),
    ...(data.photo ? [data.photo] : []),
  ];
  const { attachments, cids: photoIds } = photoAttachments(allPhotos);

  // Typed by hand rather than picked from the suggestions, the address comes
  // with no suburb or postcode, and the team email's header read "SE Vic".
  if (!data.suburb || !data.postcode) {
    const found = placeFromAddress(data.address);
    data.suburb = data.suburb || found.suburb || undefined;
    data.postcode = data.postcode || found.postcode || undefined;
  }

  const summaryLine = friendlySummary(data);

  // Everything below can fail, so the lead goes to the database first.
  // Email is a notification; this is the record.
  const leadId = await storeLead(data, summaryLine, allPhotos.length, data.pagePath, data.utm);
  const stored = leadId != null;
  const id = leadId ?? undefined;
  // Kept so they can go onto the customer's job once it's linked on Website
  // leads. Before this they only went out as email attachments.
  if (leadId) await keepPhotos(leadId, allPhotos).catch((e) => console.error("Keeping the form's photos failed", e));

  if (!key) {
    // This used to return ok:true. On a deployment with no key that
    // meant every enquiry drew a "thanks, we've got it" for the
    // customer and a console line nobody reads for us. If the lead
    // didn't reach the database either, the honest answer is failure.
    console.error("RESEND_API_KEY missing.");
    console.log("NEW LEAD →\n" + teamEmail(data, { summary: summaryLine, photoCount: allPhotos.length, stored }).text);
    return stored
      ? NextResponse.json({ ok: true, stored: true, emailed: false, id })
      : new NextResponse("Could not record the enquiry", { status: 502 });
  }

  // 1) The team's email. It says so when the lead isn't in the database, since then it's the only copy.
  const team = teamEmail(data, { summary: summaryLine, photoCount: allPhotos.length, photoIds, stored });
  const emailed = await sendResend({
    key,
    from,
    to,
    replyTo,
    subject: team.subject,
    html: team.html,
    text: team.text,
    attachments,
  });

  // Only a total loss is a failure: if the row is in the database the
  // lead is safe even when the mail server is having a day.
  if (!emailed && !stored) {
    return new NextResponse("Could not record the enquiry", { status: 502 });
  }

  // 2) Customer confirmation email (only if we got a valid-looking email).
  if (data.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    const cust = customerEmail(data, summaryLine);
    await sendResend({
      key,
      from,
      to: [data.email],
      replyTo: to[0],
      subject: cust.subject,
      html: cust.html,
      text: cust.text,
    });
  }

  return NextResponse.json({ ok: true, stored, emailed, id });
}

/* ------------ Durable record ------------ */

/**
 * Write the lead to Supabase before anything is emailed.
 *
 * Email delivery is the part most likely to break — a missing key, a
 * suspended domain, a bounce — and until now it was the only place a
 * lead existed. Returns false when the row didn't land, which is what
 * lets the route tell the customer the truth.
 *
 * A no-op when the env vars aren't set, so local and preview builds
 * don't need a database to run the form. See
 * supabase/migrations/0019_portal_leads_capture.sql for the table.
 */
async function storeLead(data: Lead, summary: string, photoCount: number, pagePath?: string, utm?: Record<string, string>): Promise<string | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("Supabase not configured, lead not stored.");
    return null;
  }
  try {
    // The row's id comes back so the photos can be filed under it.
    const res = await fetch(`${url}/rest/v1/portal_leads?select=id`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        // The row's id goes back to the homepage form, which attaches photos
        // to this lead in a second request rather than sending a second lead.
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        kind: "quote",
        // Which page produced it, and what brought them there. Without these two
        // there is no way to tell which of seventy-odd pages actually earns
        // anything, which was the whole point of recording leads at all.
        page_path: pagePath || null,
        utm: utm ?? {},
        service: data.service,
        headline: headline(data),
        summary,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        postcode: data.postcode || data.suburb || null,
        suburb: data.suburb || null,
        timing: data.timing || null,
        property_type: data.propertyType || null,
        address: data.address || null,
        notes: data.notes || null,
        photo_count: photoCount,
        details: data.details ?? {},
      }),
    });
    if (!res.ok) {
      console.error(`Supabase insert failed (${res.status}): ${await res.text().catch(() => "")}`);
      return null;
    }
    const rows = (await res.json().catch(() => [])) as { id?: string }[];
    return rows[0]?.id ?? null;
  } catch (e) {
    console.error("Supabase insert threw", e);
    return null;
  }
}

/* ------------ Resend helper ------------ */

async function sendResend(opts: {
  key: string; from: string; to: string[]; replyTo?: string;
  subject: string; html: string; text: string;
  attachments?: MailAttachment[];
  /** What this one is, for the record a failure leaves. Defaults to the lead email. */
  kind?: EmailKind;
  about?: Record<string, unknown>;
}): Promise<boolean> {
  const body: Record<string, unknown> = {
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  };
  if (opts.replyTo) body.reply_to = opts.replyTo;
  if (opts.attachments?.length) body.attachments = opts.attachments;

  /*
   * Through the shared sender, which writes the row the wall board reads. The
   * failure used to go to console.error and nowhere else: the customer was
   * told their enquiry was in, the office waited for an email that Resend had
   * refused, and nothing anywhere said so.
   *
   * `opts.key` is still taken and still ignored — the caller checks for it
   * before composing anything, and sendEmail reads it itself.
   */
  const out = await sendEmail(opts.kind ?? "quote-lead", body as Parameters<typeof sendEmail>[1], opts.about ?? {});
  if (!out.ok) console.error(`Resend send failed to ${opts.to.join(", ")}: ${out.error}`);
  return out.ok;
}
