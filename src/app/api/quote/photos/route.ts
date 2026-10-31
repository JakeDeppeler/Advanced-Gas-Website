import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";

export const runtime = "nodejs";

/**
 * Photos for a lead the homepage form has already saved.
 *
 * The form saves the enquiry at the details step, so a customer who wanders
 * off at "Add a photo" still reaches the team. Posting the photos back to
 * /api/quote would have sent the team a second full enquiry; this attaches
 * them to the first one and sends one short "photos added" note instead.
 *
 * The lead id is a random UUID that only the browser that created it has
 * seen. On top of that a lead takes photos once, and only in the first few
 * hours, so a leaked id can't be used to keep mailing the office.
 */

type Photo = { name?: string; type?: string; data?: string };
type LeadRow = { id: string; name: string | null; phone: string | null; suburb: string | null; postcode: string | null; headline: string | null; summary: string | null; photo_count: number; created_at: string };

const MAX_PHOTOS = 4;
const MAX_B64 = 3_000_000; // ~2.2 MB a photo; the form shrinks them to well under that
const WINDOW_MS = 6 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: string; photos?: Photo[] } | null;
  const id = body?.id ?? "";
  const photos = (Array.isArray(body?.photos) ? body!.photos : [])
    .filter((p): p is Required<Photo> => typeof p?.data === "string" && p.data.length > 0 && p.data.length <= MAX_B64 && /^image\//.test(p.type ?? ""))
    .slice(0, MAX_PHOTOS);
  if (!UUID.test(id) || !photos.length) return new NextResponse("Bad request", { status: 400 });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new NextResponse("Not configured", { status: 503 });
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  const found = await fetch(
    `${url}/rest/v1/portal_leads?id=eq.${id}&select=id,name,phone,suburb,postcode,headline,summary,photo_count,created_at`,
    { headers, cache: "no-store" },
  ).then((r) => (r.ok ? (r.json() as Promise<LeadRow[]>) : [])).catch(() => [] as LeadRow[]);
  const lead = found[0];
  if (!lead) return new NextResponse("Not found", { status: 404 });
  if (lead.photo_count > 0 || Date.now() - new Date(lead.created_at).getTime() > WINDOW_MS) {
    return new NextResponse("Photos already added", { status: 409 });
  }

  // Claim the lead before emailing, conditional on it still having none, so
  // two quick taps of Send can't both get through.
  const claimed = await fetch(`${url}/rest/v1/portal_leads?id=eq.${id}&photo_count=eq.0`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ photo_count: photos.length }),
  }).then((r) => (r.ok ? (r.json() as Promise<unknown[]>) : [])).catch(() => [] as unknown[]);
  if (!claimed.length) return new NextResponse("Photos already added", { status: 409 });

  const to = (process.env.LEAD_NOTIFICATION_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);
  const recipients = to.length ? to : ["jake@advancedgas.com.au"];
  const who = lead.name || "Website enquiry";
  const where = lead.suburb || lead.postcode || "SE Vic";
  const n = photos.length;
  const text = [
    `${n} photo${n === 1 ? "" : "s"} added to ${who}'s enquiry (${lead.headline ?? "quote"}, ${where}).`,
    lead.summary ? `\n${lead.summary}` : "",
    lead.phone ? `\nPhone: ${lead.phone}` : "",
    `\nThe full enquiry came through in the earlier email.`,
  ].join("");

  const out = await sendEmail("quote-lead", {
    from: process.env.RESEND_FROM_EMAIL || "Advanced Gas Website <onboarding@resend.dev>",
    to: recipients,
    subject: `Photos added, ${who} · ${where}`,
    text,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1d;max-width:560px">
      <p style="margin:0 0 12px"><strong>${n} photo${n === 1 ? "" : "s"}</strong> added to <strong>${esc(who)}</strong>'s enquiry (${esc(lead.headline ?? "quote")}, ${esc(where)}). They're attached.</p>
      ${lead.summary ? `<p style="margin:0 0 12px;color:#4a4a52">${esc(lead.summary)}</p>` : ""}
      ${lead.phone ? `<p style="margin:0 0 12px">Phone: <a href="tel:${esc(lead.phone.replace(/\s/g, ""))}">${esc(lead.phone)}</a></p>` : ""}
      <p style="margin:0;color:#7a7a82;font-size:13px">The full enquiry came through in the earlier email.</p>
    </div>`,
    attachments: photos.map((p, i) => ({ filename: safeName(p.name, i), content: p.data })),
  } as Parameters<typeof sendEmail>[1], { lead: id, photos: n });

  // The photos are only ever in this email. If it failed, give the lead its
  // count back so the customer's retry isn't refused as a duplicate.
  if (!out.ok) {
    await fetch(`${url}/rest/v1/portal_leads?id=eq.${id}`, { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ photo_count: 0 }) }).catch(() => {});
    return new NextResponse("Could not send the photos", { status: 502 });
  }
  return NextResponse.json({ ok: true, photos: n });
}

function safeName(name: string | undefined, i: number) {
  const base = (name || "").replace(/[^\w.-]+/g, "-").slice(0, 60);
  return base || `photo-${i + 1}.jpg`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
