import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Records a phone tap as a lead.
 *
 * Kept separate from the quote route because it carries nothing personal — the
 * page, where on it, and what brought them. A tap is not an enquiry we can ring
 * back; it is evidence that a page made someone pick up the phone, and until
 * now nothing counted them at all.
 */
export async function POST(req: Request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: true });

  try {
    const body = (await req.json()) as { kind?: string; pagePath?: string; where?: string; utm?: Record<string, string> };
    if (body.kind !== "call") return NextResponse.json({ ok: true });

    await fetch(`${url}/rest/v1/portal_leads`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        kind: "call",
        page_path: (body.pagePath || "").slice(0, 200) || null,
        source: (body.where || "").slice(0, 60) || null,
        utm: body.utm ?? {},
      }),
    });
  } catch (e) {
    // Never surface this. A missed tally is not worth an error on a page.
    console.error("track POST failed", e);
  }
  return NextResponse.json({ ok: true });
}
